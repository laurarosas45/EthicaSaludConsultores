// routes/files.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { existsSync, createReadStream, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { nanoid } from "nanoid";
import { db } from "../utils/db.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();
const UPLOAD_DIR = path.resolve("uploads");

// Asegura el directorio sin usar top-level await
mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer: guardamos con id único manteniendo extensión
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${nanoid()}${ext}`);
  },
});
const upload = multer({ storage });

// Utilidad: parsea campo que puede venir como string JSON "[]"
// o arreglo real []
function parseArrayField(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Seguridad: ¿tiene el usuario permiso para ver el archivo?
function canRead(fileMeta, user) {
  if (!user) return false;
  if (user.role === "admin") return true;

  if (fileMeta.visibility === "company") return true;
  if (fileMeta.visibility === "private") return fileMeta.ownerId === user.id;
  if (fileMeta.visibility === "restricted") {
    const okUser = (fileMeta.allowedUsers || []).includes(user.id);
    const okRole = (fileMeta.allowedRoles || []).includes(user.role);
    return okUser || okRole || fileMeta.ownerId === user.id;
  }
  return false;
}

/* ==========================================
   SUBIR archivo
   POST /api/files/upload  (multipart/form-data, campo: file)
   ========================================== */
router.post("/upload", authRequired, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Archivo requerido (campo 'file')" });
  }

  const {
    visibility = "company", // 'company' | 'private' | 'restricted'
    allowedUsers = "[]",
    allowedRoles = "[]",
    title = "",
    notes = "",
  } = req.body || {};

  const files = await db.getFiles();
  const meta = {
    id: nanoid(),
    ownerId: req.user.id,                 // <-- ahora dentro del handler
    ownerUsername: req.user.username,     // <-- ahora dentro del handler
    visibility,
    allowedUsers: parseArrayField(allowedUsers),
    allowedRoles: parseArrayField(allowedRoles),
    title: String(title || req.file.originalname),
    notes: String(notes || ""),
    originalName: req.file.originalname,
    serverName: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
  };

  files.push(meta);
  await db.saveFiles(files);
  res.status(201).json(meta);
});

/* ==========================================
   LISTAR archivos visibles para el usuario
   GET /api/files
   ========================================== */
router.get("/", authRequired, async (req, res) => {
  const files = await db.getFiles();
  const visible = files
    .filter((f) => canRead(f, req.user))
    .map(({ serverName, ...rest }) => rest); // no exponemos serverName en listados
  res.json({ items: visible });
});

/* ==========================================
   ACTUALIZAR metadatos/permisos
   PATCH /api/files/:id
   ========================================== */
router.patch("/:id", authRequired, async (req, res) => {
  const files = await db.getFiles();
  const idx = files.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "No existe" });

  const file = files[idx];
  const isOwner = file.ownerId === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: "Solo dueño o admin" });
  }

  const { visibility, allowedUsers, allowedRoles, title, notes } = req.body || {};
  if (visibility) file.visibility = visibility;
  if (allowedUsers !== undefined) file.allowedUsers = parseArrayField(allowedUsers);
  if (allowedRoles !== undefined) file.allowedRoles = parseArrayField(allowedRoles);
  if (typeof title === "string") file.title = title;
  if (typeof notes === "string") file.notes = notes;

  files[idx] = file;
  await db.saveFiles(files);
  res.json(file);
});

/* ==========================================
   STREAM (ver inline)
   GET /api/files/:id/stream
   ========================================== */
router.get("/:id/stream", authRequired, async (req, res) => {
  const files = await db.getFiles();
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: "No existe" });
  if (!canRead(file, req.user)) return res.status(403).json({ error: "Sin permisos" });

  const full = path.join(UPLOAD_DIR, file.serverName);
  if (!existsSync(full)) return res.status(410).json({ error: "Archivo no encontrado" });

  const inlineable = /^image\/|^video\/|^audio\/|application\/pdf$/.test(file.mimetype);
  res.setHeader("Content-Type", file.mimetype);
  res.setHeader(
    "Content-Disposition",
    `${inlineable ? "inline" : "attachment"}; filename="${encodeURIComponent(file.originalName)}"`
  );
  createReadStream(full).pipe(res);
});

/* ==========================================
   DESCARGAR (forzar)
   GET /api/files/:id/download
   ========================================== */
router.get("/:id/download", authRequired, async (req, res) => {
  const files = await db.getFiles();
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: "No existe" });
  if (!canRead(file, req.user)) return res.status(403).json({ error: "Sin permisos" });

  const full = path.join(UPLOAD_DIR, file.serverName);
  if (!existsSync(full)) return res.status(410).json({ error: "Archivo no encontrado" });

  res.download(full, file.originalName);
});

/* ==========================================
   ELIMINAR
   DELETE /api/files/:id
   ========================================== */
router.delete("/:id", authRequired, async (req, res) => {
  const id = String(req.params.id || "").trim();
  const me = req.user;

  const files = await db.getFiles();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) return res.status(404).json({ error: "Archivo no encontrado" });

  const file = files[idx];
  const isOwner = file.ownerId === me.id;
  const isAdmin = me.role === "admin";
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: "Sin permiso para eliminar este archivo" });
  }

  const full = path.join(UPLOAD_DIR, file.serverName);
  try {
    await unlink(full);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("unlink error:", e);
      return res.status(500).json({ error: "No se pudo eliminar el archivo del disco" });
    }
  }

  files.splice(idx, 1);
  await db.saveFiles(files);

  res.json({ ok: true, deleted: { id: file.id, originalName: file.originalName } });
});

export default router;
