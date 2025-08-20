// src/config.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

export const config = {
  port: Number(process.env.PORT || 5174),

  // --- MQTT ---
  mqttUrl: process.env.MQTT_URL || "mqtt://localhost:1883",
  mqttBase: (process.env.MQTT_BASE_TOPIC || "pharma/planner").replace(/\/$/, ""),

  // --- AI ---
  aiEnabled: !!process.env.OPENAI_API_KEY,
  modelName: process.env.MODEL_NAME || "gpt-4o-mini",

  // --- Pfade ---
  dataDir: path.join(ROOT, "data"),
  publicDir: path.join(ROOT, "public"),

  mock: {
    orders: path.join(ROOT, "mock", "orders.json"),
    lots:   path.join(ROOT, "mock", "lots.json"),
    stock:  path.join(ROOT, "mock", "stock.json"),
  },

  files: {
    lastRun: path.join(ROOT, "data", "last_run.json"),
    qaHistory: path.join(ROOT, "data", "qa_history.json"),
    bpmn: path.join(ROOT, "data", "planning.bpmn"),
  },

  // --- Workflow Mode ---
  workflowMode: (process.env.WORKFLOW_MODE || "builtin").toLowerCase(), // 'builtin' | 'bpmn'

  // --- WebSocket URL (für Frontend) ---
  wsUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 5174}`,
};
