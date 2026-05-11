# DoodleBot Coding Agent Skill

Make a coding agent (Claude Code, Codex, Cursor, Codeium, etc.) generate
programs that a [DoodleBot drawing robot](https://github.com/garbhitsh/DoodleBot)
can run on real paper.

You type something like *"draw a six-pointed snowflake and turn the
lights blue"* — the agent emits a `program.json` file — you drag-drop
that file onto the bot's web app — the bot runs it.

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

## Install

### Claude Code

```bash
# Clone or download just the skill folder, then move it into ~/.claude/skills/
git clone https://github.com/garbhitsh/DoodleBot.git /tmp/doodlebot
mkdir -p ~/.claude/skills
cp -R /tmp/doodlebot/skills/doodlebot ~/.claude/skills/

# Or symlink so updates propagate:
ln -s /tmp/doodlebot/skills/doodlebot ~/.claude/skills/doodlebot
```

Then in a Claude Code session, the skill is auto-discoverable. Just ask:

```
draw a flower for the doodlebot
```

Claude Code picks up the skill from its name + description in the
frontmatter and follows the instructions in `SKILL.md`.

### Other agents (Codex, Cursor, Codeium, ChatGPT custom GPTs, etc.)

The skill is plain Markdown + JSON. To use it elsewhere:

1. Paste the contents of [`SKILL.md`](SKILL.md) into the agent's system /
   instructions prompt.
2. Optionally paste [`schema.json`](schema.json) so the agent can
   self-validate its output.
3. Optionally paste one or two [`examples/`](examples/) files as
   reference.

The skill is intentionally short (~150 lines of prose + 60 lines of
schema + tiny examples) so it fits in any agent's context window with
plenty of room left over.

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

## Workflow

```
┌─ 1. You prompt your agent ─────────────────────────────────────────┐
│   "draw a snowflake"                                               │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 2. Agent writes program.json in your working directory ───────────┐
│   $ ls                                                             │
│   program.json                                                     │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 3. You open the bot's web app ────────────────────────────────────┐
│   • Join WiFi "DoodleBot-XXXX" (password: doodle123)               │
│   • Browse to http://192.168.4.1                                   │
│   • Tap the Program tab                                            │
│   • Drag program.json onto the drop zone                           │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ 4. Bot loads it, locks the drawing tabs ──────────────────────────┐
│   The bot is now in "RUNNING PROGRAM" mode.                        │
│   • Press the physical ✓ Tick button — bot draws.                  │
│   • Or tap "Play" in the web app.                                  │
│   • Tap "Delete" to return to default behavior.                    │
└────────────────────────────────────────────────────────────────────┘
```

## Validation

Programs are validated server-side by the bot (rejects unknown ops,
nesting > 4, expanded op count > 2048). If you want to validate before
uploading:

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

## Tips for writing your own prompts

- Be specific about size in millimeters if you care ("draw a 100 mm
  square" beats "draw a square").
- Tell the agent if you want a particular color: *"…and turn the
  lights pink while it draws"*.
- Multi-step programs work: *"draw a triangle, then beep three times,
  then turn the lights off"*.
- For complex shapes, ask the agent to first sketch the strokes verbally
  in the chat and then emit the JSON — Claude generally produces tighter
  geometry that way.

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
