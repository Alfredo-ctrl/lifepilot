const sample = `class at 10
study python for 2 hours
finish portfolio section
send my resume to three companies
go to the gym
reply to pending messages
buy groceries
sleep early`;

const el = {
  input: document.getElementById("task-input"),
  start: document.getElementById("start-time"),
  end: document.getElementById("end-time"),
  mode: document.getElementById("mode-select"),
  breaks: document.getElementById("break-select"),
  plan: document.getElementById("plan-btn"),
  sample: document.getElementById("sample-btn"),
  copy: document.getElementById("copy-btn"),
  json: document.getElementById("json-btn"),
  date: document.getElementById("plan-date"),
  load: document.getElementById("load-score"),
  focus: document.getElementById("focus-count"),
  free: document.getElementById("free-time"),
  brief: document.getElementById("brief"),
  timeline: document.getElementById("timeline"),
  timelineCount: document.getElementById("timeline-count"),
  tasks: document.getElementById("task-list"),
  taskCount: document.getElementById("task-count"),
  suggestions: document.getElementById("suggestions"),
  suggestionCount: document.getElementById("suggestion-count"),
  toast: document.getElementById("toast")
};

let currentPlan = null;
let uiLang = "en";

const uiCopy = {
  en: {
    brand: "lifepilot",
    tagline: "Plan the day you actually have",
    loadSample: "Load sample",
    copyPlan: "Copy plan",
    exportJson: "Export JSON",
    startHere: "Start here",
    headline: "Drop the messy list. Get a clear day.",
    brainDump: "Brain dump",
    dayStarts: "Day starts",
    dayEnds: "Day ends",
    mode: "Mode",
    breakRhythm: "Break rhythm",
    buildPlan: "Build my plan",
    todayPlan: "Today plan",
    load: "Load",
    focusBlocks: "Focus blocks",
    freeTime: "Free time",
    timeline: "Timeline",
    tasks: "Tasks",
    suggestions: "Suggestions",
    emptyBrief: "Type a few things you need to do, then build a plan.",
    blocks: "blocks",
    items: "items",
    notes: "notes",
    copied: "Plan copied.",
    copyFailed: "Copy failed. Select and copy manually.",
    exported: "JSON exported.",
    sampleLoaded: "Sample loaded."
  },
  es: {
    brand: "lifepilot",
    tagline: "Planea el dia que si tienes",
    loadSample: "Cargar ejemplo",
    copyPlan: "Copiar plan",
    exportJson: "Exportar JSON",
    startHere: "Empieza aqui",
    headline: "Pega tu lista caotica. Recibe un dia claro.",
    brainDump: "Lista libre",
    dayStarts: "Inicio",
    dayEnds: "Final",
    mode: "Modo",
    breakRhythm: "Ritmo de pausas",
    buildPlan: "Crear mi plan",
    todayPlan: "Plan de hoy",
    load: "Carga",
    focusBlocks: "Bloques foco",
    freeTime: "Tiempo libre",
    timeline: "Agenda",
    tasks: "Tareas",
    suggestions: "Sugerencias",
    emptyBrief: "Escribe algunas cosas por hacer y genera tu plan.",
    blocks: "bloques",
    items: "tareas",
    notes: "notas",
    copied: "Plan copiado.",
    copyFailed: "No se pudo copiar. Selecciona y copia manualmente.",
    exported: "JSON exportado.",
    sampleLoaded: "Ejemplo cargado."
  }
};

function applyUiLanguage(nextLang) {
  uiLang = nextLang;
  document.documentElement.lang = uiLang;
  const toggle = document.querySelector(".language-switch");
  if (toggle) toggle.setAttribute("aria-pressed", String(uiLang === "es"));
  document.querySelectorAll("[data-i18n]").forEach(node => {
    const value = uiCopy[uiLang][node.dataset.i18n];
    if (value) node.textContent = value;
  });
  if (currentPlan) render(currentPlan);
  else el.brief.textContent = uiCopy[uiLang].emptyBrief;
}

function build() {
  currentPlan = LifePilot.planDay(el.input.value, {
    start: el.start.value,
    end: el.end.value,
    mode: el.mode.value,
    breaks: el.breaks.value
  });
  render(currentPlan);
}

function render(plan) {
  const locale = uiLang === "es" ? "es-MX" : "en-US";
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  el.date.textContent = date;
  el.load.textContent = `${plan.summary.load}%`;
  el.focus.textContent = plan.summary.focusBlocks;
  el.free.textContent = LifePilot.formatDuration(plan.summary.openMinutes);
  el.brief.textContent = plan.summary.brief;
  el.timelineCount.textContent = `${plan.timeline.length} ${uiCopy[uiLang].blocks}`;
  el.taskCount.textContent = `${plan.tasks.length} ${uiCopy[uiLang].items}`;
  el.suggestionCount.textContent = `${plan.summary.suggestions.length} ${uiCopy[uiLang].notes}`;
  renderTimeline(plan.timeline);
  renderTasks(plan.tasks);
  renderSuggestions(plan.summary.suggestions);
}

function renderTimeline(blocks) {
  el.timeline.innerHTML = "";
  blocks.forEach(block => {
    const item = document.createElement("article");
    item.className = `time-block ${block.type}`;
    item.style.setProperty("--block-color", block.color);
    item.innerHTML = `
      <time>${block.start} - ${block.end}</time>
      <div>
        <strong>${escapeHtml(block.title)}</strong>
        <span>${block.label} - ${LifePilot.formatDuration(block.duration)}${block.overflow ? " - over day limit" : ""}</span>
      </div>
    `;
    el.timeline.appendChild(item);
  });
}

function renderTasks(tasks) {
  el.tasks.innerHTML = "";
  tasks.forEach(task => {
    const item = document.createElement("article");
    item.className = "task-chip";
    item.style.setProperty("--task-color", task.color);
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <span>${task.label} - ${LifePilot.formatDuration(task.duration)}</span>
      </div>
      <span class="priority">P${task.priority}</span>
    `;
    el.tasks.appendChild(item);
  });
}

function renderSuggestions(suggestions) {
  el.suggestions.innerHTML = "";
  suggestions.forEach(text => {
    const item = document.createElement("p");
    item.textContent = text;
    el.suggestions.appendChild(item);
  });
}

function copyPlan() {
  if (!currentPlan) build();
  navigator.clipboard.writeText(currentPlan.text)
    .then(() => showToast(uiCopy[uiLang].copied))
    .catch(() => showToast(uiCopy[uiLang].copyFailed));
}

function exportJson() {
  if (!currentPlan) build();
  const blob = new Blob([JSON.stringify(currentPlan, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lifepilot-plan.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(uiCopy[uiLang].exported);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    el.toast.hidden = true;
  }, 2300);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

el.plan.addEventListener("click", build);
el.sample.addEventListener("click", () => {
  el.input.value = sample;
  build();
  showToast(uiCopy[uiLang].sampleLoaded);
});
el.copy.addEventListener("click", copyPlan);
el.json.addEventListener("click", exportJson);
[el.start, el.end, el.mode, el.breaks].forEach(input => input.addEventListener("change", build));
document.querySelector(".language-switch")?.addEventListener("click", () => {
  applyUiLanguage(uiLang === "en" ? "es" : "en");
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  });
}, { threshold: 0.16 });

document.querySelectorAll("[data-reveal]").forEach(node => revealObserver.observe(node));
applyUiLanguage(uiLang);
el.input.value = sample;
build();
