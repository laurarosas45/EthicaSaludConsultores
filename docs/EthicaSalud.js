/* ========= Sombra header on scroll ========= */
(function () {
  const header = document.querySelector('header[role="banner"]');
  const THRESHOLD = 20;
  const toggle = () =>
    header &&
    (window.scrollY > THRESHOLD
      ? header.classList.add("has-shadow")
      : header.classList.remove("has-shadow"));
  window.addEventListener("scroll", toggle, { passive: true });
  toggle();
})();

/* ========= SECCIÓN #4 — Juego (quiz) ========= */
(() => {
  const API_URL = "/api/quiz";
  const pantallaInicial = document.getElementById("pantalla-inicial");
  const pantallaPregunta = document.getElementById("pantalla-pregunta");
  const pantallaResultado = document.getElementById("pantalla-resultado");
  const btnIniciar = document.getElementById("btn-iniciar");
  const btnSiguiente = document.getElementById("btn-siguiente");
  const btnReintentar = document.getElementById("btn-reintentar");
  const textoPregunta = document.getElementById("texto-pregunta");
  const contOpciones = document.querySelector(".opciones");
  const numActual = document.getElementById("num-actual");
  const puntajeEl = document.getElementById("puntaje");
  let listaExp = document.getElementById("lista-explicaciones");
  const temporizadorEl = document.getElementById("temporizador");

  let preguntas = [],
    indice = 0,
    puntaje = 0,
    respuestasDetalladas = [];
  let timerId = null,
    restante = 30;
  const DURACION = 30;

  const bancoLocalRespaldo = [
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
      explanation:
        "La Supersalud supervisa y controla a EPS e IPS para garantizar la adecuada prestación de servicios.",
    },
    {
      id: "col-2",
      question: "¿Cuál es el objetivo principal de la Resolución 3100 de 2019?",
      options: {
        A: "Definir requisitos de habilitación",
        B: "Regular precios de medicamentos",
        C: "Otorgar licencias laborales",
        D: "Definir planes de beneficios",
      },
      correct: "A",
      explanation:
        "La 3100 de 2019 establece estándares para la habilitación de servicios de salud en Colombia.",
    },
    {
      id: "col-3",
      question:
        "¿Qué autoridad emite las resoluciones de habilitación en salud?",
      options: {
        A: "Congreso de la República",
        B: "Ministerio de Salud y Protección Social",
        C: "INVIMA",
        D: "Supersalud",
      },
      correct: "B",
      explanation:
        "El Ministerio de Salud y Protección Social expide las resoluciones de habilitación.",
    },
    {
      id: "col-4",
      question:
        "¿Qué evalúa principalmente el proceso de habilitación de servicios?",
      options: {
        A: "Publicidad de la IPS",
        B: "Infraestructura, talento humano, medicamentos y procesos",
        C: "Cantidad de pacientes atendidos",
        D: "Ganancias de la clínica",
      },
      correct: "B",
      explanation:
        "La habilitación verifica condiciones mínimas para calidad y seguridad del paciente.",
    },
    {
      id: "col-5",
      question: "¿Cuál es la función del INVIMA?",
      options: {
        A: "Regular las EPS",
        B: "Vigilar calidad de medicamentos, alimentos y dispositivos médicos",
        C: "Autorizar apertura de hospitales",
        D: "Definir tarifas de servicios",
      },
      correct: "B",
      explanation:
        "INVIMA controla y vigila la calidad sanitaria de productos y dispositivos médicos.",
    },
  ];

  const mostrarVista = (v) =>
    [pantallaInicial, pantallaPregunta, pantallaResultado].forEach((x) =>
      x?.classList.add("oculto")
    ) || v?.classList.remove("oculto");
  const barajar = (arr) =>
    arr
      .map((x) => ({ x, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.x);

  async function obtenerPreguntas() {
    const PROHIBIDOS = /(méxico|cofepris|nom-|ssa\b)/i;
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Respuesta no OK");
      const data = await res.json();
      if (!Array.isArray(data?.questions) || !data.questions.length)
        throw new Error("Formato inválido");
      const texto = JSON.stringify(data.questions).toLowerCase();
      if (PROHIBIDOS.test(texto)) return bancoLocalRespaldo;
      return data.questions.slice(0, 5).map((q, i) => ({
        id: q.id || `q-${i + 1}`,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation:
          (q.explanation && String(q.explanation).trim()) ||
          "Explicación no disponible.",
      }));
    } catch {
      return bancoLocalRespaldo;
    }
  }

  function iniciarTemporizador() {
    if (timerId) clearInterval(timerId);
    restante = DURACION;
    temporizadorEl && (temporizadorEl.textContent = `${restante}s`);
    timerId = setInterval(() => {
      restante -= 1;
      temporizadorEl && (temporizadorEl.textContent = `${restante}s`);
      if (restante <= 0) {
        clearInterval(timerId);
        timerId = null;
        contOpciones
          ?.querySelectorAll(".opcion")
          .forEach((b) => (b.disabled = true));
        btnSiguiente && (btnSiguiente.disabled = false);
      }
    }, 1000);
  }

  function renderPregunta() {
    mostrarVista(pantallaPregunta);
    if (btnSiguiente) btnSiguiente.disabled = true;
    if (numActual) numActual.textContent = String(indice + 1);
    const q = preguntas[indice];
    if (textoPregunta) textoPregunta.textContent = q.question;

    if (contOpciones) {
      contOpciones.innerHTML = "";
      ["A", "B", "C", "D"]
        .filter((k) => q.options?.[k])
        .forEach((clave) => {
          const btn = document.createElement("button");
          btn.className = "opcion";
          btn.type = "button";
          btn.dataset.opcion = clave;
          btn.innerHTML = `<strong>${clave})</strong> ${q.options[clave]}`;
          btn.addEventListener("click", () => seleccionarOpcion(btn, clave));
          contOpciones.appendChild(btn);
        });
    }
    iniciarTemporizador();
  }

  function seleccionarOpcion(btn, clave) {
    const q = preguntas[indice];
    contOpciones
      ?.querySelectorAll(".opcion")
      .forEach(
        (b) => ((b.disabled = true), b.classList.remove("seleccionada"))
      );
    btn.classList.add("seleccionada");
    const registro = {
      ...q,
      elegida: clave,
      acierto: clave === q.correct,
    };
    if (registro.acierto) {
      btn.classList.add("correcta");
      puntaje += 1;
    } else {
      btn.classList.add("incorrecta");
      contOpciones
        ?.querySelector(`.opcion[data-opcion="${q.correct}"]`)
        ?.classList.add("correcta");
    }
    respuestasDetalladas.push(registro);
    if (btnSiguiente) btnSiguiente.disabled = false;
    if (timerId) clearInterval(timerId), (timerId = null);
  }

  // Crea el panel de explicaciones si no existe y devuelve la UL
  function ensureExplanationPanel() {
    if (!pantallaResultado) return null;

    // ¿ya existe?
    let details = pantallaResultado.querySelector("details.details-exp");
    if (!details) {
      details = document.createElement("details");
      details.className = "details-exp";
      details.open = true;

      const sum = document.createElement("summary");
      sum.textContent = "Explicaciones y respuestas";
      details.appendChild(sum);

      const ul = document.createElement("ul");
      ul.id = "lista-explicaciones";
      ul.className = "lista-explicaciones";
      ul.style.marginTop = "8px";
      details.appendChild(ul);

      pantallaResultado.appendChild(details);
    }

    // ¿y la UL?
    listaExp = details.querySelector("#lista-explicaciones");
    if (!listaExp) {
      listaExp = document.createElement("ul");
      listaExp.id = "lista-explicaciones";
      details.appendChild(listaExp);
    }
    return listaExp;
  }

  function mostrarResultado() {
    mostrarVista(pantallaResultado);
    puntajeEl && (puntajeEl.textContent = String(puntaje));

    const ul = ensureExplanationPanel();
    if (ul) {
      ul.innerHTML = "";
      respuestasDetalladas.forEach((r, i) => {
        const li = document.createElement("li");
        li.style.margin = "8px 0";
        const correctaTxt = r.options?.[r.correct] ?? r.correct;
        const elegidaTxt = r.options?.[r.elegida] ?? r.elegida;

        li.innerHTML = `
          <div><strong>Pregunta ${i + 1}:</strong> ${r.question}</div>
          <div><strong>Tu respuesta:</strong> ${
            elegidaTxt ?? "—"
          } ${r.acierto ? "✅" : "❌"}</div>
          <div><strong>Correcta:</strong> ${correctaTxt}</div>
          <div><em>${
            r.explanation || "Sin explicación."
          }</em></div>
        `;
        ul.appendChild(li);
      });

      // mantener abierto el panel
      const details = ul.closest("details.details-exp");
      if (details) details.setAttribute("open", "");
    }
  }

  async function iniciar() {
    puntaje = 0;
    indice = 0;
    respuestasDetalladas = [];
    preguntas = barajar(await obtenerPreguntas()).slice(0, 5);
    renderPregunta();
  }
  const siguiente = () =>
    ++indice >= preguntas.length ? mostrarResultado() : renderPregunta();

  btnIniciar?.addEventListener("click", iniciar);
  btnSiguiente?.addEventListener("click", siguiente);
  btnReintentar?.addEventListener("click", () =>
    mostrarVista(pantallaInicial)
  );
})();

