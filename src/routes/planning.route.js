import { Router } from "express";
import { runPlanning, readLastRun, clearLastRun } from "../services/planning.service.js";

const router = Router();

// 👉 Plan starten
router.post("/plan/run", async (req, res) => {
  try {
    const country = req.query.country?.toUpperCase();
    const result = await runPlanning({ filterCountry: country });
    const released = result.filter(r=>r.status==='released').length;
    res.json({ ok: true, released, nonReleased: result.length - released, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 👉 Letzten Run lesen
router.get("/plan/last", (_, res) => {
  try { 
    res.json({ ok: true, lastRun: readLastRun() }); 
  }
  catch (e) { 
    res.status(500).json({ ok: false, error: e.message }); 
  }
});

// 👉 Letzten Run löschen
router.delete("/plan/last", (_, res) => {
  try {
    clearLastRun();
    res.json({ ok: true, msg: "Last run gelöscht" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;

