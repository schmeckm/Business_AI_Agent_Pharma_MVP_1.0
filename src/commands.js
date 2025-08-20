// src/commands.js
import { runPlanning } from "./services/planning.service.js";
import { readOrders, readLots, readStock } from "./services/data.service.js";
import { fmtOrder, normalizeId } from "./utils/helpers.js";
import { runWorkflow } from "./workflow/engine.js";   // 👈 NEU

export async function handleCommand(text) {
  const lower = String(text).trim().toLowerCase();

  if (lower === "help") {
    return { 
      type: "system", 
      text: 'Commands: "orders list", "order <ID> details", "plan status", "plan run [country=XX]", "rerun <ID>", "glossary", "runflow"' 
    };
  }

  if (lower === "orders list") {
    const orders = readOrders();
    const lines = orders.map(fmtOrder).join("\n") || "No orders.";
    return { type: "system", text: lines };
  }

  if (lower.startsWith("order ") && lower.endsWith(" details")) {
    const id = text.slice(6, -8).trim();
    const orders = readOrders();
    const lots   = readLots();
    const stock  = readStock();
    const o = orders.find(x => normalizeId(x.id) === normalizeId(id));
    if (!o) return { type: "system", text: `Order ${id} not found.` };
    const lot = lots.find(l => l.material === o.bulkMaterial);
    const stockQty = stock[o.bulkMaterial] ?? 0;
    return { type: "system", text: JSON.stringify({ order: o, candidateLot: lot, stockQty }, null, 2) };
  }

  if (lower === "plan status") {
    return { type: "system", text: 'Planner ready. Use "plan run", optionally "plan run country=US".' };
  }

  if (lower.startsWith("plan run")) {
    const m = text.match(/country\s*=\s*([A-Za-z]{2})/);
    const country = m ? m[1].toUpperCase() : undefined;
    const result = await runPlanning({ filterCountry: country });
    const summary = `Plan finished. Released: ${result.filter(r=>r.status==='released').length}, Blocked: ${result.filter(r=>r.status==='blocked').length}`;
    return { type: "system", text: summary };
  }

  if (lower.startsWith("rerun ")) {
    const id = text.slice(6).trim();
    const result = await runPlanning({ onlyOrderId: id });
    const r = result[0];
    if (!r) return { type: "system", text: `Order ${id} not found.` };
    return { type: "system", text: `${r.orderId}: ${r.status}${r.reasons ? ' -> ' + r.reasons.join(", ") : ""}` };
  }

  if (lower === "glossary") {
    return { type: "system", text: "TRIC = Länderfreigabe fürs Zielland; RMSL = Resthaltbarkeit; ATP = verfügbare Menge (Available To Promise)." };
  }

  // 👇 NEU: BPMN Workflow ausführen
  if (lower === "runflow") {
    await runWorkflow();
    return { type: "system", text: "BPMN Workflow gestartet. Siehe Logs im Server." };
  }

  return { type: "system", text: `Unknown command: ${text}` };
}