/* ========= Reveal on scroll ========= */
function splitIntoChars(el) {
  const text = el.textContent;
  el.textContent = "";
  const frag = document.createDocumentFragment();
  Array.from(text).forEach((ch, i) => {
    if (ch === " ") frag.appendChild(document.createTextNode(" "));
    else {
      const span = document.createElement("span");
      span.className = "char";
      span.style.transitionDelay = `${Math.min(i * 14, 800)}ms`;
      span.textContent = ch;
      frag.appendChild(span);
    }
  });
  el.appendChild(frag);
}
function setupRevealOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
  );
  document.querySelectorAll('[data-split="chars"]').forEach((el) => {
    splitIntoChars(el);
    observer.observe(el);
  });
  document.querySelectorAll('[data-reveal="down"]').forEach((el) => {
    observer.observe(el);
  });
}

// ✅ Corrección 1: invocar el reveal al cargar el DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupRevealOnScroll);
} else {
  setupRevealOnScroll();
}

/* ===== WhatsApp — normalizador global ===== */
(() => {
  // Número oficial en formato E.164 (sin +)
  const WA_NUMBER_E164 = "573054422385";
  const DEFAULT_MSG = "Hola EthicaSalud, me gustaría asesoría";

  function buildWaUrl(message = DEFAULT_MSG) {
    return `https://wa.me/${WA_NUMBER_E164}?text=${encodeURIComponent(
      message
    )}`;
  }

  function normalizeWaLink(a) {
    if (!a) return;
    const custom = a.getAttribute("data-wa-text");
    let msg = custom && custom.trim() ? custom.trim() : DEFAULT_MSG;
    try {
      const url = new URL(a.href, location.origin);
      const qText = url.searchParams.get("text");
      if (qText && !custom) msg = qText;
    } catch {}
    a.href = buildWaUrl(msg);
    a.target = "_blank";
    const rel = (a.getAttribute("rel") || "").split(/\s+/);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    a.setAttribute("rel", rel.join(" ").trim());
    if (!a.getAttribute("aria-label"))
      a.setAttribute("aria-label", "Abrir WhatsApp");
    if (!a.getAttribute("title")) a.setAttribute("title", "WhatsApp");
  }

  function retargetAllWaLinks(root = document) {
    const selector = [
      'a[href*="wa.me"]',
      'a[href*="api.whatsapp.com"]',
      "a[data-wa]",
      "a[data-wa-text]",
    ].join(",");
    root.querySelectorAll(selector).forEach(normalizeWaLink);
  }

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest('a[data-wa], a[data-wa-text]');
      if (!a) return;
      if (!a.getAttribute("href")) {
        const msg = (a.getAttribute("data-wa-text") || DEFAULT_MSG).trim();
        a.setAttribute("href", buildWaUrl(msg));
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    },
    { capture: true }
  );

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.("a")) normalizeWaLink(node);
        retargetAllWaLinks(node);
      });
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    retargetAllWaLinks(document);
    mo.observe(document.body, { childList: true, subtree: true });
  });

  window.WA = {
    url: buildWaUrl,
    open(message) {
      window.open(buildWaUrl(message), "_blank", "noopener");
    },
  };
})();

