import { Router } from "express";
const router = Router();
router.get("/health", (_, res) => res.json({ ok: true }));
export default router;
