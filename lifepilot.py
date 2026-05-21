import argparse
import json
import re
from datetime import datetime


CATEGORIES = [
    ("study", "Study", ["study", "class", "course", "read", "learn", "exam", "homework", "python", "math", "notes"], 4, "morning"),
    ("work", "Work", ["work", "project", "client", "finish", "build", "code", "portfolio", "resume", "cv", "apply", "send"], 4, "morning"),
    ("message", "Messages", ["email", "reply", "message", "call", "text", "dm", "follow up", "whatsapp"], 2, "afternoon"),
    ("errand", "Errand", ["buy", "groceries", "bank", "appointment", "pickup", "clean", "laundry", "pay"], 2, "afternoon"),
    ("health", "Health", ["gym", "run", "walk", "train", "doctor", "meal", "cook", "water", "stretch"], 3, "evening"),
    ("rest", "Rest", ["sleep", "rest", "break", "relax", "meditate", "early"], 1, "night"),
]

MODES = {
    "balanced": {"focus": 1, "health": 1, "rest": 1},
    "student": {"study": 1.25, "focus": 1.1, "rest": 1},
    "career": {"work": 1.25, "message": 1.1, "focus": 1.1},
    "light": {"rest": 1.25, "health": 1.1, "focus": 0.8},
}

BREAKS = {
    "normal": {"every": 120, "duration": 15},
    "deep": {"every": 150, "duration": 20},
    "gentle": {"every": 90, "duration": 12},
}


def clamp(value, low, high):
    return min(high, max(low, value))


def clock_to_minutes(clock):
    hour, minute = [int(part) for part in clock.split(":")]
    return hour * 60 + minute


def minutes_to_clock(minutes):
    minutes = max(0, round(minutes))
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def format_duration(minutes):
    minutes = max(0, round(minutes))
    hours = minutes // 60
    mins = minutes % 60
    if hours == 0:
        return f"{mins}m"
    if mins == 0:
        return f"{hours}h"
    return f"{hours}h {mins}m"


def detect_category(line):
    lowered = line.lower()
    best = None
    best_score = -1
    for category in CATEGORIES:
        score = sum(1 for keyword in category[2] if keyword in lowered)
        if score > best_score:
            best = category
            best_score = score
    if best_score > 0:
        return best
    return ("personal", "Personal", [], 2, "afternoon")


def detect_duration(line):
    lowered = line.lower()
    hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)", lowered)
    minute_match = re.search(r"(\d+)\s*(m|min|mins|minute|minutes)", lowered)
    if hour_match:
        return max(15, round(float(hour_match.group(1)) * 60))
    if minute_match:
        return max(10, int(minute_match.group(1)))
    return None


def detect_time(line):
    lowered = line.lower()
    match = re.search(r"\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", lowered)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridian = match.group(3)
    if hour > 24 or minute > 59:
        return None
    if meridian == "pm" and hour < 12:
        hour += 12
    if meridian == "am" and hour == 12:
        hour = 0
    if not meridian and 1 <= hour <= 6:
        hour += 12
    return minutes_to_clock(hour * 60 + minute)


def estimate_duration(category_id, words):
    base = {
        "study": 90,
        "work": 75,
        "message": 25,
        "errand": 45,
        "health": 60,
        "rest": 45,
        "personal": 40,
    }.get(category_id, 40)
    return base + (15 if words > 8 else 0)


def clean_title(line):
    title = re.sub(r"\bfor\s+\d+(?:\.\d+)?\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b", "", line, flags=re.I)
    title = re.sub(r"\s+", " ", title).strip()
    return title[:1].upper() + title[1:]


