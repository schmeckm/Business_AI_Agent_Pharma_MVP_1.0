import fs from "fs";
import { config } from "../config.js"; 

import { askAI, canonicalizeDomainTerms } from "../utils/ai.js";

export function loadQaHistory() {
  try {
    if (!fs.existsSync(config.files.qaHistory)) return [];
    return JSON.parse(fs.readFileSync(config.files.qaHistory, "utf-8"));
  } catch { return []; }
}

function avg(arr) { if (!arr?.length) return null; return Math.round(arr.reduce((a,b)=>a+b,0) / arr.length); }

export function plannedStartTs(order) {
  if (order?.plannedStartAt) {
    const t = Date.parse(order.plannedStartAt);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now() + 6 * 60 * 60 * 1000; // default 6h
}

export async function estimateQaMinutes(material) {
  const history = loadQaHistory();
  const durations = history
    .filter(h => String(h.material||"").toUpperCase() === String(material||"").toUpperCase())
    .map(h => Number(h.durationMin)).filter(n => Number.isFinite(n) && n>0);
  const base = avg(durations) ?? 180;
  const txt = await askAI?.(canonicalizeDomainTerms(
    `Historische QA-Freigabedauern (Minuten) für Material ${material}: [${durations.join(", ")}].
     Gib eine robuste Schätzung (Ganzzahl Minuten). Antworte nur mit der Zahl.`)) || "";
  const m = String(txt).match(/(\d{1,4})/);
  const ki = m ? Number(m[1]) : null;
  if (Number.isFinite(ki) && Math.abs(ki - base) <= 120 && ki > 0) return ki;
  return base;
}
