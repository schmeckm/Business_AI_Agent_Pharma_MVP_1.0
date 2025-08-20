import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { eventBus, EVENTS } from "../eventBus.js";
import { broadcast } from "../ws.js";

const FLOW_FILE = path.join(process.cwd(), "data", "planning.bpmn");

export function bpmnExists() {
  return fs.existsSync(FLOW_FILE);
}

export async function runBpmnExecution(order, lot) {
  const xml = fs.readFileSync(FLOW_FILE, "utf-8");
  const parser = new xml2js.Parser();
  const json = await parser.parseStringPromise(xml);

  const tasks = json["bpmn:definitions"]["bpmn:process"][0]["bpmn:task"] || [];
  console.log(`[BPMN] Starte Flow für Order ${order.id}, ${tasks.length} Tasks`);

  for (const task of tasks) {
    const name = task["$"].name || "";
    const serviceMatch = name.match(/service:\s*(\w+)/);
    if (!serviceMatch) continue;

    const service = serviceMatch[1];
    // 👉 Hier Debug + Broadcast
    console.log(`[BPMN] Task= ${service}, Order=${order.id}`);
    broadcast({ type: "agent", agent: "planningAgent", text: `BPMN-Service ${service} gestartet (Order ${order.id})`, at: Date.now() });

    try {
      // Fake-Check: Nur als Beispiel
      if (service === "atpCheck") {
        eventBus.emit(EVENTS.ORDER_OK, { orderId: order.id, note: "ATP ok (BPMN)" });
      }
      if (service === "tricCheck") {
        eventBus.emit(EVENTS.ORDER_OK, { orderId: order.id, note: "TRIC ok (BPMN)" });
      }
      if (service === "rmslCheck") {
        eventBus.emit(EVENTS.ORDER_OK, { orderId: order.id, note: "RMSL ok (BPMN)" });
      }

      // Nach jedem Task eine Broadcast-Zwischenmeldung
      broadcast({ type: "agent", agent: "planningAgent", text: `BPMN-Service ${service} abgeschlossen (Order ${order.id})`, at: Date.now() });

    } catch (e) {
      console.error(`[BPMN] Fehler im Service ${service}:`, e);
      broadcast({ type: "system", text: `BPMN-Fehler bei Task ${service}: ${e.message}`, at: Date.now() });
      throw e;
    }
  }

  console.log(`[BPMN] Flow fertig für Order ${order.id}`);
}
