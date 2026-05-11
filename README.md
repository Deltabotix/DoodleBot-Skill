# DoodleBot AI Model Skill

Generate programs for the [DoodleBot drawing robot](https://github.com/Deltabotix/DoodleBot-Skill)
using any AI coding assistant (Claude, Codex, ChatGPT, Cursor, Codeium, etc.).

You type something like *"draw a six-pointed snowflake and turn the lights blue"* — the AI model emits a `program.json` file — you drag-drop that file onto the bot's web app — the bot runs it.

## What this skill produces

Two files per request:

1. **`program.json`** — what the bot runs. Tiny JSON, validated against
   [`schema.json`](schema.json). Typical size: 200–2000 bytes.
2. **`preview.js`** — a [p5.js](https://p5js.org/) sketch you paste into
   <https://editor.p5js.org/> to **see the bot move before you commit to
   paper**. Same DSL, same units, deterministic. Pause / speed / restart /
   jump-to-end built in.

The preview catches the most common bot bugs (wrong turn direction,
off-by-90° heading, total path too long) in seconds, before you've burned
any paper or ink. Skip the preview if you trust the program — it's
optional, never required for the bot.

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

## Default behavior

Once installed in any agent, asking *"draw a flower"* (or any drawing
prompt) automatically produces **both files together** — `program.json`
for the bot and `preview.js` for the in-browser preview. You don't have
to ask for the preview separately; the skill instructs the agent to
emit both by default for every drawing request.

If you only want one of them, say so: *"just the program.json, skip
the preview"* or *"only the preview, I'll generate the program later"*.

## Install

The skill is just Markdown + JSON. Pick the path that matches your
coding agent. Most agents read instruction files at session start — once
the skill is in place, any drawing prompt triggers both files
automatically.

> Replace `https://github.com/Deltabotix/DoodleBot-Skill` below with
> your actual repo URL if you forked.

### Claude Code (auto-discovery)

Drop the folder into `~/.claude/skills/`. Claude Code reads the
frontmatter and loads the skill on demand.

```bash
git clone https://github.com/Deltabotix/DoodleBot-Skill /tmp/doodlebot
mkdir -p ~/.claude/skills
cp -R /tmp/doodlebot/skills/doodlebot ~/.claude/skills/
# Or symlink so future git pulls propagate:
ln -s /tmp/doodlebot/skills/doodlebot ~/.claude/skills/doodlebot
```

Then in any session: *"draw a snowflake for the doodlebot"* → both
files appear in your working directory.

### Cursor

Add the skill content to your project's
[**Rules for AI**](https://docs.cursor.com/context/rules) so every
session in this repo sees it.

```bash
mkdir -p .cursor/rules
curl -L https://github.com/Deltabotix/DoodleBot-Skill/raw/main/skills/doodlebot/SKILL.md \
  -o .cursor/rules/doodlebot.md
```

Or in the Cursor UI: `Settings → Rules for AI` → paste the contents of
[`SKILL.md`](SKILL.md). For the preview-emit step, also paste
[`preview-template.js`](preview-template.js) as a second rule so Cursor
has the template at hand.

### GitHub Copilot Chat

Copilot Chat reads `.github/copilot-instructions.md` from any repo.

```bash
mkdir -p .github
curl -L https://github.com/Deltabotix/DoodleBot-Skill/raw/main/skills/doodlebot/SKILL.md \
  -o .github/copilot-instructions.md
```

Then ask Copilot Chat *"draw a hexagon for doodlebot"* in any file of
that repo.

### Codex CLI (OpenAI codex / `codex` agent)

Codex reads an `AGENTS.md` at the repo root.

```bash
curl -L https://github.com/Deltabotix/DoodleBot-Skill/raw/main/skills/doodlebot/SKILL.md \
  -o AGENTS.md
```

You can also pass `--system-prompt-file ./SKILL.md` per-invocation.

### ChatGPT (web) — Custom GPT

1. <https://chat.openai.com/gpts/editor> → **Create a GPT**
2. **Instructions** field → paste the contents of [`SKILL.md`](SKILL.md).
3. **Knowledge** → upload [`schema.json`](schema.json),
   [`preview-template.js`](preview-template.js), and the
   [`examples/`](examples/) JSON files.
4. **Capabilities** → leave Code Interpreter on (it lets the GPT
   actually run AJV validation if asked).
5. Save. Ask the GPT *"draw a star"* → it returns both files inline.

### ChatGPT / Claude / any other chat — single-shot

For one-off use without persisting instructions, paste this prelude
before your prompt:

```
You are using the DoodleBot skill. Whenever the user asks you to draw,
animate, blink, or program a movement, output TWO files:
1. program.json conforming to the schema below
2. preview.js — the contents of the preview template below with
   PROGRAM replaced by your generated program.

<paste contents of SKILL.md here>
<paste contents of schema.json here>
<paste contents of preview-template.js here>

Now: <your actual request>
```

### Aider, Continue, Cline, Codeium Chat, etc.

Any agent that supports an "always-attached" instructions file works the
same way. Put [`SKILL.md`](SKILL.md) in the file the agent reads at
session start. Typical locations:

| Agent | File |
|---|---|
| Aider | `.aider.conf.yml` → `read: ["SKILL.md"]` |
| Continue (VS Code) | `~/.continue/config.json` → `systemMessage` |
| Cline | `.clinerules/doodlebot.md` |
| Codeium Chat | `.codeiumignore` doesn't help — paste into the Chat panel's "Knowledge" tab |
| Roo Code | `.roo/rules/doodlebot.md` |
| Goose | `~/.config/goose/system.md` |

If your tool isn't listed, find its "system prompt", "rules", or
"instructions" mechanism — that's where SKILL.md goes.

### Direct integration (no agent at all)

The skill is plain text. Read it, write a `program.json` by hand,
upload. The bot doesn't care whether a human or an LLM produced the
file. [`schema.json`](schema.json) tells you exactly what's allowed.

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
| [snowflake.preview.js](examples/snowflake.preview.js) | The matching p5.js preview — paste into editor.p5js.org to see |
| [smiley.json](examples/smiley.json) | Multi-stroke (face + eyes + smile arc) + arc op |
| [name.json](examples/name.json) | Letter-style strokes using forward+turn |
| [disco.json](examples/disco.json) | LED + beep program with no movement |

The agent emits the preview by taking [`preview-template.js`](preview-template.js)
and replacing only the `PROGRAM` constant. The interpreter below it is
calibrated to match firmware semantics (mm, deg, arc geometry, loop
expansion) so what you see in the preview is what the bot will draw.

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
