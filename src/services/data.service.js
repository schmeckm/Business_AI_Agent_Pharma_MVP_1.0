import fs from "fs";
import { config } from "../config.js";

function readJSON(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }

export function readOrders() { return readJSON(config.mock.orders); }
export function readLots()   { return readJSON(config.mock.lots); }
export function readStock()  { return readJSON(config.mock.stock); }

export function saveLastRun(results) {
  const released = results.filter(r => r.status === "released").length;
  const data = {
    at: new Date().toISOString(),
    released,
    nonReleased: results.length - released,
    result: results
  };
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(config.files.lastRun, JSON.stringify(data, null, 2), "utf-8");
}

export function readLastRun() {
  if (!fs.existsSync(config.files.lastRun)) return null;
  return JSON.parse(fs.readFileSync(config.files.lastRun, "utf-8"));
}
