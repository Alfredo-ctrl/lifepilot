#!/usr/bin/env node

if (process.env.npm_config_loglevel === "silent") process.exit(0);

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code, value) => useColor ? `\x1b[${code}m${value}\x1b[0m` : value;

console.log("");
console.log(`${color(36, "        .")}  ${color(1, "lifepilot")} ${color(90, "is installed")}`);
console.log(`${color(32, "   .----+----.")}  ${color(90, "your calm day planner is ready")}`);
console.log(`${color(33, "  /     |     \\")}  ${color(90, "paste tasks, get a schedule")}`);
console.log(`${color(35, " .      |      .")}`);
console.log(`${color(34, "        .")}`);
console.log("");
console.log(`${color(90, "Start with:")} ${color(1, "lifepilot --demo")}`);
console.log(`${color(90, "Then try:")}   ${color(1, "lifepilot")}`);
console.log("");
