import { readFileSync } from "fs";
import { config } from "../config.js";
import { eventBus, EVENTS } from "../eventBus.js";

// BPMN Parser (bpmn-engine von paed01)
import { Engine } from "bpmn-engine";

import { plannerAgent } from "../agents/planning.bridge.js";
import { qaAgent } from "../agents/qa.agent.js";
import { purchasingAgent } from "../agents/purchasing.agent.js";

// ---------------------------------------------------
// Hilfsfunktion: Services anhand von Namen mappen
// ---------------------------------------------------
function resolveService(name) {
  if (!name) return null;

  if (name.includes("atpCheck")) return plannerAgent.atpCheck;
  if (name.includes("tricCheck")) return plannerAgent.tricCheck;
  if (name.includes("rmslCheck")) return plannerAgent.rmslCheck;
  if (name.includes("releaseOrder") || name.includes("release")) return plannerAgent.release;
  if (name.includes("rescheduleOrder") || name.includes("reschedule")) return plannerAgent.reschedule;

  if (name.includes("qaEstimate")) return qaAgent.estimate;
  if (name.includes("purchase")) return purchasingAgent.purchase;

  return null;
}

// ---------------------------------------------------
// Workflow Runner
// ---------------------------------------------------
export async function runWorkflow() {
  console.log("[WORKFLOW] Starte BPMN Workflow …");

  const source = readFileSync(config.files.bpmn, "utf-8");

  const engine = new Engine({
    name: "PlanningEngine",
    source,
    variables: {}, // hier landen unsere Variablen (ATP ok?, TRIC ok?, …)
  });

  // Listener für Aktivitäten
  engine.once("end", () => {
    console.log("[WORKFLOW] Flow beendet.");
    eventBus.emit(EVENTS.PLAN_DAY_DONE, { released: engine.environment.variables.released ? 1 : 0 });
  });

  engine.on("activity.start", (api) => {
    console.log(`[WORKFLOW] → Starte Task: ${api.id} (${api.type})`);
  });

  engine.on("activity.end", (api) => {
    console.log(`[WORKFLOW] ✓ Beendet: ${api.id}`);
  });

  // Wenn ein Service-Task erreicht wird
  engine.on("activity.wait", async (api) => {
    const { id, type, behaviour, environment } = api;

    if (type === "bpmn:Task" && behaviour.name?.includes("service:")) {
      const serviceName = behaviour.name.match(/\(service:\s*([^)]+)\)/)?.[1];
      const fn = resolveService(serviceName);

      if (fn) {
        console.log(`[WORKFLOW] Running service: ${serviceName} for ${id}`);
        try {
          await fn("ORD-TEST", engine.environment); // Dummy Order-ID → später dynamisch
          api.signal(); // Task abschließen
        } catch (err) {
          console.error(`[WORKFLOW] Fehler im Service ${serviceName}:`, err);
          api.signal(); // trotzdem weiter, sonst hängt Workflow
        }
      } else {
        console.warn(`[WORKFLOW] Kein Service gefunden für Task ${id}`);
        api.signal();
      }
    } else {
      api.signal(); // normale Tasks/Gateways einfach weiter
    }
  });

  // Workflow starten
  await engine.execute();
}