def parse_tasks(text, mode):
    lines = [line.strip() for line in re.split(r"\n|;", text) if line.strip()]
    profile = MODES.get(mode, MODES["balanced"])
    tasks = []
    for index, line in enumerate(lines, 1):
        category_id, label, keywords, base_energy, best = detect_category(line)
        duration = detect_duration(line) or estimate_duration(category_id, len(line.split()))
        fixed_time = detect_time(line)
        lowered = line.lower()
        priority = 2
        if fixed_time:
            priority += 2
        if any(word in lowered for word in ["urgent", "today", "deadline"]):
            priority += 2
        if any(word in lowered for word in ["finish", "send", "class"]):
            priority += 1
        if category_id == "rest":
            priority -= 1
        if category_id in profile:
            priority += profile[category_id] - 1
        tasks.append({
            "id": f"task-{index}",
            "title": clean_title(line),
            "raw": line,
            "category": category_id,
            "label": label,
            "duration": duration,
            "priority": clamp(round(priority), 1, 5),
            "energy": clamp(base_energy + (1 if duration > 90 else 0), 1, 5),
            "fixedTime": fixed_time,
            "best": best,
        })
    return tasks


def order_tasks(tasks):
    rank = {"morning": 0, "afternoon": 1, "evening": 2, "night": 3}
    return sorted(tasks, key=lambda task: (
        0 if task["fixedTime"] else 1,
        clock_to_minutes(task["fixedTime"]) if task["fixedTime"] else 0,
        -task["priority"],
        -task["energy"],
        rank.get(task["best"], 2),
    ))


def make_block(kind, title, start, end, label):
    return {
        "id": f"{kind}-{start}",
        "type": kind,
        "title": title,
        "label": label,
        "start": minutes_to_clock(start),
        "end": minutes_to_clock(end),
        "duration": end - start,
        "overflow": False,
    }


def build_timeline(tasks, start, end, break_mode):
    timeline = []
    rhythm = BREAKS.get(break_mode, BREAKS["normal"])
    cursor = clock_to_minutes(start)
    day_end = clock_to_minutes(end)
    focus_since_break = 0
    for task in order_tasks(tasks):
        if task["fixedTime"]:
            fixed_start = clock_to_minutes(task["fixedTime"])
            if fixed_start > cursor:
                add_open_block(timeline, cursor, fixed_start)
                cursor = fixed_start
                focus_since_break = 0
        if focus_since_break >= rhythm["every"] and task["category"] != "rest":
            break_end = min(day_end, cursor + rhythm["duration"])
            timeline.append(make_block("break", "Reset break", cursor, break_end, "Break"))
            cursor = break_end
            focus_since_break = 0
        finish = cursor + task["duration"]
        timeline.append({
            "id": task["id"],
            "type": "task",
            "title": task["title"],
            "label": task["label"],
            "start": minutes_to_clock(cursor),
            "end": minutes_to_clock(finish),
            "duration": task["duration"],
            "priority": task["priority"],
            "energy": task["energy"],
            "overflow": finish > day_end,
        })
        cursor = finish
        focus_since_break += task["duration"] if task["energy"] >= 3 else round(task["duration"] / 2)
    if cursor < day_end:
        add_open_block(timeline, cursor, day_end)
    return timeline


def add_open_block(timeline, start, end):
    if end - start >= 20:
        timeline.append(make_block("open", "Open space", start, end, "Buffer"))


def summarize(tasks, timeline, start, end):
    day_minutes = max(1, clock_to_minutes(end) - clock_to_minutes(start))
    task_minutes = sum(task["duration"] for task in tasks)
    open_minutes = sum(block["duration"] for block in timeline if block["type"] == "open")
    focus_blocks = sum(1 for task in tasks if task["energy"] >= 3)
    overflow = sum(max(0, clock_to_minutes(block["end"]) - clock_to_minutes(end)) for block in timeline)
    load = clamp(round((task_minutes / day_minutes) * 100 + focus_blocks * 3), 0, 140)
    tone = "overloaded" if load >= 105 else "full" if load >= 82 else "steady" if load >= 50 else "light"
    suggestions = build_suggestions(tasks, load, open_minutes, overflow)
    return {
        "taskMinutes": task_minutes,
        "openMinutes": open_minutes,
        "overflowMinutes": overflow,
        "focusBlocks": focus_blocks,
        "load": load,
        "tone": tone,
        "mainFocus": [task["title"] for task in tasks if task["priority"] >= 4][:3],
        "suggestions": suggestions,
        "brief": build_brief(tasks, load, open_minutes, overflow),
    }


