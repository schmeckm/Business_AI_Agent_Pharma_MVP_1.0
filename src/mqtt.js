import mqtt from "mqtt";
import { config } from "./config.js"; 

import { broadcast } from "./ws.js";

let client;
export function initMqtt() {
  client = mqtt.connect(config.mqttUrl, { clientId: process.env.MQTT_CLIENT_ID || "planner-chat" });
  client.on("connect", () => {
    console.log("[MQTT] connected", config.mqttUrl);
    const topic = `${config.mqttBase}/#`;
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) console.error("[MQTT] subscribe error:", err.message);
      else console.log("[MQTT] subscribed", topic);
    });
  });
  client.on("message", (topic, buf) => {
    let data; try { data = JSON.parse(buf.toString()); } catch { data = { raw: buf.toString() }; }
    broadcast({ type: "event", topic, payload: data, at: Date.now() });
  });
}

export function publish(topic, payload) {
  if (!client) return;
  client.publish(`${config.mqttBase}/${topic}`, JSON.stringify(payload), { qos: 1 });
}
