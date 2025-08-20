import OpenAI from "openai";
import { config } from "../config.js";


export const aiClient = config.aiEnabled ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export const DOMAIN_SYSTEM_PROMPT = `
Du bist ein Assistent für einen Pharma-Planungs-Chat. Antworte kurz (<= 3 Sätze) und auf Deutsch.
WICHTIG – Domain-Definitionen (immer so verwenden):
- TRIC = "Targeted Regional Import Compliance": Länderfreigabe einer Charge. Eine Charge ist nur für die Länder zulässig, die in ihrer TRIC-Liste stehen. TRIC ≠ Risikoanalyse.
- RMSL = "Remaining Shelf Life" in Prozent: Standard: EU ≥ 60 %, RoW ≥ 80 %, sofern nicht anders konfiguriert.
- ATP  = "Available to Promise": verfügbare Menge zur Bedarfsdeckung.
Wenn nach „TRIC-Prüfung“ gefragt wird, erkläre sie als Ländercode-/Freigabeprüfung der Charge gegen das Zielland.
`.trim();

export function canonicalizeDomainTerms(input) {
  let t = String(input ?? "");
  if (/tric/i.test(t)) t += " (TRIC = Targeted Regional Import Compliance: Länderfreigabe der Charge)";
  if (/rmsl/i.test(t)) t += " (RMSL = Remaining Shelf Life in %; EU ≥ 60 %, RoW ≥ 80 %)";
  if (/\batp\b/i.test(t)) t += " (ATP = Available to Promise: verfügbare Menge)";
  return t;
}

export async function askAI(prompt) {
  if (!aiClient) return null;
  const res = await aiClient.chat.completions.create({
    model: config.modelName,
    temperature: 0.2,
    messages: [
      { role: "system", content: DOMAIN_SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ]
  });
  return res.choices?.[0]?.message?.content ?? "";
}
