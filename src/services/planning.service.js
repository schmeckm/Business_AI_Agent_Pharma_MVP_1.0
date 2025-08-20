import fs from "fs";
import path from "path";
import { readOrders, readLots, readStock } from "./data.service.js";
import { estimateQaMinutes, plannedStartTs } from "./qaHistory.service.js";
import { eventBus, EVENTS } from "../eventBus.js";
import { publish } from "../mqtt.js";
import { checkATP, checkRMSL, checkTRIC } from "../utils/helpers.js";
import { config } from "../config.js";
import { runBpmnExecution, bpmnExists } from "./rules.service.js";

const LAST_RUN_FILE = path.join(process.cwd(), "data", "lastRun.json");

// ---------- LastRun speichern ----------
export function saveLastRun(results) {
  try {
    fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(results, null, 2), "utf-8");
    console.log("[PLANNER] LastRun gespeichert:", LAST_RUN_FILE);
  } catch (e) {
    console.error("[PLANNER] Fehler beim Speichern von lastRun:", e);
  }
}

// ---------- LastRun lesen ----------
export function readLastRun() {
  try {
    if (!fs.existsSync(LAST_RUN_FILE)) return [];
    return JSON.parse(fs.readFileSync(LAST_RUN_FILE, "utf-8"));
  } catch (e) {
    console.error("[PLANNER] Fehler beim Lesen von lastRun:", e);
    return [];
  }
}

// ---------- LastRun löschen ----------
export function clearLastRun() {
  try {
    if (fs.existsSync(LAST_RUN_FILE)) {
      fs.unlinkSync(LAST_RUN_FILE);
      console.log("[PLANNER] LastRun gelöscht");
    }
  } catch (e) {
    console.error("[PLANNER] Fehler beim Löschen von lastRun:", e);
  }
}

// ---------- Hauptfunktion ----------
export async function runPlanning({ filterCountry, onlyOrderId } = {}) {
  const orders = readOrders();
  const lots   = readLots();
  const stock  = readStock();

  let pool = orders;
  if (filterCountry) pool = pool.filter(o => String(o.country).toUpperCase() === String(filterCountry).toUpperCase());
  if (onlyOrderId)   pool = pool.filter(o => String(o.id).toUpperCase() === String(onlyOrderId).toUpperCase());

  publish("plan/started", { total: pool.length });
  eventBus.emit(EVENTS.PLAN_DAY_STARTED, { total: pool.length });

  const results = [];
  for (const o of pool) {
    const ctx = { orderId: o.id, fg: o.fg, country: o.country };
    const lot = lots.find(l => l.material === o.bulkMaterial);

    // --- BPMN-Modus ---
    if (config.workflowMode === "bpmn" && bpmnExists()) {
      try {
        await runBpmnExecution(o, lot);
        results.push({ ...ctx, status: "bpmn" });
        continue;
      } catch (e) {
        publish(`order/${o.id}/blocked`, { ...ctx, reasons: ["BPMN error", String(e.message||e)] });
        eventBus.emit(EVENTS.ORDER_BLOCKED, { ...ctx, reasons: ["BPMN error"] });
      }
    }

    // --- Builtin QA-first ---
    let ok = true; 
    const reasons = [];

    if (!lot) { 
      ok = false; 
      reasons.push("No bulk lot found"); 
    } else {
      if (!checkTRIC(lot, o.country)) reasons.push("TRIC not allowed for country");
      if (!checkATP(o.qtyRequired, stock[o.bulkMaterial] ?? 0)) reasons.push("ATP shortage on bulk");
      if (!checkRMSL(lot.rmsl ?? 0, o.country)) reasons.push("RMSL below threshold");
      if (reasons.length) ok = false;
    }

    if (!ok) {
      publish(`order/${o.id}/blocked`, { ...ctx, reasons });
      eventBus.emit(EVENTS.ORDER_BLOCKED, { ...ctx, reasons });

      if (lot) {
        publish("notify/qa", { action:"QA_PRIO_REQUESTED", details:{...ctx, reasons} });
        eventBus.emit(EVENTS.QA_REQUEST, { ...ctx, reasons });

        const est = await estimateQaMinutes(o.bulkMaterial);
        const mins = Math.max(0, Math.round((plannedStartTs(o) - Date.now())/60000));
        eventBus.emit(EVENTS.QA_ESTIMATE, { ...ctx, material: o.bulkMaterial, estMinutes: est, windowMinutes: mins });

        if (est <= mins) {
          publish(`order/${o.id}/released`, { ...ctx, note: "QA priorisiert & rechtzeitig freigegeben" });
          eventBus.emit(EVENTS.ORDER_OK, { ...ctx, note: "QA priorisiert & rechtzeitig freigegeben" });
          results.push({ ...ctx, status: "released", note: "QA-prioritized" });
        } else {
          const note = `QA benötigt ~${est} Min, Start in ${mins} Min -> Auftrag verschoben`;
          publish(`order/${o.id}/rescheduled`, { ...ctx, note });
          eventBus.emit(EVENTS.ORDER_RESCHEDULED, { ...ctx, note });
          results.push({ ...ctx, status: "rescheduled", reasons: [...reasons, "Time window too short"] });
        }
      } else {
        const note = "QA-Freigabe nicht möglich -> Auftrag verschoben";
        publish(`order/${o.id}/rescheduled`, { ...ctx, note });
        eventBus.emit(EVENTS.ORDER_RESCHEDULED, { ...ctx, note });
        results.push({ ...ctx, status: "rescheduled", reasons: [...reasons, "QA cannot release"] });
      }
    } else {
      publish(`order/${o.id}/released`, ctx);
      eventBus.emit(EVENTS.ORDER_OK, { ...ctx, note: "Released" });
      results.push({ ...ctx, status: "released" });
    }

    publish(`order/${o.id}/checked`, ctx);
  }

  eventBus.emit(EVENTS.PLAN_DAY_DONE, { released: results.filter(r => r.status === "released").length });

  saveLastRun(results);
  return results;
}
