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
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date());
  el.date.textContent = date;
  el.load.textContent = `${plan.summary.load}%`;
  el.focus.textContent = plan.summary.focusBlocks;
  el.free.textContent = LifePilot.formatDuration(plan.summary.openMinutes);
  el.brief.textContent = plan.summary.brief;
  el.timelineCount.textContent = `${plan.timeline.length} blocks`;
  el.taskCount.textContent = `${plan.tasks.length} items`;
  el.suggestionCount.textContent = `${plan.summary.suggestions.length} notes`;
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
    .then(() => showToast("Plan copied."))
    .catch(() => showToast("Copy failed. Select and copy manually."));
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
  showToast("JSON exported.");
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
  showToast("Sample loaded.");
});
el.copy.addEventListener("click", copyPlan);
el.json.addEventListener("click", exportJson);
[el.start, el.end, el.mode, el.breaks].forEach(input => input.addEventListener("change", build));
el.input.value = sample;
build();
