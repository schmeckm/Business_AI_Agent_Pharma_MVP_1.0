import fs from "fs";
import BpmnModdle from "bpmn-moddle";
import path from "path";

const FLOW_FILE = path.join(process.cwd(), "data", "planning.bpmn");
const moddle = new BpmnModdle();

/**
 * Lädt den Flow und parst ihn in ein Modell
 */
export async function loadFlow() {
  if (!fs.existsSync(FLOW_FILE)) {
    throw new Error("Kein Flow gefunden: " + FLOW_FILE);
  }
  const xml = fs.readFileSync(FLOW_FILE, "utf-8");
  const { rootElement } = await moddle.fromXML(xml);
  return rootElement;
}

/**
 * Findet die Tasks + Sequenzen im Prozess
 */
export async function getFlowSteps() {
  const def = await loadFlow();
  const process = def.rootElements.find(e => e.$type === "bpmn:Process");
  const tasks = process.flowElements.filter(e => e.$type.includes("Task"));
  const gateways = process.flowElements.filter(e => e.$type.includes("Gateway"));
  return { tasks, gateways };
}
