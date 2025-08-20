import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfad zu deiner Flow-Datei
const FLOW_FILE = path.join(process.cwd(), "data", "planning.bpmn");


// ---------- Flow laden ----------
router.get("/flow/planning.bpmn", (req, res) => {
  console.log("[FLOW] GET /api/flow/planning.bpmn");
  console.log("[FLOW] expected path:", FLOW_FILE);

  try {
    if (!fs.existsSync(FLOW_FILE)) {
      console.warn("[FLOW] Datei nicht gefunden:", FLOW_FILE);
      const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="planning" isExecutable="true">
    <bpmn:startEvent id="start" />
    <bpmn:endEvent id="end" />
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="end" />
  </bpmn:process>
</bpmn:definitions>`;
      return res.type("application/xml").send(DEFAULT_XML);
    }

    const xml = fs.readFileSync(FLOW_FILE, "utf-8");
    console.log("[FLOW] Datei geladen OK, Länge:", xml.length);
    res.type("application/xml").send(xml);

  } catch (err) {
    console.error("[FLOW] Fehler beim Laden:", err);
    res.status(500).send("Error loading flow: " + err.message);
  }
});

// ---------- Flow speichern ----------
router.post("/flow/planning.bpmn", express.json({ limit: "5mb" }), (req, res) => {
  console.log("[FLOW] POST /api/flow/planning.bpmn");
  try {
    const { xml } = req.body;
    if (!xml) {
      console.warn("[FLOW] Kein XML im Body!");
      return res.status(400).json({ ok: false, error: "No XML provided" });
    }

    fs.writeFileSync(FLOW_FILE, xml, "utf-8");
    console.log("[FLOW] Datei gespeichert:", FLOW_FILE, "Länge:", xml.length);
    res.json({ ok: true });
  } catch (err) {
    console.error("[FLOW] Fehler beim Speichern:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