/* ============ Noticias (frontend) — versión solo frontend ============ */

/* ============ Noticias (frontend) — usando API backend ============ */

const noticiasSection = document.getElementById("noticias");

// Base para la API de noticias
const NEWS_API_BASE =
  location.protocol === "file:" ||
  ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : ""; // mismo dominio en producción

// Pedimos muchas (hasta 50) y luego paginamos solo en el frontend
const NEWS_API_URL = `${NEWS_API_BASE}/api/news?page=1&pageSize=50`;

const stateNews = {
  query: "",
  tag: "",
  sort: "recent", // "recent" | "old"
  page: 1,
  pageSize: 6,
  hasMore: true,
  isLoading: false,
};

const els = {
  grid: document.getElementById("newsGrid"),
  search: document.getElementById("newsSearch"),
  chips: document.getElementById("newsChips"),
  sort: document.getElementById("newsSort"),
  loadMore: document.getElementById("loadMoreBtn"),
  tplCard: document.getElementById("newsCardTpl"),
  tplSkeleton: document.getElementById("newsSkeletonTpl"),
};

const safeEl = (k) => {
  if (!els[k]) console.warn(`[Noticias] Falta ${k} en el HTML`);
  return !!els[k];
};

const clearGrid = () => safeEl("grid") && (els.grid.innerHTML = "");

function renderSkeletons(n = 6) {
  if (!safeEl("tplSkeleton") || !safeEl("grid")) return;
  const f = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    f.appendChild(els.tplSkeleton.content.cloneNode(true));
  }
  els.grid.appendChild(f);
}

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const safeHost = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "fuente";
  }
};

const mapTagToLabel = (tag) =>
  (
    {
      "": "General",
      normatividad: "Normatividad",
      habilitacion: "Habilitación",
      auditorias: "Auditorías",
      "seguridad-paciente": "Seguridad del Paciente",
      "guias-oficiales": "Guías oficiales",
    }[tag] ?? "General"
  );

// Aquí guardamos TODO el arreglo de noticias traídas del backend
let ALL_NEWS = [];

/**
 * Normaliza cada item para que el frontend tenga siempre
 * las mismas claves, independientemente de cómo venga del backend.
 */
function normalizeNewsItem(raw) {
  const tagRaw = (raw.tag || raw.category || "").toString().toLowerCase();

  return {
    id: raw.id || raw._id || crypto.randomUUID?.() || String(Date.now()),
    title: raw.title || raw.headline || "Sin título",
    summary: raw.summary || raw.description || "",
    url: raw.url || raw.link || "#",
    tag: tagRaw,
    published_at:
      raw.published_at || raw.publishedAt || raw.date || raw.fecha || null,
    source_url: raw.source_url || raw.sourceUrl || raw.url || raw.link || "#",
    source_name: raw.source_name || raw.source || "",
    cover_image: raw.cover_image || raw.image || raw.image_url || "",
  };
}

/**
 * Carga el JSON desde el backend una sola vez.
 */
