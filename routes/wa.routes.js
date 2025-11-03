// routes/wa.routes.js
import { Router } from "express";
import { buildWaUrl, getWaNumber } from "../utils/wa.js";

const router = Router();

/**
 * GET /api/wa
 * Devuelve el número oficial y la URL completa de WhatsApp.
 * Permite personalizar el mensaje con ?text=...
 */
router.get("/", (req, res) => {
  const text = (req.query.text || "").toString();
  return res.json({
    ok: true,
    number: getWaNumber(),
    url: buildWaUrl(text),
  });
});

export default router;
