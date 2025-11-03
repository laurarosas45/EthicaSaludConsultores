// news.routes.js
import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "news.json");

// Utilidad: asegurar archivo y datos seed
async function ensureData(){
  try{
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  }catch{
    const seed = getSeedNews(); // datos de ejemplo
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

function getSeedNews(){
  return [
    { id:"n1", title:"Actualización de NOMs para establecimientos de salud",
      summary:"Cambios clave en requisitos de infraestructura, procesos y registros clínicos.",
      tag:"normatividad", url:"https://www.gob.mx/salud/",
      source_name:"Gobierno de México", source_url:"https://www.gob.mx/salud/",
      cover_image:"https://picsum.photos/seed/nom/800/500",
      published_at:"2025-08-15T10:00:00.000Z" },
    { id:"n2", title:"Checklist de habilitación: errores frecuentes",
      summary:"Aprendizajes de auditorías recientes y cómo evitarlos antes de la visita.",
      tag:"habilitacion", url:"https://www.gob.mx/salud/",
      source_name:"Secretaría de Salud", source_url:"https://www.gob.mx/salud/",
      cover_image:"https://picsum.photos/seed/hab/800/500",
      published_at:"2025-08-05T09:00:00.000Z" },
    { id:"n3", title:"Auditorías internas efectivas en 5 pasos",
      summary:"Diseño de plan, muestreos, evidencias, hallazgos y planes de mejora.",
      tag:"auditorias", url:"https://www.csg.gob.mx/",
      source_name:"Consejo de Salubridad General", source_url:"https://www.csg.gob.mx/",
      cover_image:"https://picsum.photos/seed/audit/800/500",
      published_at:"2025-07-29T13:00:00.000Z" },
    { id:"n4", title:"Seguridad del paciente: eventos adversos",
      summary:"Marco de reporte, análisis causal y cultura no punitiva.",
      tag:"seguridad-paciente", url:"https://www.gob.mx/salud/",
      source_name:"Gobierno de México", source_url:"https://www.gob.mx/salud/",
      cover_image:"https://picsum.photos/seed/patient/800/500",
      published_at:"2025-07-20T08:00:00.000Z" },
    { id:"n5", title:"Guía oficial para manejo de archivo clínico",
      summary:"Lineamientos sobre integridad, acceso y conservación de expedientes.",
      tag:"guias-oficiales", url:"https://www.dof.gob.mx/",
      source_name:"Diario Oficial de la Federación", source_url:"https://www.dof.gob.mx/",
      cover_image:"https://picsum.photos/seed/guias/800/500",
      published_at:"2025-06-11T16:00:00.000Z" },
    { id:"n6", title:"Cambios en criterios de evaluación para habilitación",
      summary:"Nuevas ponderaciones y evidencias mínimas por servicio.",
      tag:"habilitacion", url:"https://www.gob.mx/salud/",
      source_name:"Secretaría de Salud", source_url:"https://www.gob.mx/salud/",
      cover_image:"https://picsum.photos/seed/crit/800/500",
      published_at:"2025-05-22T10:30:00.000Z" },
    { id:"n7", title:"Auditoría basada en riesgos (ABR)",
      summary:"Cómo priorizar procesos críticos para mejorar cumplimiento.",
      tag:"auditorias", url:"https://www.csg.gob.mx/",
      source_name:"Consejo de Salubridad General", source_url:"https://www.csg.gob.mx/",
      cover_image:"https://picsum.photos/seed/risk/800/500",
      published_at:"2025-04-10T12:00:00.000Z" },
    { id:"n8", title:"Indicadores de seguridad del paciente 2025",
      summary:"Seguimiento, metas y tableros para la mejora continua.",
      tag:"seguridad-paciente", url:"https://www.gob.mx/salud/",
      source_name:"Gobierno de México", source_url:"https://www.gob.mx/salud/",
      cover_image:"https://picsum.photos/seed/ind/800/500",
      published_at:"2025-03-02T14:00:00.000Z" },
  ];
}

function normalize(str){ return (str ?? "").toString().toLowerCase(); }

function sortItems(items, sort){
  switch(sort){
    case "recent": return items.sort((a,b)=> new Date(b.published_at)-new Date(a.published_at));
    case "oldest": return items.sort((a,b)=> new Date(a.published_at)-new Date(b.published_at));
    case "az": return items.sort((a,b)=> normalize(a.title).localeCompare(normalize(b.title), "es"));
    case "za": return items.sort((a,b)=> normalize(b.title).localeCompare(normalize(a.title), "es"));
    default: return items;
  }
}

// Endpoints montados en /api desde index.js
router.get("/health", (_req,res)=> res.json({ ok: true }));

router.get("/news", async (req, res) => {
  await ensureData();
  const json = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));

  const q = normalize(req.query.q || "");
  const tag = normalize(req.query.tag || "");
  const sort = (req.query.sort || "recent");
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(24, Math.max(1, parseInt(req.query.pageSize || "6", 10)));

  let items = Array.isArray(json) ? [...json] : [];

  if(tag){ items = items.filter(it => normalize(it.tag) === tag); }

  if(q){
    items = items.filter(it =>
      normalize(it.title).includes(q) ||
      normalize(it.summary).includes(q) ||
      normalize(it.source_name).includes(q)
    );
  }

  sortItems(items, sort);

  const total = items.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);
  const hasMore = end < total;

  res.json({ items: pageItems, total, page, pageSize, hasMore });
});

router.post("/news", async (req, res) => {
  try{
    await ensureData();
    const body = req.body || {};
    if(!body.title || !body.url){
      return res.status(400).json({ error: "title y url son requeridos" });
    }
    const now = new Date().toISOString();
    const item = {
      id: body.id || `n${Date.now()}`,
      title: body.title,
      summary: body.summary || "",
      tag: body.tag || "",
      url: body.url,
      source_name: body.source_name || "",
      source_url: body.source_url || body.url,
      cover_image: body.cover_image || "",
      published_at: body.published_at || now
    };
    const arr = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    arr.unshift(item);
    await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
    res.status(201).json(item);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: "No se pudo crear la noticia" });
  }
});

export default router;

