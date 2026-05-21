(function (root) {
  const categories = [
    {
      id: "study",
      label: "Study",
      keywords: ["study", "class", "course", "read", "learn", "exam", "homework", "python", "math", "notes"],
      color: "#4464ad",
      energy: 4,
      best: "morning"
    },
    {
      id: "work",
      label: "Work",
      keywords: ["work", "project", "client", "finish", "build", "code", "portfolio", "resume", "cv", "apply", "send"],
      color: "#2f8f83",
      energy: 4,
      best: "morning"
    },
    {
      id: "message",
      label: "Messages",
      keywords: ["email", "reply", "message", "call", "text", "dm", "follow up", "whatsapp"],
      color: "#9b5f2e",
      energy: 2,
      best: "afternoon"
    },
    {
      id: "errand",
      label: "Errand",
      keywords: ["buy", "groceries", "bank", "appointment", "pickup", "clean", "laundry", "pay"],
      color: "#b55d68",
      energy: 2,
      best: "afternoon"
    },
    {
      id: "health",
      label: "Health",
      keywords: ["gym", "run", "walk", "train", "doctor", "meal", "cook", "water", "stretch"],
      color: "#4f8f45",
      energy: 3,
      best: "evening"
    },
    {
      id: "rest",
      label: "Rest",
      keywords: ["sleep", "rest", "break", "relax", "meditate", "early"],
      color: "#607083",
      energy: 1,
      best: "night"
    }
  ];

  const modeProfiles = {
    balanced: { focus: 1, health: 1, rest: 1 },
    student: { study: 1.25, focus: 1.1, rest: 1 },
    career: { work: 1.25, message: 1.1, focus: 1.1 },
    light: { rest: 1.25, health: 1.1, focus: 0.8 }
  };

  const breakProfiles = {
    normal: { every: 120, duration: 15 },
    deep: { every: 150, duration: 20 },
    gentle: { every: 90, duration: 12 }
  };

  function planDay(input, options) {
    const config = {
      start: options?.start || "08:00",
      end: options?.end || "22:30",
      mode: options?.mode || "balanced",
      breaks: options?.breaks || "normal"
    };
    const tasks = parseTasks(input, config.mode);
    const sorted = orderTasks(tasks);
    const timeline = buildTimeline(sorted, config);
    const summary = summarize(tasks, timeline, config);
    return {
      createdAt: new Date().toISOString(),
      options: config,
      tasks,
      timeline,
      summary,
      text: formatPlanText(tasks, timeline, summary)
    };
  }

  function parseTasks(input, mode) {
    const lines = String(input || "")
      .split(/\r?\n|;/)
      .map(line => line.trim())
      .filter(Boolean);
    const profile = modeProfiles[mode] || modeProfiles.balanced;

    return lines.map((line, index) => {
      const category = detectCategory(line);
      const explicit = detectDuration(line);
      const fixedTime = detectTime(line);
      const baseDuration = explicit || estimateDuration(line, category);
      const priority = detectPriority(line, category, fixedTime, profile);
      const energy = clamp(category.energy + (baseDuration > 90 ? 1 : 0), 1, 5);
      return {
        id: `task-${index + 1}`,
        title: cleanTitle(line),
        raw: line,
        category: category.id,
        label: category.label,
        color: category.color,
        duration: baseDuration,
        priority,
        energy,
        fixedTime,
        best: category.best
      };
    });
  }

  function detectCategory(line) {
    const value = line.toLowerCase();
    let best = categories[categories.length - 1];
    let score = -1;

    categories.forEach(category => {
      const hits = category.keywords.reduce((sum, keyword) => value.includes(keyword) ? sum + 1 : sum, 0);
      if (hits > score) {
        score = hits;
        best = category;
      }
    });

    return score > 0 ? best : {
      id: "personal",
      label: "Personal",
      keywords: [],
      color: "#7a6599",
      energy: 2,
      best: "afternoon"
    };
  }

  function detectDuration(line) {
    const value = line.toLowerCase();
    const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
    const minuteMatch = value.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
    if (hourMatch) return Math.max(15, Math.round(Number(hourMatch[1]) * 60));
    if (minuteMatch) return Math.max(10, Number(minuteMatch[1]));
    return null;
  }

  function detectTime(line) {
    const value = line.toLowerCase();
    const match = value.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridian = match[3];
    if (hour > 24 || minute > 59) return null;
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    if (!meridian && hour >= 1 && hour <= 6) hour += 12;
    return minutesToClock(hour * 60 + minute);
  }

  function estimateDuration(line, category) {
    const words = line.split(/\s+/).length;
    const base = {
      study: 90,
      work: 75,
      message: 25,
      errand: 45,
      health: 60,
      rest: 45,
      personal: 40
    }[category.id] || 40;
    const extra = words > 8 ? 15 : 0;
    return base + extra;
  }

  function detectPriority(line, category, fixedTime, profile) {
    const value = line.toLowerCase();
    let score = 2;
    if (fixedTime) score += 2;
    if (value.includes("urgent") || value.includes("today") || value.includes("deadline")) score += 2;
    if (value.includes("finish") || value.includes("send") || value.includes("class")) score += 1;
    if (category.id === "rest") score -= 1;
    if (profile[category.id]) score += profile[category.id] - 1;
    return clamp(Math.round(score), 1, 5);
  }

  function cleanTitle(line) {
    return line
      .replace(/\bfor\s+\d+(?:\.\d+)?\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, char => char.toUpperCase());
  }

  function orderTasks(tasks) {
    const windowRank = { morning: 0, afternoon: 1, evening: 2, night: 3 };
    return [...tasks].sort((a, b) => {
      if (a.fixedTime && b.fixedTime) return clockToMinutes(a.fixedTime) - clockToMinutes(b.fixedTime);
      if (a.fixedTime) return -1;
      if (b.fixedTime) return 1;
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.energy !== a.energy) return b.energy - a.energy;
      return windowRank[a.best] - windowRank[b.best];
    });
  }

  function buildTimeline(tasks, config) {
    const timeline = [];
    const breaks = breakProfiles[config.breaks] || breakProfiles.normal;
    let cursor = clockToMinutes(config.start);
    const end = clockToMinutes(config.end);
    let focusSinceBreak = 0;

    tasks.forEach(task => {
      if (task.fixedTime) {
        const fixedStart = clockToMinutes(task.fixedTime);
        if (fixedStart > cursor) {
          addOpenBlock(timeline, cursor, fixedStart);
          cursor = fixedStart;
          focusSinceBreak = 0;
        }
      }

      if (focusSinceBreak >= breaks.every && task.category !== "rest") {
        const breakEnd = Math.min(end, cursor + breaks.duration);
        timeline.push(makeBlock("break", "Reset break", cursor, breakEnd, "#607083", "Break"));
        cursor = breakEnd;
        focusSinceBreak = 0;
      }

      const finish = cursor + task.duration;
      timeline.push({
        id: task.id,
        type: "task",
        title: task.title,
        category: task.category,
        label: task.label,
        color: task.color,
        start: minutesToClock(cursor),
        end: minutesToClock(finish),
        duration: task.duration,
        priority: task.priority,
        energy: task.energy,
        overflow: finish > end
      });
      cursor = finish;
      focusSinceBreak += task.energy >= 3 ? task.duration : Math.round(task.duration / 2);
    });

    if (cursor < end) addOpenBlock(timeline, cursor, end);
    return timeline;
  }

  function addOpenBlock(timeline, start, end) {
    if (end - start < 20) return;
    timeline.push(makeBlock("open", "Open space", start, end, "#8aa1b2", "Buffer"));
  }

  function makeBlock(type, title, start, end, color, label) {
    return {
      id: `${type}-${start}`,
      type,
      title,
      label,
      color,
      start: minutesToClock(start),
      end: minutesToClock(end),
      duration: end - start,
      priority: 0,
      energy: 0,
      overflow: false
    };
  }

  function summarize(tasks, timeline, config) {
    const end = clockToMinutes(config.end);
    const taskMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
    const breakMinutes = timeline.filter(block => block.type === "break").reduce((sum, block) => sum + block.duration, 0);
    const openMinutes = timeline.filter(block => block.type === "open").reduce((sum, block) => sum + block.duration, 0);
    const overflowMinutes = timeline.reduce((sum, block) => {
      const blockEnd = clockToMinutes(block.end);
      return sum + Math.max(0, blockEnd - end);
    }, 0);
    const focusBlocks = tasks.filter(task => task.energy >= 3).length;
    const load = clamp(Math.round((taskMinutes / Math.max(1, clockToMinutes(config.end) - clockToMinutes(config.start))) * 100 + focusBlocks * 3), 0, 140);
    const suggestions = buildSuggestions(tasks, load, openMinutes, overflowMinutes);
    const mainFocus = tasks.filter(task => task.priority >= 4).slice(0, 3).map(task => task.title);
    return {
      taskMinutes,
      breakMinutes,
      openMinutes,
      overflowMinutes,
      focusBlocks,
      load,
      tone: load >= 105 ? "overloaded" : load >= 82 ? "full" : load >= 50 ? "steady" : "light",
      mainFocus,
      suggestions,
      brief: buildBrief(tasks, load, openMinutes, overflowMinutes)
    };
  }

  function buildBrief(tasks, load, openMinutes, overflowMinutes) {
    if (!tasks.length) return "Add tasks to build a plan.";
    if (overflowMinutes > 0) return `This day is too full by ${formatDuration(overflowMinutes)}. Move one low priority item to tomorrow.`;
    if (load >= 105) return "This plan is intense. Protect breaks and keep only the top three outcomes.";
    if (load >= 82) return "This is a full but workable day. Start with the highest energy task first.";
    if (openMinutes >= 180) return "This day has room. Use the open space for recovery or one optional task.";
    return "This plan has a healthy rhythm. Keep the first focus block distraction free.";
  }

  function buildSuggestions(tasks, load, openMinutes, overflowMinutes) {
    const notes = [];
    const hasHealth = tasks.some(task => task.category === "health");
    const hasRest = tasks.some(task => task.category === "rest");
    const heavy = tasks.filter(task => task.energy >= 4);
    if (overflowMinutes > 0) notes.push(`Move ${formatDuration(overflowMinutes)} out of today.`);
    if (heavy.length >= 3) notes.push("Put the hardest task before messages or errands.");
    if (!hasHealth && load >= 70) notes.push("Add a short walk, stretch, or meal block.");
    if (!hasRest && load >= 85) notes.push("Add a real shutdown block before sleep.");
    if (openMinutes < 45 && load >= 80) notes.push("Leave at least one buffer window.");
    if (!notes.length) notes.push("The plan is balanced enough to start.");
    return notes;
  }

  function formatPlanText(tasks, timeline, summary) {
    const lines = [];
    lines.push("lifepilot daily plan");
    lines.push("");
    lines.push(`Load: ${summary.load}% (${summary.tone})`);
    lines.push(`Focus blocks: ${summary.focusBlocks}`);
    lines.push(`Open time: ${formatDuration(summary.openMinutes)}`);
    lines.push("");
    lines.push("Timeline");
    timeline.forEach(block => {
      lines.push(`${block.start}-${block.end}  ${block.title}`);
    });
    lines.push("");
    lines.push("Top focus");
    (summary.mainFocus.length ? summary.mainFocus : tasks.slice(0, 3).map(task => task.title)).forEach(item => {
      lines.push(`- ${item}`);
    });
    lines.push("");
    lines.push("Suggestions");
    summary.suggestions.forEach(item => {
      lines.push(`- ${item}`);
    });
    return lines.join("\n");
  }

  function clockToMinutes(clock) {
    const parts = String(clock || "00:00").split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function minutesToClock(minutes) {
    const normalized = Math.max(0, Math.round(minutes));
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function formatDuration(minutes) {
    const value = Math.max(0, Math.round(minutes));
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (!hours) return `${mins}m`;
    if (!mins) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  const api = {
    planDay,
    formatDuration,
    clockToMinutes,
    minutesToClock
  };

  root.LifePilot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
