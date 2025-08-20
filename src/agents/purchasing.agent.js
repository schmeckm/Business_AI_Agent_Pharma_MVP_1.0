// src/agents/purchasing.agent.js
import { eventBus, EVENTS } from "../eventBus.js";
import { askAI, canonicalizeDomainTerms } from "../utils/ai.js";

// Event-gesteuert
export function registerPurchasingAgent(broadcast) {
  const AGENT = "purchasingAgent";
  eventBus.on(EVENTS.PURCH_REQUEST, async ({ orderId, reasons }) => {
    const msg = `Einkauf informiert für Auftrag ${orderId}: ${reasons.join(", ")}. Prüfe Alternativen/Expedite.`;
    broadcast({ type: "agent", agent: AGENT, text: msg, at: Date.now() });

    try {
      const tip = await askAI?.(
        canonicalizeDomainTerms(
          `Gib eine sehr kurze Einkaufs-Empfehlung (Expedite) für Auftrag ${orderId} (Gründe: ${reasons.join(", ")}).`
        )
      );
      if (tip) {
        broadcast({ type: "agent", agent: AGENT, text: `Purchasing-Kurzvorschlag: ${tip}`, at: Date.now() });
      }
    } catch {}
  });
}

// API für Workflow
export const purchasingAgent = {
  async order() {
    console.log("[Purchasing Agent] order() ausgeführt");
    return { status: "ordered", etaDays: 3 };
  }
};