def build_brief(tasks, load, open_minutes, overflow):
    if not tasks:
        return "Add tasks to build a plan."
    if overflow > 0:
        return f"This day is too full by {format_duration(overflow)}. Move one low priority item to tomorrow."
    if load >= 105:
        return "This plan is intense. Protect breaks and keep only the top three outcomes."
    if load >= 82:
        return "This is a full but workable day. Start with the highest energy task first."
    if open_minutes >= 180:
        return "This day has room. Use the open space for recovery or one optional task."
    return "This plan has a healthy rhythm. Keep the first focus block distraction free."


def build_suggestions(tasks, load, open_minutes, overflow):
    notes = []
    has_health = any(task["category"] == "health" for task in tasks)
    has_rest = any(task["category"] == "rest" for task in tasks)
    heavy = [task for task in tasks if task["energy"] >= 4]
    if overflow > 0:
        notes.append(f"Move {format_duration(overflow)} out of today.")
    if len(heavy) >= 3:
        notes.append("Put the hardest task before messages or errands.")
    if not has_health and load >= 70:
        notes.append("Add a short walk, stretch, or meal block.")
    if not has_rest and load >= 85:
        notes.append("Add a real shutdown block before sleep.")
    if open_minutes < 45 and load >= 80:
        notes.append("Leave at least one buffer window.")
    if not notes:
        notes.append("The plan is balanced enough to start.")
    return notes


def build_plan(text, start, end, mode, break_mode):
    tasks = parse_tasks(text, mode)
    timeline = build_timeline(tasks, start, end, break_mode)
    summary = summarize(tasks, timeline, start, end)
    return {
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "options": {"start": start, "end": end, "mode": mode, "breaks": break_mode},
        "tasks": tasks,
        "timeline": timeline,
        "summary": summary,
    }


def format_plan(plan):
    lines = [
        "lifepilot daily plan",
        "",
        f"Load: {plan['summary']['load']}% ({plan['summary']['tone']})",
        f"Focus blocks: {plan['summary']['focusBlocks']}",
        f"Open time: {format_duration(plan['summary']['openMinutes'])}",
        "",
        "Timeline",
    ]
    for block in plan["timeline"]:
        lines.append(f"{block['start']}-{block['end']}  {block['title']}")
    lines.append("")
    lines.append("Top focus")
    focus = plan["summary"]["mainFocus"] or [task["title"] for task in plan["tasks"][:3]]
    for item in focus:
        lines.append(f"- {item}")
    lines.append("")
    lines.append("Suggestions")
    for item in plan["summary"]["suggestions"]:
        lines.append(f"- {item}")
    return "\n".join(lines)


def read_interactive():
    print("Paste your tasks. Submit an empty line to plan.\n")
    lines = []
    while True:
        line = input("> ").strip()
        if not line:
            break
        lines.append(line)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(prog="lifepilot", description="Turn messy tasks into a clear daily plan.")
    parser.add_argument("--file", help="Read tasks from a text file.")
    parser.add_argument("--start", default="08:00", help="Day start time.")
    parser.add_argument("--end", default="22:30", help="Day end time.")
    parser.add_argument("--mode", default="balanced", choices=sorted(MODES.keys()))
    parser.add_argument("--breaks", default="normal", choices=sorted(BREAKS.keys()))
    parser.add_argument("--json", action="store_true", help="Print the full plan as JSON.")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as file:
            text = file.read()
    else:
        text = read_interactive()

    plan = build_plan(text, args.start, args.end, args.mode, args.breaks)
    if args.json:
        print(json.dumps(plan, indent=2))
    else:
        print()
        print(format_plan(plan))


if __name__ == "__main__":
    main()
