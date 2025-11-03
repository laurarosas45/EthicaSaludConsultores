// utils/db.js
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
await mkdir(DATA_DIR, { recursive: true });

async function readJSON(file, fallback) {
  const p = path.join(DATA_DIR, file);
  if (!existsSync(p)) { await writeFile(p, JSON.stringify(fallback, null, 2)); return fallback; }
  const raw = await readFile(p, "utf8");
  try { return JSON.parse(raw || "null") ?? fallback; } catch { return fallback; }
}

async function writeJSON(file, data) {
  const p = path.join(DATA_DIR, file);
  await writeFile(p, JSON.stringify(data, null, 2));
}

export const db = {
  async getUsers(){ return readJSON("users.json", []); },
  async saveUsers(users){ return writeJSON("users.json", users); },
  async getFiles(){ return readJSON("files.json", []); },
  async saveFiles(files){ return writeJSON("files.json", files); },
};
