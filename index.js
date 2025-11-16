// index.js — entrada única (ESM)
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// ===== Rutas =====
import newsRouter from "./news.routes.js";
import authRouter from "./routes/auth.routes.js";
import filesRouter from "./routes/files.routes.js";
import waRouter from "./routes/wa.routes.js";
import contactRouter from "./routes/contact.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middlewares globales =====
app.set("trust proxy", 1); // Render usa proxy
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== CORS whitelist desde .env =====
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // peticiones sin origen (Postman, healthchecks, file://)
    if (!origin || origin === "null") return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Rate limit solo para /api
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Archivos públicos (uploads)
app.use(
  "/uploads-public",
  express.static(path.resolve(__dirname, "uploads"))
);

// ===== Servir FRONTEND (carpeta docs) =====
// Aquí vive tu EthicaSalud: index.html, CSS, JS, imágenes, etc.
app.use(express.static(path.join(__dirname, "docs")));

// ===== Rutas API =====
app.use("/api/auth", authRouter);
app.use("/api/files", filesRouter);
app.use("/api", newsRouter);        // /api/news...
app.use("/api/wa", waRouter);
app.use("/api/contacto", contactRouter);
app.use("/api/contact", contactRouter); // alias

// ===== Health Check =====
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: Date.now() })
);

// ===== QUIZ IA =====
const FALLBACK_QUESTIONS = [
  {
    id: "col-1",
    question:
      "¿Qué entidad en Colombia vigila el cumplimiento de las EPS e IPS?",
    options: {
      A: "INVIMA",
      B: "Ministerio de Salud",
      C: "Superintendencia Nacional de Salud",
      D: "Secretaría de Gobierno",
    },
    correct: "C",
    explanation: "La Supersalud supervisa y controla a EPS e IPS.",
  },
  {
    id: "col-2",
    question: "¿Cuál es el objetivo de la Resolución 3100 de 2019?",
    options: {
      A: "Definir requisitos de habilitación",
      B: "Regular precios de medicamentos",
      C: "Controlar importación de dispositivos médicos",
      D: "Otorgar licencias laborales",
    },
    correct: "A",
    explanation:
      "Establece estándares para la habilitación de servicios de salud.",
  },
  {
    id: "col-3",
    question:
      "¿Qué autoridad emite las resoluciones de habilitación en salud?",
    options: {
      A: "Congreso",
      B: "Ministerio de Salud y Protección Social",
      C: "INVIMA",
      D: "Supersalud",
    },
    correct: "B",
    explanation: "El Ministerio de Salud expide estas resoluciones.",
  },
  {
    id: "col-4",
    question: "¿Qué evalúa principalmente la habilitación?",
    options: {
      A: "Publicidad",
      B: "Infraestructura, talento humano y procesos",
      C: "Número de pacientes",
      D: "Ganancia anual",
    },
    correct: "B",
    explanation:
      "Asegura condiciones mínimas de calidad y seguridad del paciente.",
  },
  {
    id: "col-5",
    question: "¿Cuál es la función del INVIMA?",
    options: {
      A: "Regular EPS",
      B: "Vigilar calidad de medicamentos y alimentos",
      C: "Supervisar hospitales",
      D: "Otorgar licencias laborales",
    },
    correct: "B",
    explanation:
      "Regula y controla medicamentos, alimentos y dispositivos médicos.",
  },
];

function buildPrompt() {
  return `
Eres un generador de cuestionarios para "EthicaSalud Consultores S.A.S".
Genera EXACTAMENTE 5 preguntas (A-D) sobre normatividad sanitaria, auditoría,
gestión de riesgos, habilitación de servicios y calidad en salud en Colombia.
Devuelve SOLO JSON: {"questions":[...]}
`;
}

async function generarConIA() {
  if (!OPENAI_API_KEY) return null;

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: buildPrompt(),
        temperature: 0.4,
        max_output_tokens: 800,
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);

    const data = await resp.json();
    const raw =
      data.output_text ?? data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed?.questions))
      throw new Error("JSON sin 'questions'");

    return {
      questions: parsed.questions.slice(0, 5),
    };
  } catch (e) {
    console.warn("IA falló:", e.message);
    return null;
  }
}

// Ruta del quiz IA
app.get("/api/quiz", async (_req, res) => {
  const ia = await generarConIA();
  if (ia) return res.json(ia);
  return res.json({ questions: FALLBACK_QUESTIONS });
});

// ===== 404 =====
app.use((req, res) =>
  res.status(404).json({ ok: false, error: "Not Found" })
);

// ===== Error handler =====
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});

// ===== Arranque =====
app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
