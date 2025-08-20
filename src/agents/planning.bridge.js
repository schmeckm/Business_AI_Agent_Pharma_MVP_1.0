import { eventBus, EVENTS } from "../eventBus.js";

// ---------------------------------------------------
// Broadcast-Events (für Chat, UI)
// ---------------------------------------------------
export function registerPlanningBridge(broadcast) {
  const AGENT = "planningAgent";

  eventBus.on(EVENTS.PLAN_DAY_STARTED, ({ total }) =>
    broadcast({
      type: "agent",
      agent: AGENT,
      text: `Tagesplanung gestartet. ${total} Aufträge im Scope.`,
      at: Date.now(),
    })
  );

  eventBus.on(EVENTS.ORDER_OK, ({ orderId, note }) =>
    broadcast({
      type: "agent",
      agent: AGENT,
      text: `${orderId}: ${note}`,
      at: Date.now(),
    })
  );

  eventBus.on(EVENTS.ORDER_BLOCKED, ({ orderId, reasons }) =>
    broadcast({
      type: "agent",
      agent: AGENT,
      text: `${orderId} BLOCKED → ${reasons.join(", ")}`,
      at: Date.now(),
    })
  );

  eventBus.on(EVENTS.ORDER_RESCHEDULED, ({ orderId, note }) =>
    broadcast({
      type: "agent",
      agent: AGENT,
      text: `${orderId} verschoben: ${note}`,
      at: Date.now(),
    })
  );

  eventBus.on(EVENTS.QA_ESTIMATE, ({ orderId, material, estMinutes, windowMinutes }) =>
    broadcast({
      type: "agent",
      agent: "qaAgent",
      text: `QA-Schätzung für Auftrag ${orderId} (${material}): ~${estMinutes} Min, Fenster: ${windowMinutes} Min.`,
      at: Date.now(),
    })
  );

  eventBus.on(EVENTS.PLAN_DAY_DONE, ({ released }) =>
    broadcast({
      type: "agent",
      agent: AGENT,
      text: `Tagesplanung abgeschlossen. Released: ${released}`,
      at: Date.now(),
    })
  );
}

// ---------------------------------------------------
// API für Workflow (Services, die Variablen setzen)
// ---------------------------------------------------
export const plannerAgent = {
  async atpCheck(orderId, environment) {
    const ok = Math.random() > 0.2; // Beispiel: 80% ATP ok
    environment.variables.atpResult = ok;

    const note = ok ? "ATP ok (BPMN)" : "ATP fehlgeschlagen (BPMN)";
    if (ok) {
      eventBus.emit(EVENTS.ORDER_OK, { orderId, note });
    } else {
      eventBus.emit(EVENTS.ORDER_BLOCKED, { orderId, reasons: ["ATP fehlgeschlagen"] });
    }
    return ok;
  },

  async tricCheck(orderId, environment) {
    const ok = Math.random() > 0.1; // Beispiel: 90% TRIC ok
    environment.variables.tricResult = ok;

    const note = ok ? "TRIC ok (BPMN)" : "TRIC-Check fehlgeschlagen (BPMN)";
    if (ok) {
      eventBus.emit(EVENTS.ORDER_OK, { orderId, note });
    } else {
      eventBus.emit(EVENTS.ORDER_BLOCKED, { orderId, reasons: ["TRIC nicht erfüllt"] });
    }
    return ok;
  },

  async rmslCheck(orderId, environment) {
    const ok = Math.random() > 0.15; // Beispiel: 85% RMSL ok
    environment.variables.rmslResult = ok;

    const note = ok ? "RMSL ok (BPMN)" : "RMSL zu niedrig (BPMN)";
    if (ok) {
      eventBus.emit(EVENTS.ORDER_OK, { orderId, note });
    } else {
      eventBus.emit(EVENTS.ORDER_BLOCKED, { orderId, reasons: ["RMSL zu niedrig"] });
    }
    return ok;
  },

  async release(orderId, environment) {
    environment.variables.released = true;
    const note = "Auftrag freigegeben (BPMN)";
    eventBus.emit(EVENTS.ORDER_OK, { orderId, note });
    return true;
  },

  async reschedule(orderId, environment) {
    environment.variables.rescheduled = true;
    const note = "Auftrag neu eingeplant (BPMN)";
    eventBus.emit(EVENTS.ORDER_RESCHEDULED, { orderId, note });
    return true;
  },
};
