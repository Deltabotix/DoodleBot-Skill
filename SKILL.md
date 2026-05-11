---
name: doodlebot
description: Generate program.json files for the DoodleBot drawing robot. Use this skill whenever a user asks to make the bot draw a shape, write a word, blink colors, or run a sequence of moves. Output is a JSON file the user drops onto the bot, plus a p5.js preview the user can run in their browser to see how the bot will draw it.
---

# DoodleBot Program Generator

## Core rule (every drawing request)

When the user asks the bot to draw, animate, blink, or run any sequence
of moves, **always produce TWO files in the same response**:

1. **`program.json`** — the program the bot runs. Must validate against
   the schema below.
2. **`preview.js`** — a p5.js sketch that animates the bot's motion at
   <https://editor.p5js.org/>. Built by taking `preview-template.js`
   from this skill folder and replacing **only** the `PROGRAM` constant
   with the JSON you generated. Don't modify the interpreter beneath.

Emit both by default. Skip a file only if the user explicitly says
*"just the json"* or *"skip the preview"*.

The bot has no compilation step; both files are plain text the user
copies and uses.

## Output rules

1. Generate **`program.json`** AND **`preview.js`** for every drawing
   request — see the Core rule above. Single-file output is the
   exception, not the default.
2. `program.json` must validate against the schema (see "Program
   structure" section).
3. Keep `program.json` under **16 KB**.
4. Keep total expanded ops under **2048** (loops count once per
   iteration).
5. `preview.js` is the contents of `preview-template.js` with the
   `PROGRAM` constant block replaced by your generated JSON. Nothing
   else in the template should change — the interpreter matches the
   bot's firmware semantics.
6. In your response to the user:
   - One-sentence summary of what the program does.
   - Provide the `program.json` content (fenced JSON block, or a
     downloadable file in agents that support it).
   - Provide the `preview.js` content (fenced JS block).
   - Include this instruction verbatim:
     > **Preview first:** open <https://editor.p5js.org/>, paste
     > `preview.js` into the sketch panel, click ▶. SPACE = pause,
     > `+`/`-` = speed, `R` = restart, `E` = jump to final result.
     > **When you're happy:** open the DoodleBot web app, go to the
     > Program tab, drag `program.json` onto the drop zone. Press
     > ✓ Tick on the bot or Play in the app.

## Program structure

```json
{
  "name": "snowflake",
  "version": 1,
  "ops": [ ...operations... ]
}
```

- `name`: short label shown on the bot's OLED + web UI. Optional but always include it.
- `version`: must be `1` for v1 programs.
- `ops`: ordered array of operations. Each op is one of the kinds below.

## Operation reference

| op | fields | example | meaning |
|---|---|---|---|
| `forward` | `mm` (int) | `{"op":"forward","mm":80}` | Drive forward N millimeters |
| `reverse` | `mm` (int) | `{"op":"reverse","mm":40}` | Drive backward N millimeters |
| `turn` | `deg` (int), `right` (bool) | `{"op":"turn","deg":90,"right":true}` | Spin in place by N degrees, right=true → clockwise |
| `arc` | `deg` (int), `radius_mm` (int), `right` (bool) | `{"op":"arc","deg":90,"radius_mm":100,"right":true}` | Sweeping arc; radius is from the bot's center |
| `pen` | `down` (bool) | `{"op":"pen","down":true}` | Lower (true) or lift (false) the pen |
| `led` | `r`, `g`, `b` (0-255) | `{"op":"led","r":255,"g":0,"b":0}` | Set both onboard LEDs to a solid color |
| `beep` | `hz` (int), `ms` (int) | `{"op":"beep","hz":1200,"ms":150}` | Play a tone |
| `wait` | `ms` (int) | `{"op":"wait","ms":500}` | Pause the program for N milliseconds |
| `loop` | `n` (int), `body` (array) | `{"op":"loop","n":4,"body":[...]}` | Repeat the body `n` times. Nested up to 4 levels. |

## Bot conventions you MUST respect

- **Units**: millimeters for distance, degrees for angles, milliseconds for time, 0-255 for color channels, Hz for beep tones.
- **Pen state**: starts UP at boot. **You must explicitly `pen down` before drawing** and `pen up` when finished, or the bot will skip strokes you intended to draw or trail ink across the page.
- **Speed**: fixed (~600 in the bot's WS-protocol units). Don't try to set speed.
- **Workspace**: assume a paper area roughly 200 mm × 200 mm centered on the start position. The bot does not have absolute positioning — every command is relative to wherever it currently is.
- **Turn direction**: `right: true` = clockwise (looking down on the bot). `right: false` = counter-clockwise.
- **Arc geometry**: `radius_mm == wheel_base/2 == 70` makes the inner wheel pivot in place. Smaller radius = tighter curve. For gentle curves, use 100-150.
- **No variables, no expressions, no conditionals**. Pre-compute every number yourself. The interpreter is intentionally tiny.

## What NOT to do

- Don't emit any field not listed in the op table — the parser will reject the file.
- Don't nest loops more than 4 deep.
- Don't generate >2048 expanded ops (a 4-deep nested loop with `n` of 10 each = 10000, will fail).
- Don't omit `pen down` before drawing strokes — it's the most common bug.

## Patterns

### Drawing a regular polygon
For an N-sided polygon with side length S mm, exterior angle is `360/N` degrees:
```json
{"op":"loop","n":N,"body":[
  {"op":"forward","mm":S},
  {"op":"turn","deg":360/N,"right":true}
]}
```

### Drawing a circle
Approximate with a 24-step polygon: side ~ `2 * π * radius / 24`, exterior angle 15°.

### Multi-stroke shape (e.g. house, snowflake)
Pen down → stroke 1 → pen up → reposition → pen down → stroke 2 → ... → pen up.

### Color blink
```json
{"op":"loop","n":3,"body":[
  {"op":"led","r":255,"g":0,"b":0}, {"op":"wait","ms":300},
  {"op":"led","r":0,"g":0,"b":255}, {"op":"wait","ms":300}
]}
{"op":"led","r":0,"g":0,"b":0}
```

## Worked examples

See `examples/` in this skill folder:
- `square.json` — basic loop, straight-line shape
- `hexagon.json` — polygon variant
- `snowflake.json` — multi-stroke + pen lifts
- `smiley.json` — multi-stroke + arcs + LED color
- `name.json` — uses `forward` + `turn` to write letters
- `disco.json` — LED + beep program with no movement

Quote from these freely as prior art.

## User workflow

1. User prompts you (Claude, Codex, ChatGPT, or another AI model): *"draw a snowflake"*
2. You generate **two files**: `program.json` and `preview.js`.
3. **Preview** — user opens <https://editor.p5js.org/>, pastes `preview.js`, clicks ▶. They see the bot's path animate as if it were drawing on paper. Pause / speed / restart / jump-to-end controls are built into the preview.
4. **Upload** — user opens the bot's web app (join WiFi `DoodleBot-XXXX` / password `doodle123`, browse to `http://192.168.4.1`, go to the Program tab) and drag-drops `program.json` onto the drop zone.
5. Bot interprets the program; user presses ✓ Tick or the in-app Play to run it.

**Key point**: There is no internet between the AI model and the bot. The agent runs on the user's laptop/phone; the user is the courier.

## Building `preview.js`

The skill folder contains `preview-template.js`. Take that file verbatim and replace **only** the `PROGRAM` constant block with the program you generated. Do NOT modify the interpreter below it — it is calibrated to match the bot's firmware semantics (mm units, degree convention, arc geometry, loop expansion).

Schematic of the replacement:

```js
// ▼▼▼ Replace this block with your program.json content ▼▼▼
const PROGRAM = { /* your program here */ };
// ▲▲▲ Replace the block above with your program.json content ▲▲▲

// (... rest of template unchanged ...)
```

If the user has their `program.json` already, they can paste it in by hand. If you produce both files at once, embed the JSON directly so the preview is ready to run.
