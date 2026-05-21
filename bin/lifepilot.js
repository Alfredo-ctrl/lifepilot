#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { planDay, formatDuration } = require("../src/planner");
const pkg = require("../package.json");

const root = path.resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));
const colorEnabled = process.stdout.isTTY && !process.env.NO_COLOR;

const ink = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
};

function paint(value, tone) {
  return colorEnabled ? `${ink[tone]}${value}${ink.reset}` : value;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log(pkg.version);
    return;
  }

  const options = {
    start: args.start || "08:00",
    end: args.end || "22:30",
    mode: args.mode || "balanced",
    breaks: args.breaks || "normal"
  };

  const input = await getInput(args);
  const plan = planDay(input, options);

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  renderPlan(plan);
}

async function getInput(config) {
  if (config.demo) return fs.readFileSync(path.join(root, "examples", "day.txt"), "utf8");
  if (config.file) return fs.readFileSync(path.resolve(process.cwd(), config.file), "utf8");
  if (!process.stdin.isTTY) return fs.readFileSync(0, "utf8");
  return readInteractive();
}

function readInteractive() {
  printShellHeader();
  console.log(paint("Drop your messy task list here. Empty line = build the day.", "gray"));
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: paint("> ", "green")
  });

  const lines = [];
  rl.prompt();

  return new Promise(resolve => {
    rl.on("line", line => {
      if (!line.trim()) {
        rl.close();
        resolve(lines.join("\n"));
        return;
      }
      lines.push(line.trim());
      rl.prompt();
    });
  });
}

function renderPlan(plan) {
  printShellHeader();

  const summary = plan.summary;
  console.log(`${paint("Load", "gray")} ${bar(summary.load)} ${paint(`${summary.load}%`, "bold")} ${paint(summary.tone, toneColor(summary.tone))}`);
  console.log(`${paint("Focus", "gray")} ${summary.focusBlocks} blocks   ${paint("Open time", "gray")} ${formatDuration(summary.openMinutes)}`);
  console.log("");
  console.log(paint(summary.brief, "bold"));
  console.log("");

  console.log(section("Timeline"));
  plan.timeline.forEach(block => {
    const range = `${block.start}-${block.end}`;
    const marker = block.type === "task" ? "#" : block.type === "break" ? "-" : ".";
    const title = block.overflow ? `${block.title} (over)` : block.title;
    console.log(`${paint(range.padEnd(12), "gray")} ${paint(marker, markerColor(block.type))} ${title}`);
  });

  console.log("");
  console.log(section("Top Focus"));
  const focus = summary.mainFocus.length ? summary.mainFocus : plan.tasks.slice(0, 3).map(task => task.title);
  focus.forEach((item, index) => console.log(`${paint(String(index + 1).padStart(2, "0"), "blue")} ${item}`));

  console.log("");
  console.log(section("Suggestions"));
  summary.suggestions.forEach(item => console.log(`${paint("-", "yellow")} ${item}`));
  console.log("");
}

function printShellHeader() {
  const brand = [
    "        .",
    "   .----+----.",
    "  /     |     \\",
    " .      |      .",
    "        ."
  ];

  console.log("");
  console.log(`${paint(brand[0], "cyan")}  ${paint("lifepilot", "bold")} ${paint(`v${pkg.version}`, "gray")}`);
  console.log(`${paint(brand[1], "green")}  ${paint("plan the day without fighting your brain", "gray")}`);
  console.log(`${paint(brand[2], "yellow")}  ${paint("type tasks, get a calm schedule", "gray")}`);
  console.log(`${paint(brand[3], "magenta")}  ${paint("try:", "gray")} ${paint("lifepilot --demo", "bold")}`);
  console.log(`${paint(brand[4], "blue")}`);
  console.log("");
}

function section(label) {
  return paint(label.toUpperCase(), "blue");
}

function bar(load) {
  const capped = Math.min(100, Math.max(0, load));
  const filled = Math.round(capped / 10);
  return `${paint("[".padEnd(1), "gray")}${paint("=".repeat(filled), toneColor(loadTone(load)))}${paint(".".repeat(10 - filled), "gray")}${paint("]", "gray")}`;
}

function loadTone(load) {
  if (load >= 105) return "overloaded";
  if (load >= 82) return "full";
  if (load >= 50) return "steady";
  return "light";
}

function toneColor(tone) {
  return tone === "overloaded" ? "yellow" : tone === "full" ? "yellow" : tone === "steady" ? "green" : "blue";
}

function markerColor(type) {
  if (type === "break") return "yellow";
  if (type === "open") return "gray";
  return "green";
}

function printHelp() {
  printShellHeader();
  console.log("Usage");
  console.log("  lifepilot");
  console.log("  lifepilot --demo");
  console.log("  lifepilot --file examples/day.txt");
  console.log("  lifepilot --file examples/day.txt --json");
  console.log("");
  console.log("Options");
  console.log("  --start HH:MM       Day start time");
  console.log("  --end HH:MM         Day end time");
  console.log("  --mode MODE         balanced, student, career, light");
  console.log("  --breaks MODE       normal, deep, gentle");
  console.log("  --json              Print the full plan as JSON");
  console.log("");
  console.log("Install from GitHub");
  console.log("  npm install -g --foreground-scripts https://github.com/Alfredo-ctrl/lifepilot/archive/refs/heads/main.tar.gz");
  console.log("  lifepilot --demo");
  console.log("");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (item === "--help" || item === "-h") parsed.help = true;
    else if (item === "--version" || item === "-v") parsed.version = true;
    else if (item === "--json") parsed.json = true;
    else if (item === "--demo") parsed.demo = true;
    else if (item === "--file" || item === "-f") parsed.file = values[++index];
    else if (item === "--start") parsed.start = values[++index];
    else if (item === "--end") parsed.end = values[++index];
    else if (item === "--mode") parsed.mode = values[++index];
    else if (item === "--breaks") parsed.breaks = values[++index];
  }
  return parsed;
}

main().catch(error => {
  console.error(`lifepilot: ${error.message}`);
  process.exit(1);
});
