// src/agents/planning.bridge.js
import { eventBus, EVENTS } from "../eventBus.js";
import { runPlanningInstance } from "../agent.js";

export function registerPlanningBridge(broadcast) {
  const AGENT = "planningAgent";

  eventBus.on(EVENTS.PLAN_RUN, async ({ orderId }) => {
    broadcast({ type: "agent", agent: AGENT, text: `Starte Planung für Auftrag ${orderId} …`, at: Date.now() });

    try {
      const result = await runPlanningInstance(orderId);

      if (result.released) {
        broadcast({ type: "agent", agent: AGENT, text: `${orderId}: Auftrag freigegeben 🎉`, at: Date.now() });
      } else if (result.rescheduled) {
        broadcast({ type: "agent", agent: AGENT, text: `${orderId}: Auftrag verschoben ⏳`, at: Date.now() });
      } else {
        broadcast({ type: "agent", agent: AGENT, text: `${orderId}: Auftrag blockiert ❌`, at: Date.now() });
      }

      broadcast({ type: "agent", agent: AGENT, text: `Tagesplanung abgeschlossen.`, at: Date.now() });
    } catch (err) {
      broadcast({ type: "agent", agent: AGENT, text: `Fehler bei Auftrag ${orderId}: ${err.message}`, at: Date.now() });
    }
  });
}

// ---------------------------------------------------
// API für Workflow (direkter Aufruf von Services)
// ---------------------------------------------------
export const plannerAgent = {
  async atpCheck(orderId) {
    const note = "ATP ok (BPMN)";
    return { ok: true, note };
  },
  async tricCheck(orderId) {
    const note = "TRIC ok (BPMN)";
    return { ok: true, note };
  },
  async rmslCheck(orderId) {
    const note = "RMSL ok (BPMN)";
    return { ok: true, note };
  },
  async qaEstimate(orderId) {
    const est = Math.random() * 60;
    const note = `QA Estimate ~${est.toFixed(1)} Min`;
    return { ok: est < 30, note };
  },
  async releaseOrder(orderId) {
    return { ok: true, note: "Order released 🎉" };
  },
  async rescheduleOrder(orderId) {
    return { ok: true, note: "Order rescheduled ⏳" };
  }
};

