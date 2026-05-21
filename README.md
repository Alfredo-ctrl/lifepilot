# lifepilot

lifepilot is a friendly planning tool that turns a messy list of tasks into a clear daily schedule. It is designed for students, freelancers, builders, and anyone who starts the day with too many things floating around.

The project includes a web app and a terminal interface. Both work locally, with no accounts, no backend, and no external services.

![lifepilot dashboard](assets/lifepilot-dashboard.png)

## What It Does

- Converts plain text tasks into a structured day plan.
- Detects task types such as study, work, errands, health, messages, and rest.
- Estimates effort, energy, priority, and best time of day.
- Builds a realistic timeline with breaks.
- Warns when the day is overloaded.
- Creates a simple focus brief for the user.
- Exports plans as JSON or plain text.
- Runs from the browser or terminal.

## Why It Helps

Most planning apps expect people to already know how to organize their day. lifepilot starts one step earlier: the user can paste a rough brain dump, and the app shapes it into something usable.

Example input:

```text
class at 10
study python for 2 hours
send my resume
go to the gym
reply to emails
sleep early
```

lifepilot will produce a timeline, highlight the heaviest tasks, and suggest a better rhythm for the day.

## Run The Web App

```bash
npm start
```

Open:

```text
http://localhost:5174
```

You can also open `index.html` directly.

## Run The Terminal App

Interactive mode:

```bash
python lifepilot.py
```

Plan from a text file:

```bash
python lifepilot.py --file examples/day.txt
```

Export JSON:

```bash
python lifepilot.py --file examples/day.txt --json
```

## Project Structure

```text
lifepilot/
  index.html
  lifepilot.py
  src/
    app.js
    planner.js
    styles.css
  examples/
    day.txt
```

## Design Goal

lifepilot is intentionally simple to understand. The intelligence is in the planning engine, but the interface feels like a useful everyday tool rather than a technical demo.

## Author

Alfredo Oliva
