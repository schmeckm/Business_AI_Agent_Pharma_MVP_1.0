// src/agent.js
import { Engine } from "bpmn-engine";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bpmnSource = fs.readFileSync(path.resolve(__dirname, "../data/planning.bpmn"), "utf8");

// ---- Service-Implementierungen ----
const services = {
  atpCheck: (ctx, next) => {
    const ok = Math.random() > 0.2;
    ctx.environment.variables.atpOk = ok;
    next(null, ok);
  },
  tricCheck: (ctx, next) => {
    const ok = Math.random() > 0.2;
    ctx.environment.variables.tricOk = ok;
    next(null, ok);
  },
  rmslCheck: (ctx, next) => {
    const ok = Math.random() > 0.1;
    ctx.environment.variables.rmslOk = ok;
    next(null, ok);
  },
  qaEstimate: (ctx, next) => {
    const est = Math.random() * 60;
    const ok = est < 30;
    ctx.environment.variables.timeOk = ok;
    ctx.environment.variables.qaMinutes = est;
    next(null, ok);
  },
  releaseOrder: (ctx, next) => {
    ctx.environment.variables.released = true;
    next();
  },
  rescheduleOrder: (ctx, next) => {
    ctx.environment.variables.rescheduled = true;
    next();
  }
};

// ---- Engine erstellen ----
export function runPlanningInstance(orderId) {
  const engine = new Engine({
    name: `PlanningEngine-${orderId}`,
    source: bpmnSource
  });

  return new Promise((resolve, reject) => {
    engine.execute({ services, variables: { orderId } }, (err, execution) => {
      if (err) return reject(err);

      execution.once("end", () => {
        resolve(execution.environment.variables);
      });
    });
  });
}