async function ensureNewsLoaded() {
  if (ALL_NEWS.length) return;

  console.log("[Noticias] Cargando data desde API…", NEWS_API_URL);
  const res = await fetch(NEWS_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer /api/news`);

  const data = await res.json();

  // el backend devuelve { ok:true, items:[...] }
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.news)
    ? data.news
    : [];

  ALL_NEWS = rawItems.map(normalizeNewsItem);
  console.log("[Noticias] Total noticias cargadas:", ALL_NEWS.length);
}

/**
 * Aplica búsqueda, filtro, orden y paginación sobre ALL_NEWS
 * y pinta el resultado.
 */
function applyAndRenderNews() {
  if (!safeEl("grid") || !safeEl("tplCard")) return;

  clearGrid();

  let items = [...ALL_NEWS];

  // 1) Búsqueda por texto
  if (stateNews.query) {
    const q = stateNews.query.toLowerCase();
    items = items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q)
    );
  }

  // 2) Filtro por tag
  if (stateNews.tag) {
    items = items.filter((it) => it.tag === stateNews.tag);
  }

  // 3) Orden
  items.sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return stateNews.sort === "old" ? da - db : db - da;
  });

  // 4) Paginación interna (solo frontend)
  const start = 0;
  const end = stateNews.page * stateNews.pageSize;
  const pageItems = items.slice(start, end);
  stateNews.hasMore = end < items.length;

  renderNews(pageItems);

  if (safeEl("loadMore")) {
    els.loadMore.hidden = !stateNews.hasMore;
  }

  if (!pageItems.length) {
    const d = document.createElement("div");
    d.style.opacity = ".9";
    d.textContent = "Sin resultados para estos filtros.";
    els.grid.appendChild(d);
  }
}

/**
 * Dibuja tarjetas de noticias.
 */
// Busca esta sección en tu archivo EthicaSalud.js (alrededor de la línea 520-540)
// y reemplázala con este código:

/**
 * Dibuja tarjetas de noticias con manejo robusto de imágenes.
 */
function renderNews(items) {
  const frag = document.createDocumentFragment();

  for (const it of items) {
    const node = els.tplCard.content.cloneNode(true);

    const link = node.querySelector(".cover-link");
    const img = node.querySelector(".cover");
    const title = node.querySelector(".title");
    const summary = node.querySelector(".summary");
    const badge = node.querySelector(".badge");
    const date = node.querySelector(".date");
    const sourceLink = node.querySelector(".source-link");

    // Enlaces y textos
    link.href = it.url;
    title.href = it.url;
    title.textContent = it.title || "Sin título";
    summary.textContent = it.summary || "";
    badge.textContent = mapTagToLabel(it.tag);
    date.textContent = it.published_at ? formatDate(it.published_at) : "";

    sourceLink.href = it.source_url || it.url;
    sourceLink.textContent = it.source_name || safeHost(it.url);

    // ✅ CORRECCIÓN: Manejo robusto de imágenes
    const imageUrl = it.cover_image || "";
    
    console.log(`[Noticia] "${it.title}" - Imagen original:`, imageUrl);
    
    // Configurar atributos de la imagen
    img.alt = it.title || "Noticia de salud";
    img.loading = "lazy"; // Carga lazy para mejor rendimiento
    
    // Si hay URL de imagen, intentar cargarla
    if (imageUrl) {
      img.src = imageUrl;
      
      // Agregar manejador de error para imagen de respaldo
      img.onerror = function() {
        console.warn(`[Noticia] Fallo al cargar imagen: ${imageUrl}`);
        
        // Usar imagen de respaldo basada en el tag
        const fallbackImages = {
          'normatividad': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop',
          'habilitacion': 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&h=500&fit=crop',
          'auditorias': 'https://images.unsplash.com/photo-1554224311-beee460ef5cb?w=800&h=500&fit=crop',
          'seguridad-paciente': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop',
          'guias-oficiales': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=500&fit=crop'
        };
        
        // Asignar imagen de respaldo según el tag, o una genérica
        const fallback = fallbackImages[it.tag] || 
                        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop';
        
        this.src = fallback;
        
        // Si también falla la imagen de respaldo, usar un placeholder sólido
        this.onerror = function() {
          console.error(`[Noticia] También falló imagen de respaldo para: ${it.title}`);
          // Crear un SVG placeholder
          const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E%3Crect fill='%23e2e8f0' width='800' height='500'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='18' fill='%2364748b' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(it.title || 'Imagen no disponible')}%3C/text%3E%3C/svg%3E`;
          this.src = svg;
          this.onerror = null; // Evitar bucle infinito
        };
      };
    } else {
      // Si no hay URL, usar placeholder directamente
      console.warn(`[Noticia] Sin imagen para: ${it.title}`);
      const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E%3Crect fill='%23e2e8f0' width='800' height='500'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='18' fill='%2364748b' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(it.title || 'Imagen no disponible')}%3C/text%3E%3C/svg%3E`;
      img.src = svg;
    }

    frag.appendChild(node);
  }

  els.grid.appendChild(frag);
}

/**
 * Primera carga (o recarga de filtros)
 */
async function fetchNews({ reset = false } = {}) {
  if (stateNews.isLoading) return;
  stateNews.isLoading = true;

  if (reset) {
    stateNews.page = 1;
    stateNews.hasMore = true;
    clearGrid();
    renderSkeletons();
    safeEl("loadMore") && (els.loadMore.hidden = true);
  }

  try {
    await ensureNewsLoaded();
    clearGrid();
    applyAndRenderNews();
  } catch (err) {
    console.error("[Noticias] Error:", err);
    clearGrid();
    if (safeEl("grid")) {
      const d = document.createElement("div");
      d.style.opacity = ".9";
      d.textContent = "No pudimos cargar noticias por ahora.";
      els.grid.appendChild(d);
    }
    safeEl("loadMore") && (els.loadMore.hidden = true);
  } finally {
    stateNews.isLoading = false;
  }
}

/**
 * Botón "Cargar más" — aquí solo aumentamos la página
 * y volvemos a aplicar filtros sobre ALL_NEWS.
 */
function loadMore() {
  if (!stateNews.hasMore || stateNews.isLoading) return;
  stateNews.page += 1;
  applyAndRenderNews();
}

const debounce = (fn, wait = 350) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

function setupNewsEvents() {
  safeEl("search") &&
    els.search.addEventListener(
      "input",
      debounce((e) => {
        stateNews.query = e.target.value.trim();
        fetchNews({ reset: true });
      }, 380)
    );

  safeEl("chips") &&
    els.chips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      els.chips
        .querySelectorAll(".chip")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      stateNews.tag = btn.dataset.tag ?? "";
      fetchNews({ reset: true });
    });

  safeEl("sort") &&
    els.sort.addEventListener("change", () => {
      stateNews.sort = els.sort.value;
      fetchNews({ reset: true });
    });

  safeEl("loadMore") &&
    els.loadMore.addEventListener("click", loadMore);
}

document.addEventListener("DOMContentLoaded", () => {
  setupNewsEvents();
  fetchNews({ reset: true });
});

/* ========= Chat mini ========= */
const CHAT_API_BASE =
  location.protocol === "file:" ? "http://localhost:3000" : "";
(() => {
  const COMPANY = {
    name: "ÉthicaSalud Consultores",
    phones: ["+57 300 111 2233", "+57 601 123 4567"],
    email: "contacto@ethicasalud.com",
    services: [
      "Auditorías y diagnósticos",
      "Habilitación y cumplimiento normativo (Res. 3100/2019)",
      "Seguridad del paciente y mejora continua",
      "Capacitación y documentación",
    ],
    availability: [
      { date: "2025-10-01", slots: ["09:00", "11:00", "15:30"] },
      { date: "2025-10-03", slots: ["10:00", "14:00"] },
      { date: "2025-10-04", slots: ["08:30", "13:00", "16:00"] },
    ],
  };
  const chat = document.getElementById("chatbox");
  const openBtn = document.getElementById("toggleChat");
  const closeBtn = document.getElementById("closeChat");
  const bodyEl = document.getElementById("chatBody");
  const leadForm = document.getElementById("leadForm");
  const chatForm = document.getElementById("chatForm");

  const LS_KEY = "ethica_lead";
  const store = sessionStorage;
  const LEAD_TTL_MS = 0;
  const getLead = () => {
    try {
      return JSON.parse(store.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  };
  const setLead = (obj) =>
    store.setItem(LS_KEY, JSON.stringify({ ...obj, ts: Date.now() }));
  const shouldShowLeadForm = () => {
    const raw = store.getItem(LS_KEY);
    if (!raw) return true;
    if (LEAD_TTL_MS <= 0) return true;
    try {
      const { ts } = JSON.parse(raw);
      return Date.now() - (ts || 0) > LEAD_TTL_MS;
    } catch {
      return true;
    }
  };

  const addMsg = (type, html) => {
    const wrap = document.createElement("div");
    wrap.className = `msg ${type}`;
    const b = document.createElement("div");
    b.className = "bubble";
    b.innerHTML = html;
    wrap.appendChild(b);
    bodyEl.appendChild(wrap);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  };
  const intro = () =>
    addMsg(
      "bot",
      `¡Hola! Soy el asistente de <b>${COMPANY.name}</b>.<br>Te puedo dar información sobre <b>servicios</b>, <b>fechas disponibles</b> y <b>contacto</b>.`
    );

  function replyTo(q) {
    const msg = (q || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    const has = (...w) => w.some((s) => msg.includes(s));
    if (has("servicio", "servicios", "ofrecen", "hacen"))
      return `<b>Servicios:</b><ul>${COMPANY.services
        .map((s) => `<li>${s}</li>`)
        .join("")}</ul>`;
    if (has("fecha", "agenda", "agendar", "disponible", "cita", "disponibilidad")) {
      const lines = COMPANY.availability
        .map((d) => {
          const f = new Date(d.date).toLocaleDateString("es-CO", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          });
          return `<li><b>${f}:</b> ${d.slots.join(" · ")}</li>`;
        })
        .join("");
      return `Estas son nuestras <b>fechas/horas</b> próximas:<ul>${lines}</ul><small>¿Quieres que reservemos un espacio? Escríbenos por WhatsApp o deja otro mensaje aquí.</small>`;
    }
    if (
      has("telefono", "whatsapp", "contacto", "correo", "email", "cel")
    )
      return `<b>Contacto:</b><br>Tel/WhatsApp: ${COMPANY.phones.join(
        " · "
      )}<br>Correo: <a href="mailto:${COMPANY.email}">${
        COMPANY.email
      }</a>`;
    if (has("precio", "costo", "tarifa", "valor"))
      return `Los <b>costos</b> dependen del alcance del servicio. Cuéntanos tu necesidad y te enviamos una propuesta por correo o WhatsApp.`;
    return `Puedo ayudarte con: <b>servicios</b>, <b>fechas</b>, <b>contacto</b> o <b>costos</b>.`;
  }

  const openChat = () => {
    chat.classList.add("is-open");
    chat.setAttribute("aria-hidden", "false");
    openBtn?.setAttribute("aria-expanded", "true");
    bodyEl.scrollTop = bodyEl.scrollHeight;
  };
  const closeChat = () => {
    chat.classList.remove("is-open");
    chat.setAttribute("aria-hidden", "true");
    openBtn?.setAttribute("aria-expanded", "false");
  };

  openBtn?.addEventListener("click", () =>
    chat.classList.contains("is-open") ? closeChat() : openChat()
  );
  closeBtn?.addEventListener("click", closeChat);

  document.addEventListener("DOMContentLoaded", () => {
    if (shouldShowLeadForm()) {
      leadForm?.classList.remove("hidden");
      chatForm?.classList.add("hidden");
      addMsg("bot", "Antes de empezar, ¿me compartes tus datos?");
    } else {
      const lead = getLead();
      leadForm?.classList.add("hidden");
      chatForm?.classList.remove("hidden");
      addMsg("bot", `¡Bienvenido(a), <b>${lead.name || "visitante"}</b>!`);
      intro();
    }
  });

  leadForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("leadName")?.value.trim();
    const email = document.getElementById("leadEmail")?.value.trim();
    const phone = document.getElementById("leadPhone")?.value.trim();
    const trap = document.getElementById("leadTrap")?.value.trim();
    if (trap) return;
    if (!name || !email || !phone) {
      addMsg(
        "bot",
        "Por favor completa <b>nombre, correo y teléfono</b>."
      );
      return;
    }
    setLead({ name, email, phone });
    try {
      await fetch(`${CHAT_API_BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          source: "chatbox",
        }),
      });
    } catch {}
    leadForm.classList.add("hidden");
    chatForm.classList.remove("hidden");
    addMsg("bot", `¡Gracias, <b>${name}</b>! ¿En qué puedo ayudarte hoy?`);
    intro();
  });

  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const text = input?.value.trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);
    if (/fecha|cita|agenda|disponible|disponibilidad/i.test(text)) {
      try {
        const r = await fetch(`${CHAT_API_BASE}/api/availability`);
        if (r.ok) {
          const d = await r.json();
          Array.isArray(d?.availability) &&
            (COMPANY.availability = d.availability);
        }
      } catch {}
    }
    setTimeout(() => addMsg("bot", replyTo(text)), 200);
  });
})();

