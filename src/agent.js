// agent.js
import { Engine } from "bpmn-engine";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Helper to get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load the BPMN file
const bpmnSource = fs.readFileSync(
  path.resolve(__dirname, "../data/planning.bpmn"),
  "utf8"
);

// 2. Define conditions centrally
const conditions = {
  yes: (env) => env.variables.atpOk === true,
  no: (env) => env.variables.atpOk === false,
  ok: (env) => env.variables.tricOk && env.variables.rmslOk,
  fail: (env) => !env.variables.tricOk || !env.variables.rmslOk,
  enough: (env) => env.variables.timeOk === true,
  not_enough: (env) => env.variables.timeOk === false,
};

// 3. Simulate service tasks
const services = {
  atpCheck: (ctx, next) => {
    const res = Math.random() > 0.3;
    ctx.environment.variables.atpOk = res;
    console.log(`[ATP] Result: ${res ? "Passed" : "Failed"}`);
    next();
  },
  tricCheck: (ctx, next) => {
    const res = Math.random() > 0.2;
    ctx.environment.variables.tricOk = res;
    console.log(`[TRIC] Result: ${res ? "Passed" : "Failed"}`);
    next();
  },
  rmslCheck: (ctx, next) => {
    const res = Math.random() > 0.1;
    ctx.environment.variables.rmslOk = res;
    console.log(`[RMSL] Result: ${res ? "Passed" : "Failed"}`);
    next();
  },
  qaEstimate: (ctx, next) => {
    const est = Math.random() * 60;
    const timeOk = est < 30;
    ctx.environment.variables.timeOk = timeOk;
    console.log(
      `[QA] Estimate: ${est.toFixed(1)} Min -> ${
        timeOk ? "Enough time" : "Not enough time"
      }`
    );
    next();
  },
  releaseOrder: (ctx, next) => {
    console.log(`[ORDER] ✅ Order released`);
    next();
  },
  rescheduleOrder: (ctx, next) => {
    console.log(`[ORDER] ⏳ Order rescheduled`);
    next();
  },
  // Condition resolver for gateways
  condition: (expr, env) => {
    const fn = conditions[expr.trim()];
    return fn ? fn(env) : false;
  },
};

// 4. Run process with proper event logging
async function runProcess() {
  const engine = new Engine({
    name: "PlanningEngine",
    source: bpmnSource,
  });

  // 👉 Hier vor dem Start die Events abonnieren
  engine.broker.subscribeTmp(
    "event",
    "#",
    (_, msg) => {
      const rk = msg.fields.routingKey;
      const { id, type } = msg.content;

      if (rk === "execution.end") {
        console.log("✅ Process completed");
      }
      if (rk === "activity.start") {
        console.log(`▶️ Start: ${id} (${type})`);
      }
      if (rk === "activity.end") {
        console.log(`✔️ End: ${id} (${type})`);
      }
    },
    { noAck: true }
  );

  // Und jetzt erst den Prozess starten
  await engine.execute({ services });
}

runProcess().catch((err) => console.error(err));
