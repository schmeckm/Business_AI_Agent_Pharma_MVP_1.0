// src/ws.js
import { WebSocketServer } from "ws";
import { handleCommand } from "./commands.js";  

let broadcastFn = () => {};

export function initWs(server) {
  const wss = new WebSocketServer({ server });
  const clients = new Set();

  wss.on("connection", (ws) => {
    clients.add(ws);

    // Begrüßung nur an diesen Client
    ws.send(JSON.stringify({
      type: "system",
      text: 'Connected. Type "help" for commands.'
    }));

    ws.on("message", async (raw) => {
      let text = "";
      try {
        const msg = JSON.parse(raw.toString());
        text = msg?.text || msg?.cmd || "";
      } catch {
        text = String(raw || "").trim();
      }
      if (!text) return;

      // 👇 Eingabe ins Chatlog für alle
      broadcast({ type: "chat", text, at: Date.now() });

      try {
        const out = await handleCommand(text);
        if (out) {
          // 👇 Antwort direkt an den Absender
          ws.send(JSON.stringify(out));
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "system", text: `Error: ${e.message}` }));
      }
    });

    ws.on("close", () => clients.delete(ws));
  });

  broadcastFn = (obj) => {
    const data = JSON.stringify(obj);
    for (const c of clients) {
      try { c.send(data); } catch {}
    }
  };
}

export const broadcast = (payload) => broadcastFn(payload);