/* ========= Router (hash) ========= */
(() => {
  const header = document.querySelector("header");
  const q = (sel, ctx = document) => ctx.querySelector(sel);
  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const hide = (el) => el && el.classList.add("is-hidden");
  const show = (el) => el && el.classList.remove("is-hidden");
  const allViews = () => qa("[data-view]");
  const view = (name) => q(`[data-view="${name}"]`);
  const setActiveView = (name) => {
    allViews().forEach(hide);
    show(view(name) || view("inicio"));
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const smoothScrollTo = (el) => {
    const off = header
      ? header.getBoundingClientRect().height + 12
      : 100;
    const top = window.scrollY + el.getBoundingClientRect().top - off;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const scrollToAnchor = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveView("inicio");
    requestAnimationFrame(() => smoothScrollTo(el));
  };

  function setQuienesSub(sub = "conocenos") {
    const root = view("quienes");
    if (!root) return;
    qa("[data-sub-view]", root).forEach(hide);
    show(q(`[data-sub-view="${sub}"]`, root));
    qa(".quienes-subnav a").forEach((a) =>
      a.classList.toggle(
        "active",
        a.getAttribute("href") === `#/quienes/${sub}`
      )
    );
  }
  function setServiciosSub(sub = "ambiental") {
    const root = view("servicios");
    if (!root) return;
    qa("[data-serv-view]", root).forEach(hide);
    show(q(`[data-serv-view="${sub}"]`, root));
    qa(".servicios-subnav a").forEach((a) =>
      a.classList.toggle(
        "active",
        a.getAttribute("href") === `#/servicios/${sub}`
      )
    );
  }

  function applyHash(raw) {
    const hash = raw || location.hash || "#/inicio";

    if (hash === "#empleados") {
      setActiveView("ingresar-empleados");
      requestAnimationFrame(() =>
        document
          .querySelector('#ingresar-empleados input#username')
          ?.focus()
      );
      return;
    }
    if (hash.startsWith("#") && !hash.startsWith("#/")) {
      scrollToAnchor(hash.slice(1));
      return;
    }

    const [root, sub] = hash.replace(/^#\//, "").split("/");

    if (!root || root === "inicio") {
      setActiveView("inicio");
      return;
    }
    if (root === "servicios") {
      setActiveView("servicios");
    
      // ✅ sub-vistas válidas de servicios
      const validSubs = ["ambiental", "calidad", "pacmen", "seguridad"];
    
      // si el sub no es válido, cae por defecto en "ambiental"
      const subKey = validSubs.includes(sub) ? sub : "ambiental";
    
      setServiciosSub(subKey);
      return;
    }
        if (root === "quienes") {
      setActiveView("quienes");
      setQuienesSub(
        ["vision", "mision", "conocenos"].includes(sub)
          ? sub
          : "conocenos"
      );
      return;
    }
    if (root === "contacto" || root === "noticias") {
      scrollToAnchor(root);
      return;
    }
    if (root === "ingresar-empleados") {
      setActiveView("ingresar-empleados");
      requestAnimationFrame(() =>
        document
          .querySelector('#ingresar-empleados input#username')
          ?.focus()
      );
      return;
    }
    if (root === "ingreso-clientes") {
      setActiveView("ingreso-clientes");
      requestAnimationFrame(() =>
        document
          .querySelector('#ingreso-clientes input#c-user')
          ?.focus()
      );
      return;
    }
    setActiveView("inicio");
  }

  document.body.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (href.startsWith("#/")) return;
    e.preventDefault();
    scrollToAnchor(href.slice(1));
  });

  allViews().forEach(hide);
  window.addEventListener("hashchange", () => applyHash(location.hash));
  window.addEventListener("DOMContentLoaded", () =>
    applyHash(location.hash || "#/inicio")
  );
})();

