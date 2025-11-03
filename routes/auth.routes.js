// routes/auth.routes.js
import { Router } from "express";
import { db } from "../utils/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

const router = Router();

/** POST /api/auth/register
 *  body: { username, password, role? }
 *  roles: 'admin' | 'empleado' (default)
 *  Solo admin puede crear otros usuarios en producción. Para MVP dejamos abierto
 *  y luego lo restringimos.
 */
router.post("/register", async (req,res)=>{
  const { username, password, role="empleado" } = req.body || {};
  if(!username || !password) return res.status(400).json({ error:"Faltan campos" });

  const users = await db.getUsers();
  if(users.some(u=>u.username === username)) return res.status(409).json({ error:"Usuario ya existe" });

  const hash = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), username, passHash: hash, role, createdAt: new Date().toISOString() };
  users.push(user);
  await db.saveUsers(users);

  return res.status(201).json({ id: user.id, username: user.username, role: user.role });
});

/** POST /api/auth/login */
router.post("/login", async (req,res)=>{
  const { username, password } = req.body || {};
  const users = await db.getUsers();
  const user = users.find(u=>u.username === username);
  if(!user) return res.status(401).json({ error:"Credenciales inválidas" });
  const ok = await bcrypt.compare(password, user.passHash);
  if(!ok) return res.status(401).json({ error:"Credenciales inválidas" });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
  res.json({ token, user: { id:user.id, username:user.username, role:user.role } });
});

export default router;
