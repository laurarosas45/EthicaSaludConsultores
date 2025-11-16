// index.js — entrada única (ESM)
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Si tu Node < 18, descomenta la siguiente línea:
// import fetch from "node-fetch";

// ===== Rutas =====
// Ajusta el import de news si vive en /routes
import newsRouter from "./news.routes.js";
import authRouter from "./routes/auth.routes.js";
import filesRouter from "./routes/files.routes.js";
import waRouter from "./routes/wa.routes.js";
import contactRouter from "./routes/contact.routes.js";

// ===== Setup básico =====
const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middlewares globales =====
app.set("trust proxy", 1); // si despliegas detrás de proxy (Render, Vercel, Nginx)
app.use(helmet());

// ------------ CORRECCIÓN: parsers de body ------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// -----------------------------------------------------

// ===== CORS whitelist desde .env (CSV)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

  const corsOptions = {
    origin: (origin, cb) => cb(null, true), // permite todos
    credentials: true,
  };
  
app.use(cors(corsOptions));
// preflight

// Rate limit solo para /api
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Static (descargas públicas)
app.use("/uploads-public", express.static(path.resolve(__dirname, "uploads")));

// ===== Rutas de negocio =====
app.use("/api/auth", authRouter);
app.use("/api/files", filesRouter);
app.use("/api", newsRouter);            // expone /api/news...
app.use("/api/wa", waRouter);
app.use("/api/contacto", contactRouter);
app.use("/api/contact",  contactRouter); // ← alias para evitar 404


// ===== Health =====
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ===== QUIZ =====
const FALLBACK_QUESTIONS = [
  { id:"col-1", question:"¿Qué entidad en Colombia vigila el cumplimiento de las EPS e IPS?",
    options:{A:"INVIMA",B:"Ministerio de Salud",C:"Superintendencia Nacional de Salud",D:"Secretaría de Gobierno"},
    correct:"C", explanation:"La Supersalud supervisa y controla a EPS e IPS." },
  { id:"col-2", question:"¿Cuál es el objetivo de la Resolución 3100 de 2019?",
    options:{A:"Definir requisitos de habilitación",B:"Regular precios de medicamentos",C:"Controlar importación de dispositivos médicos",D:"Otorgar licencias laborales"},
    correct:"A", explanation:"Establece estándares para habilitación de servicios." },
  { id:"col-3", question:"¿Qué autoridad emite las resoluciones de habilitación en salud?",
    options:{A:"Congreso",B:"Ministerio de Salud y Protección Social",C:"INVIMA",D:"Supersalud"},
    correct:"B", explanation:"El Ministerio de Salud expide estas resoluciones." },
  { id:"col-4", question:"¿Qué evalúa principalmente la habilitación?",
    options:{A:"Publicidad",B:"Infraestructura, talento humano y procesos",C:"Número de pacientes",D:"Ganancia anual"},
    correct:"B", explanation:"Asegura condiciones mínimas de calidad y seguridad." },
  { id:"col-5", question:"¿Cuál es la función del INVIMA?",
    options:{A:"Regular EPS",B:"Vigilar calidad de medicamentos y alimentos",C:"Supervisar hospitales",D:"Otorgar licencias laborales"},
    correct:"B", explanation:"Regula y controla medicamentos, alimentos y dispositivos." }
];

function buildPrompt(){
  return `
Eres un generador de cuestionarios para "EthicaSalud Consultores S.A.S".
Genera EXACTAMENTE 5 preguntas (A-D) sobre normatividad sanitaria, auditoría, gestión de riesgos,
habilitación de servicios y calidad en salud en Colombia (Resolución 3100/2019, Supersalud, INVIMA).
Devuelve SOLO JSON: {"questions":[{"id":"q-1","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"..."}]}
`;
}

async function generarConIA(){
  if (!OPENAI_API_KEY) return null;
  try{
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: buildPrompt(),
        temperature: 0.4,
        max_output_tokens: 800
      })
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const raw = data.output_text ?? data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed?.questions)) throw new Error("JSON sin 'questions'");

    const sane = parsed.questions.slice(0,5).map((q,i)=>({
      id: q.id || `q-${i+1}`,
      question: String(q.question || "").trim(),
      options: q.options,
      correct: q.correct,
      explanation: String(q.exlication || q.explanation || "").trim()
    }));
    const ok = sane.every(q =>
      q.question &&
      q.options &&
      ["A","B","C","D"].every(k => (q.options[k] || "").trim()) &&
      ["A","B","C","D"].includes(q.correct)
    );
    if (!ok) throw new Error("Estructura inválida");
    return { questions: sane };
  } catch (e) {
    console.warn("IA falló:", e.message);
    return null;
  }
}

app.get("/", (_req, res) => res.send("Servidor de EthicaSalud funcionando ✅"));

app.get("/api/quiz", async (_req, res) => {
  const ia = await generarConIA();
  if (ia) return res.json(ia);
  return res.json({ questions: FALLBACK_QUESTIONS });
});

// ===== 404 & error handler =====
app.use((req, res) => res.status(404).json({ ok:false, error:"Not Found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok:false, error:"Internal Server Error" });
});

// ===== Arranque =====
app.listen(PORT, () => {
  console.log(`API lista en http://localhost:${PORT}`);
});
