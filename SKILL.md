---
name: doodlebot
description: Generate program.json files for the DoodleBot drawing robot. Use this skill whenever a user asks to make the bot draw a shape, write a word, blink colors, or run a sequence of moves. Output is a single JSON file the user can drop onto the bot's upload portal.
---

# DoodleBot Program Generator

When a user asks you to create a program for the DoodleBot drawing robot, generate a **`program.json`** file.
The bot interprets the JSON natively — there is no compilation step. The file must validate against the schema below.
Instructions for the user appear at the end of this guide.

## Output rules

1. Generate a **single JSON file named `program.json`**.
2. The file must validate against the schema in this guide (see "Program structure" section).
3. Keep total file size under **16 KB**.
4. Keep total expanded ops under **2048** (loops count once per iteration).
5. In your response to the user:
   - Briefly describe what the program does.
   - Provide the complete `program.json` content (inline or as a downloadable file).
   - Include upload instructions: *Long-press the ★ Star button on the bot to enter upload mode, note the URL shown on the OLED, visit that URL on the user's device, and drag-drop the `program.json` file onto the upload portal.*

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
2. You generate `program.json` and provide it to the user.
3. User long-presses the ★ Star button on the bot to enter upload mode.
4. User opens the upload URL (shown on the bot's OLED) on their device.
5. User drags and drops `program.json` onto the web portal.
6. Bot exits upload mode and executes the program when the user presses ✓ Tick.

**Key point**: The user carries the program on their own device; there is no internet connectivity required between the AI model and the bot.
