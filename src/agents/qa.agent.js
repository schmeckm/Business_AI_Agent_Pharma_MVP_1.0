// src/agents/qa.agent.js
import { eventBus, EVENTS } from "../eventBus.js";
import { askAI, canonicalizeDomainTerms } from "../utils/ai.js";

export function registerQaAgent(broadcast) {
  const AGENT = "qaAgent";
  eventBus.on(EVENTS.QA_REQUEST, async ({ orderId, reasons }) => {
    const msg = `QA informiert für Auftrag ${orderId}: ${reasons.join(", ")}. Prüfe Prüflos-Priorisierung.`;
    broadcast({ type: "agent", agent: AGENT, text: msg, at: Date.now() });

    try {
      const tip = await askAI?.(
        canonicalizeDomainTerms(
          `Gib eine sehr kurze QA-Empfehlung für Auftrag ${orderId} (Gründe: ${reasons.join(", ")}).`
        )
      );
      if (tip) {
        broadcast({ type: "agent", agent: AGENT, text: `QA-Kurzvorschlag: ${tip}`, at: Date.now() });
      }
    } catch {}
  });
}

export const qaAgent = {
  async estimate() {
    console.log("[QA Agent] estimate() ausgeführt");
    return { estMinutes: 30, windowMinutes: 60 };
  }
};