/* ========= Portal Factory (Empleados & Clientes) ========= */
(function () {
  const BASE =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(location.hostname)
      ? "http://localhost:3000"
      : ""; // 👈 mismo dominio en producción

  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }
  const nl2br = (s) =>
    esc(String(s || "")).replace(/\n/g, "<br>");

  const isOffice = (name = "", type = "") => {
    const ext = name.toLowerCase().split(".").pop();
    return (
      ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext) ||
      /officedocument|msword|excel|powerpoint/i.test(type)
    );
  };
  async function openInViewer({ id, name, type }, cfg, token) {
    const API = String(cfg.base).replace(/\/+$/, "");
    if (cfg.signedPattern) {
      try {
        const url = cfg.signedPattern.replace(
          ":id",
          encodeURIComponent(id)
        );
        const r = await fetch(`${API}${url}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const { url: signed } = await r.json();
          if (signed && isOffice(name, type)) {
            const gview = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
              signed
            )}`;
            window.open(gview, "_blank");
            return;
          }
          if (signed) {
            window.open(signed, "_blank");
            return;
          }
        }
      } catch {}
    }
    try {
      const dl = cfg.downloadPattern.replace(
        ":id",
        encodeURIComponent(id)
      );
      const r = await fetch(`${API}${dl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open("", "_blank");
      if (!w) {
        alert("Habilita ventanas emergentes.");
        return;
      }
      const safe = esc(name || "archivo");
      w.document.write(
        `<title>${safe}</title><style>html,body,iframe{height:100%;margin:0;border:0}</style><iframe src="${url}" style="width:100%;height:100%"></iframe>`
      );
      const revoke = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };
      w.addEventListener("beforeunload", revoke);
    } catch {
      alert("No se pudo abrir el archivo.");
    }
  }

  async function downloadFile(id, cfg, token) {
    const API = String(cfg.base).replace(/\/+$/, "");
    if (!confirm("¿Seguro que deseas eliminar este archivo?")) return;
    try {
      const r = await fetch(
        `${API}${cfg.downloadPattern.replace(
          ":id",
          encodeURIComponent(id)
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!r.ok) throw new Error("No se pudo descargar.");
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") || "";
      const m =
        cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
      const fname = m
        ? decodeURIComponent(m[1] || m[2])
        : `archivo-${id}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || "Error al descargar.");
    }
  }

  async function deleteFile(id, cfg, token) {
    const API = String(cfg.base).replace(/\/+$/, "");
    if (!confirm("¿Seguro que deseas eliminar este archivo?")) return;
    try {
      const r = await fetch(
        `${API}${cfg.deletePattern.replace(
          ":id",
          encodeURIComponent(id)
        )}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!r.ok) {
        let msg = "No se pudo eliminar.";
        try {
          msg = (await r.json()).error || msg;
        } catch {}
        throw new Error(msg);
      }
      alert("Archivo eliminado.");
      cfg.loadFiles();
    } catch (e) {
      alert(e.message || "Error al eliminar.");
    }
  }

  function buildPortal({
    rootSel,
    userSel,
    passSel,
    portalSel,
    uploadSel,
    filesSel,
    logoutSel,
    storagePrefix,
  }) {
    const root = document.querySelector(rootSel);
    if (!root) return;

    const base = root.dataset.apiBase || BASE;
    const loginPath = root.dataset.login || "/api/auth/login";
    const filesPath = root.dataset.files || "/api/files";
    const downloadPath =
      root.dataset.download || "/api/files/:id/download";
    const deletePath = root.dataset.delete || "/api/files/:id";
    const signedPath =
      root.dataset.signed || "/api/files/:id/signed-url";

    const cfg = {
      base,
      filesEndpoint: filesPath,
      downloadPattern: downloadPath,
      deletePattern: deletePath,
      signedPattern: signedPath,
      loadFiles: () => loadFiles(),
    };

    const form = root.querySelector(".login-form");
    const btn = root.querySelector(".btn-login");
    const user = root.querySelector(userSel);
    const pass = root.querySelector(passSel);
    const portal = root.querySelector(portalSel);
    const upload = root.querySelector(uploadSel);
    const files = root.querySelector(filesSel);
    const logout = root.querySelector(logoutSel);

    const LS_TOKEN = `${storagePrefix}_token`;
    const LS_USER = `${storagePrefix}_user`;

    const setLoading = (v) => {
      if (!btn) return;
      btn.disabled = v;
      btn.textContent = v ? "Ingresando…" : "LOGIN";
    };
    const showPortal = (show) => {
      root
        .querySelector(".login-card")
        ?.classList.toggle("is-hidden", show);
      portal?.classList.toggle("is-hidden", !show);
      portal?.setAttribute("aria-hidden", String(!show));
    };

    async function login(username, password) {
      const r = await fetch(
        `${String(base).replace(/\/+$/, "")}${loginPath}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );
      if (!r.ok) {
        let msg = "Credenciales inválidas";
        try {
          msg = (await r.json()).error || msg;
        } catch {}
        throw new Error(msg);
      }
      return r.json();
    }

    function enterPortal(token, u) {
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_USER, JSON.stringify(u));
      showPortal(true);
      loadFiles();
    }

    async function loadFiles() {
      files.textContent = "Cargando...";
      const token = localStorage.getItem(LS_TOKEN);
      const API = String(base).replace(/\/+$/, "");
      try {
        const r = await fetch(`${API}${filesPath}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok)
          throw new Error("No se pudieron cargar los archivos.");
        const { items = [] } = await r.json();
        files.innerHTML = "";

        if (!items.length) {
          files.textContent = "Sin archivos por ahora.";
          return;
        }

        const frag = document.createDocumentFragment();
        items.forEach((f) => {
          const id = f.id || f._id || "";
          const name = f.name || "archivo";
          const size =
            typeof f.size === "number"
              ? `${(f.size / 1024).toFixed(1)} KB`
              : f.size || "";
          const type = f.mimetype || f.type || "";
          const upAt = f.uploaded_at || f.createdAt || f.updatedAt;
          const fecha = upAt
            ? new Date(upAt).toLocaleString("es-CO")
            : "";
          const $d = document.createElement("details");
          $d.className = "file-acc";
          $d.innerHTML = `
            <summary>
              <span class="name">${esc(name)}</span>
              <span class="meta">${esc(
                size
              )} · ${esc(type || "sin tipo")}</span>
            </summary>
            <div class="body">
              ${
                f.notes
                  ? `<div class="file-notes">${nl2br(f.notes)}</div>`
                  : ""
              }
              <ul class="file-meta" style="list-style:none; padding:0; margin:0 10px 10px 0; color:#475569">
                ${
                  fecha
                    ? `<li><strong>Subido:</strong> ${esc(
                        fecha
                      )}</li>`
                    : ""
                }
                ${
                  f.uploader
                    ? `<li><strong>Por:</strong> ${esc(
                        f.uploader
                      )}</li>`
                    : ""
                }
                ${
                  Array.isArray(f.allowedRoles)
                    ? `<li><strong>Roles:</strong> ${esc(
                        f.allowedRoles.join(", ") || "N/D"
                      )}</li>`
                    : ""
                }
                ${
                  Array.isArray(f.allowedUsers)
                    ? `<li><strong>Usuarios:</strong> ${esc(
                        f.allowedUsers.join(", ") || "N/D"
                      )}</li>`
                    : ""
                }
              </ul>
              <div class="file-actions">
                <button class="btn-ghost" data-open='${esc(
                  JSON.stringify({ id, name, type })
                )}'>Abrir</button>
                <button class="btn-ghost" data-dl="${esc(
                  id
                )}">Descargar</button>
                <button class="delete-btn" data-id="${esc(
                  id
                )}">Eliminar</button>
              </div>
            </div>
          `;
          frag.appendChild($d);
        });
        files.appendChild(frag);

        files.querySelectorAll("[data-open]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const token = localStorage.getItem(LS_TOKEN);
            try {
              openInViewer(
                JSON.parse(btn.dataset.open),
                cfg,
                token
              );
            } catch {}
          });
        });
        files.querySelectorAll("[data-dl]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const token = localStorage.getItem(LS_TOKEN);
            downloadFile(btn.dataset.dl, cfg, token);
          });
        });
        files.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const token = localStorage.getItem(LS_TOKEN);
            deleteFile(
              btn.dataset.id,
              { ...cfg, loadFiles },
              token
            );
          });
        });
      } catch (e) {
        console.error("[Files] load error:", e);
        files.textContent = e.message || "Error inesperado.";
      }
    }
    cfg.loadFiles = loadFiles;

    upload?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = localStorage.getItem(LS_TOKEN);
      const fd = new FormData(upload);
      if (fd.has("notes"))
        fd.set("notes", String(fd.get("notes") || "").trim());
      const roles = Array.from(
        upload.querySelectorAll(
          'input[name="allowedRoles"]:checked'
        )
      ).map((i) => i.value);
      const users = String(fd.get("allowedUsers") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      fd.set("allowedRoles", JSON.stringify(roles));
      fd.set("allowedUsers", JSON.stringify(users));
      try {
        const r = await fetch(
          `${String(base).replace(/\/+$/, "")}${filesPath}/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          }
        );
        if (!r.ok) {
          let msg = "Error al subir archivo";
          try {
            msg = (await r.json()).error || msg;
          } catch {}
          throw new Error(msg);
        }
        await r.json();
        upload.reset();
        alert("Archivo subido.");
        loadFiles();
      } catch (err) {
        alert(err.message || "No se pudo subir.");
      }
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const us = user?.value.trim();
      const pw = pass?.value.trim();
      if (!us || !pw) {
        alert("Por favor ingresa tu usuario y contraseña.");
        (us ? pass : user)?.focus();
        return;
      }
      setLoading(true);
      try {
        const { token, user: u } = await login(us, pw);
        enterPortal(token, u);
      } catch (err) {
        alert(err.message || "No fue posible iniciar sesión.");
      } finally {
        setLoading(false);
      }
    });

    logout?.addEventListener("click", () => {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USER);
      showPortal(false);
    });

    (function init() {
      const token = localStorage.getItem(LS_TOKEN);
      if (token) {
        showPortal(true);
        loadFiles();
      }
    })();
  }

  buildPortal({
    rootSel: '[data-view="ingresar-empleados"]',
    userSel: "#username",
    passSel: "#password",
    portalSel: "#emp-portal",
    uploadSel: "#emp-upload",
    filesSel: "#emp-files",
    logoutSel: "#emp-logout",
    storagePrefix: "emp",
  });

  buildPortal({
    rootSel: '[data-view="ingreso-clientes"]',
    userSel: "#c-user",
    passSel: "#c-pass",
    portalSel: "#cli-portal",
    uploadSel: "#cli-upload",
    filesSel: "#cli-files",
    logoutSel: "#cli-logout",
    storagePrefix: "cli",
  });
})();

/* ===== Envío del formulario de contacto (ÚNICO y robusto) ===== */
(() => {
  function setupContactForm() {
    const form = document.getElementById("contactForm");
    const status = document.getElementById("formStatus");
    if (!form) return;

    const CONTACT_PATH =
      form.getAttribute("action") || "/api/contacto";

    const API_BASE =
      location.protocol === "file:" ||
      ["localhost", "127.0.0.1"].includes(location.hostname)
        ? "http://localhost:3000"
        : ""; // 👈 mismo dominio en producción

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (status) status.textContent = "Enviando...";

      const fd = new FormData(form);
      const nombre = (fd.get("nombre") || "")
        .toString()
        .trim();
      const email = (fd.get("email") || "").toString().trim();
      const mensaje = (fd.get("mensaje") || "")
        .toString()
        .trim();
      const acepta = form.querySelector(
        'input[name="acepta"]'
      )?.checked;
      const honeypot = (fd.get("website") || "")
        .toString()
        .trim();
      if (honeypot) return;

      if (!nombre || !email || !mensaje || !acepta) {
        if (status)
          status.textContent =
            "Completa nombre, correo, mensaje y acepta la política.";
        return;
      }

      try {
        const resp = await fetch(`${API_BASE}${CONTACT_PATH}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(Object.fromEntries(fd)),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok)
          throw new Error(data.error || `HTTP ${resp.status}`);

        if (status)
          status.textContent =
            "✅ Mensaje enviado con éxito. Te contactaremos pronto.";
        form.reset();
      } catch (err) {
        console.error("Contacto falló:", err);
        if (status)
          status.textContent =
            "❌ No se pudo enviar el mensaje. Intenta más tarde.";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupContactForm);
  } else {
    setupContactForm();
  }
})();
