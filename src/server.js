// src/server.js
import express from "express";
import http from "http";

import { config } from "./config.js";
import { initWs, broadcast } from "./ws.js";
import { initMqtt } from "./mqtt.js";

import healthRouter from "./routes/health.route.js";
import planningRouter from "./routes/planning.route.js";
import flowRouter from "./routes/flow.route.js";

import { registerPlanningBridge } from "./agents/planning.bridge.js";
import { registerQaAgent } from "./agents/qa.agent.js";
import { registerPurchasingAgent } from "./agents/purchasing.agent.js";

import { runWorkflow } from "./workflow/engine.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(config.publicDir));

// API-Router
app.use("/api", healthRouter);
app.use("/api", planningRouter);
app.use("/api", flowRouter);

// Config-Route fürs Frontend
app.get("/api/config", (_, res) => {
  res.json({ wsUrl: config.wsUrl, aiEnabled: config.aiEnabled });
});

// HTTP + WebSocket + MQTT
const server = http.createServer(app);
initWs(server);
initMqtt();

// Agents registrieren
registerPlanningBridge(broadcast);
registerQaAgent(broadcast);
registerPurchasingAgent(broadcast);

// Serverstart
server.listen(config.port, () => {
  console.log(`[WEB] http://localhost:${config.port}`);
  console.log(`[API] Swagger at /api-docs (optional; nicht enthalten in diesem Split)`);
});

// Optional: Testlauf beim Start
// runWorkflow();
