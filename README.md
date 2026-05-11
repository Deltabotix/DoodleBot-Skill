# DoodleBot AI Model Skill

Generate programs for the [DoodleBot drawing robot](https://github.com/Deltabotix/DoodleBot-Skill)
using any AI coding assistant (Claude, Codex, ChatGPT, Cursor, Codeium, etc.).

You type something like *"draw a six-pointed snowflake and turn the lights blue"* — the AI model emits a `program.json` file — you drag-drop that file onto the bot's web app — the bot runs it.

## What this skill produces

A single file: `program.json`. Tiny JSON, validated against
[`schema.json`](schema.json). Typical size: 200–2000 bytes.

```json
{
  "name": "square",
  "version": 1,
  "ops": [
    {"op": "pen", "down": true},
    {"op": "loop", "n": 4, "body": [
      {"op": "forward", "mm": 80},
      {"op": "turn", "deg": 90, "right": true}
    ]},
    {"op": "pen", "down": false}
  ]
}
```

## Install & Setup

### Option 1: Claude Code (auto-discovery)

If you're using Claude Code, the skill is auto-discoverable:

```bash
# Clone or download the skill folder, then move it into ~/.claude/skills/
git clone https://github.com/Deltabotix/DoodleBot-Skill /tmp/doodlebot
mkdir -p ~/.claude/skills
cp -R /tmp/doodlebot/skills/doodlebot ~/.claude/skills/

# Or symlink so updates propagate:
ln -s /tmp/doodlebot/skills/doodlebot ~/.claude/skills/doodlebot
```

Then in a Claude Code session, just ask:

```
draw a flower for the doodlebot
```

Claude Code picks up the skill automatically from the frontmatter.

### Option 2: Any AI Model (Manual Setup)

For Codex, ChatGPT, Cursor, Codeium, or any other AI model:

1. **Paste [`SKILL.md`](SKILL.md)** into the model's system prompt or custom instructions.
2. **Optionally paste [`schema.json`](schema.json)** so the model can self-validate its output.
3. **Optionally reference [`examples/`](examples/)** in your prompt for patterns (e.g., "similar to the snowflake example").

The skill is intentionally compact (~200 lines + examples) so it fits comfortably
in any model's context window.

### Option 3: Direct Integration

Copy the files into your own codebase or documentation system. The skill is plain
Markdown + JSON with no dependencies.

## DSL quick reference

See [SKILL.md](SKILL.md) for the full spec. The 9 operations are:

| Op | Fields | What it does |
|---|---|---|
| `forward` / `reverse` | `mm` | Drive straight, N mm |
| `turn` | `deg`, `right` | Pivot in place |
| `arc` | `deg`, `radius_mm`, `right` | Sweep an arc |
| `pen` | `down` | Lift / lower the pen |
| `led` | `r`, `g`, `b` (0-255) | Solid LED color |
| `beep` | `hz`, `ms` | Play a tone |
| `wait` | `ms` | Pause |
| `loop` | `n`, `body[]` | Repeat the body (nested up to 4 levels) |

What's deliberately **not** in v1: variables, expressions, conditionals,
event handlers. The agent pre-computes everything, the bot's interpreter
is small enough to fit comfortably alongside the firmware in ~8 KB.

## Workflow (All AI Models)

```
┌─ 1. You prompt your AI model ──────────────────────────────────────┐
│   "draw a snowflake"                                              │
│   (Works with Claude, Codex, ChatGPT, Cursor, etc.)               │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 2. AI model outputs program.json ─────────────────────────────────┐
│   (Download from chat or copy the JSON content)                    │
│   {"name": "snowflake", "version": 1, "ops": [...]}              │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 3. You access the bot's web app ──────────────────────────────────┐
│   • Join WiFi "DoodleBot-XXXX" (password: doodle123)              │
│   • Browse to http://192.168.4.1                                  │
│   • Tap the Program tab                                           │
│   • Drag program.json onto the drop zone                          │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 4. Bot executes the program ──────────────────────────────────────┐
│   • Press the physical ✓ Tick button — bot draws                 │
│   • Or tap "Play" in the web app                                  │
│   • Tap "Delete" to return to default behavior                    │
└────────────────────────────────────────────────────────────────────┘
```

## Validation

Programs are validated server-side by the bot. If you want to validate locally:

```bash
npm install -g ajv-cli
ajv validate -s schema.json -d program.json
```

## Worked examples

Quote from these in your prompts ("similar to the snowflake example but
with 8 points instead of 6"):

| File | What it shows |
|---|---|
| [square.json](examples/square.json) | Basic loop, pen-down/up, straight-line shape |
| [hexagon.json](examples/hexagon.json) | Regular polygon via `n × forward + turn` |
| [snowflake.json](examples/snowflake.json) | Loop with internal direction changes + LED + beep |
| [smiley.json](examples/smiley.json) | Multi-stroke (face + eyes + smile arc) + arc op |
| [name.json](examples/name.json) | Letter-style strokes using forward+turn |
| [disco.json](examples/disco.json) | LED + beep program with no movement |

## Tips for Prompting

Works with any AI model. Here are effective prompting patterns:

- **Be specific about size**: *"draw a 100 mm square"* beats *"draw a square"*.
- **Specify colors**: *"…and turn the lights pink while it draws"*.
- **Chain operations**: *"draw a triangle, then beep three times, then turn the lights off"*.
- **Request validation**: *"Generate the JSON and explain how the loop count is calculated"*.
- **Use examples**: *"Similar to the snowflake example but with 8 points instead of 6"*.
- **For complex geometry**: Ask the model to sketch the strokes in prose first, then emit JSON for tighter results.

## Limitations (v1)

- **Open-loop** — the bot has no positioning sensors. Errors accumulate
  over long programs. Keep total commanded distance under ~3 m for
  recognizable shapes.
- **Coordinate system is local, not absolute** — every command is
  relative to the bot's current pose. "Draw two circles 50 mm apart"
  means *forward 50, draw circle, forward 50 to the side, draw another*
  — not "place circles at (x,y)".
- **Single program at a time** — uploading replaces the previous program.
- **No variables / math** — the agent has to pre-compute angles and
  distances. The schema rejects anything else.

## License

MIT — see the [main repo LICENSE](https://github.com/garbhitsh/DoodleBot/blob/main/LICENSE).

## Contributing examples

PRs adding new programs to `examples/` are welcome. Each should:

1. Pass `ajv validate -s schema.json -d examples/your.json`
2. Have a clear `"name"` field
3. Stay under 2 KB
4. Demonstrate something not already covered

If you publish a particularly nice program, open an issue tagged
`example-gallery` and we'll link to it from the main README.
