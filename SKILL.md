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
6. **Position-tracking requirement (anything beyond a single closed
   shape):** if the program has more than one stroke, OR any
   `pen up` → reposition → `pen down` sequence, OR mixes shapes
   (face + eyes, body + arms, etc.), you MUST first produce a
   pose-tracking table in your reasoning that lists `(x, y, heading)`
   after every op. Without it you will misplace shapes. See "Coordinate
   system" below. Include a short pose summary (start pose, key
   waypoints, end pose) in your reply so the user can sanity check.
7. In your response to the user:
   - One-sentence summary of what the program does.
   - For multi-stroke programs: a brief pose summary (where each
     stroke is centered, in mm from origin).
   - The `program.json` content (fenced JSON block).
   - The `preview.js` content (fenced JS block).
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

## Coordinate system & position tracking (READ EVERY TIME)

> **This is the #1 source of broken programs.** The bot has no absolute
> positioning sensor. Every command is relative to the bot's current
> pose. If you don't track pose in your head, multi-stroke shapes will
> drift, overlap, or fall off the page. Read this section *before*
> writing any JSON beyond a one-shape program.

### Frame

- Bot starts at the origin `(0, 0)` facing **`+Y` (heading 0°, "north")**.
- Heading is measured **clockwise from +Y** in degrees.
  - `right: true` adds to heading. `right: false` subtracts.
  - 0° = north (+Y), 90° = east (+X), 180° = south (−Y), 270° / −90° = west (−X).
- `forward N` at heading h: `x += N·sin(h)`, `y += N·cos(h)`.
- `reverse N` is `forward −N`.

### Workspace bounds

- Paper is ~200 × 200 mm centred on the start. **Keep all ops inside
  `(−100, −100)` to `(+100, +100)`.** Aim for **±80 mm** in practice;
  open-loop step error accumulates.
- If any traced point goes outside ±80 mm, redesign the layout. Don't
  just trim — re-centre.

### Pose-tracking table (the thing the agent must produce)

Before you emit JSON for any non-trivial program, write a table like
this in your reasoning. One row per op. End-state of each op only.

```
op                                  x       y      heading   pen   note
start                                0       0       0        ↑
turn 90 left                         0       0     -90        ↑    facing west
forward 40                         -40       0     -90        ↑
turn 90 right                      -40       0       0        ↑    facing north again
pen down                           -40       0       0        ↓
loop 24×(forward 12, turn 15 R)    -40       0       0        ↓    closes; circle CENTER ≈ (6, 6)
pen up                             -40       0       0        ↑
…
```

You don't have to put the table in the file — it's a thinking tool.
But you *must* include a 2-3 line pose summary in your reply so the
user can sanity-check (e.g. "face centred at (0,0), eyes at (−20,25)
and (20,25), mouth between (−20,−15) and (20,−15)").

### The polygon-center offset rule (CRUCIAL)

A "circle" walked as `loop N × (forward S, turn 360/N right)` *closes
back to the bot's starting pose*, but **the circle's centre is NOT at
the starting position**. It's offset from start by:

- `+apothem` in the bot's **right-perpendicular** direction
- `+S/2` along the bot's heading

For a starting heading of 0° (north):
- right-perpendicular is +X
- so circle centre = `(start.x + apothem, start.y + S/2)`

Where `apothem = S / (2 · tan(180°/N))`. For the common 24-gon circle
with side `S`, apothem ≈ `S · 3.798` (so a side-12 circle gives an
apothem of about 46 mm and a radius of about 46 mm).

> If you forget this and place a "face" 24-gon at start `(0,0,0°)`
> thinking it centres on origin, the face will actually be drawn ~46 mm
> to the +X side of origin — and any eyes/mouth you then position
> around `(0,0)` will be **outside the face**. This is exactly how the
> common broken "smiley" looks.

There are two cleanups for this:

1. **Pre-position** the bot so the circle ends up where you want.
   To centre a `S=12, N=24` face on origin, drive the bot to
   `(−apothem, −S/2) ≈ (−46, −6)` first, then walk the polygon.
2. **Track the offset** and place everything else relative to the
   real circle centre rather than the bot's starting position.

Pick approach 1 for any face / head / circle that other strokes
must sit inside — it makes the rest of the program much simpler.

### Navigation primitives

To move the bot from `(x0, y0, h0)` to `(x1, y1, h1)` *without
drawing*, raise the pen first, then choose one of these recipes:

- **Same heading, axis-aligned move** (Δx=0 or Δy=0): one `turn` to
  face the move direction, one `forward` (or `reverse`), one `turn`
  back. Reverse-trick: if Δy is non-zero and you're already at
  heading 0°, just `reverse` (negative Δy) or `forward` (positive Δy)
  — no turning needed.
- **General Δx and Δy, same heading**:
  ```
  turn 90 (right if Δx > 0 else left)   # face +X or −X
  forward |Δx|
  turn 90 (left if Δx > 0 else right)   # face north again
  forward Δy  (or reverse |Δy| if Δy < 0)
  ```
  Always 4 ops, all integer. **Prefer this over `atan2` diagonal
  moves** — it's easier to verify mentally.
- **Need to also change heading**: do the position recipe, then
  append a final `turn` of `(h1 − h0_current)`. Heading wraps in
  [−360°, +360°]; both work.

### Pre-flight checklist (run mentally before emitting JSON)

1. ☐ Did I write down the pose after every op?
2. ☐ For every `loop` polygon: did I apply the polygon-center offset
   rule, and is the circle's *centre* (not the bot's start) where I
   wanted it?
3. ☐ Did I `pen up` before every reposition and `pen down` before
   every stroke?
4. ☐ Does every `(x, y)` in my pose table stay inside ±80 mm?
5. ☐ Total expanded ops ≤ 2048?
6. ☐ Does the final layout make sense? (eyes inside face, arms
   attached to body, signature inside page, etc.)

If any answer is no, redesign the program before emitting.

## Bot conventions you MUST respect

- **Units**: millimetres for distance, degrees for angles, milliseconds for time, 0-255 for color channels, Hz for beep tones.
- **Pen state**: starts UP at boot. **You must explicitly `pen down` before drawing** and `pen up` when finished, or the bot will skip strokes you intended to draw or trail ink across the page.
- **Speed**: fixed (~600 in the bot's WS-protocol units). Don't try to set speed.
- **Turn direction**: `right: true` = clockwise (looking down on the bot). `right: false` = counter-clockwise.
- **Arc geometry**: the bot circles a point that is `radius_mm` to its **right** (when `right:true`) or **left** (when `right:false`) of the current position, perpendicular to its current heading. `radius_mm == wheel_base/2 == 70` makes the inner wheel pivot in place. Smaller radius = tighter curve. For gentle curves, use 100-150.
- **Arc direction recipe** (the subtle one — get this wrong and your smile becomes a frown):
  - To draw a **south-bulging** semicircle (smile mouth, valley) from `(xL, y)` to `(xL+2R, y)`: arrive at `(xL, y)` **facing south (heading 180°)** and emit `arc deg=180 radius=R right=false`. Bot ends at `(xL+2R, y)` facing north (0°).
  - To draw a **north-bulging** semicircle (frown, hill) from `(xL, y)` to `(xL+2R, y)`: arrive at `(xL, y)` **facing north (heading 0°)** and emit `arc deg=180 radius=R right=true`. Bot ends facing south (180°).
  - General rule: the arc curves *away from the bot's heading on the side opposite to its turn*. If unsure, sketch the centre point first: `centre = current_pos + radius · (perpendicular-right if right:true else perpendicular-left)`, then verify the apex point is where you want the bulge.
- **No variables, no expressions, no conditionals**. Pre-compute every number yourself. The interpreter is intentionally tiny.

## What NOT to do

- Don't emit any field not listed in the op table — the parser will reject the file.
- Don't nest loops more than 4 deep.
- Don't generate >2048 expanded ops (a 4-deep nested loop with `n` of 10 each = 10000, will fail).
- Don't omit `pen down` before drawing strokes — it's the most common bug.
- **Don't assume a `loop`-polygon centres on the bot's start.** It centres on `(apothem, side/2)` offset from start. See "polygon-center offset rule" above.
- **Don't write multi-stroke programs without a pose-tracking table.** You will misplace strokes.

## Patterns

### Drawing a regular polygon
For an N-sided polygon with side length S mm, exterior angle is `360/N` degrees:
```json
{"op":"loop","n":N,"body":[
  {"op":"forward","mm":S},
  {"op":"turn","deg":360/N,"right":true}
]}
```
The polygon closes back to the starting pose, but its **centre is
offset** by `(apothem, S/2)` from where the bot started (in the
start-heading frame). See "polygon-center offset rule".

### Drawing a circle
Approximate with a 24-step polygon: side `S ≈ 2 · π · radius / 24`,
exterior angle 15°. Apothem `≈ S · 3.798` ≈ radius.

### Multi-stroke shape (face, house, snowflake, signature)
Pattern: `pen up → reposition → pen down → stroke → pen up → reposition → pen down → stroke → … → pen up`.

After every stroke, **update your pose table**. Many strokes return
the bot to its start (closed polygons do); others leave it elsewhere
(arcs leave it at the arc endpoint). Don't guess — trace it.

### Color blink
```json
{"op":"loop","n":3,"body":[
  {"op":"led","r":255,"g":0,"b":0}, {"op":"wait","ms":300},
  {"op":"led","r":0,"g":0,"b":255}, {"op":"wait","ms":300}
]}
{"op":"led","r":0,"g":0,"b":0}
```

## Worked example: smiley face (do it like this)

This is the canonical multi-stroke program. The full file is in
`examples/smiley.json`. Below is the pose-tracking table the agent
should be working with as it emits the JSON.

**Plan**: face circle centred on origin (radius ≈ 46 mm), two small
eye dots at (−20, 25) and (20, 25), smile arc from (−20, −15) to
(20, −15) bulging south to (0, −35). Face uses a 24-gon side 12.
Apothem of the face polygon ≈ 46, of each eye polygon (12-gon
side 2) ≈ 3.7.

```
op                                              x       y      heading   pen   note
start                                            0       0        0       ↑
led 255,200,0                                    0       0        0       ↑
turn 90 left                                     0       0      -90       ↑    face west
forward 46                                     -46       0      -90       ↑
turn 90 right                                  -46       0        0       ↑    face north
reverse 6                                      -46      -6        0       ↑    arrived at face polygon start
pen down                                       -46      -6        0       ↓
loop 24× (forward 12, turn 15 right)           -46      -6        0       ↓    FACE; centre = (-46+46, -6+6) = (0, 0)
pen up                                         -46      -6        0       ↑
turn 90 right                                  -46      -6       90       ↑
forward 22                                     -24      -6       90       ↑
turn 90 left                                   -24      -6        0       ↑
forward 30                                     -24      24        0       ↑    arrived at left-eye polygon start
pen down                                       -24      24        0       ↓
loop 12× (forward 2, turn 30 right)            -24      24        0       ↓    LEFT EYE; centre ≈ (-20.3, 25)
pen up                                         -24      24        0       ↑
turn 90 right                                  -24      24       90       ↑
forward 40                                      16      24       90       ↑
turn 90 left                                    16      24        0       ↑    arrived at right-eye polygon start
pen down                                        16      24        0       ↓
loop 12× (forward 2, turn 30 right)             16      24        0       ↓    RIGHT EYE; centre ≈ (19.7, 25)
pen up                                          16      24        0       ↑
reverse 39                                      16     -15        0       ↑    south by 39 (heading still 0)
turn 90 left                                    16     -15      -90       ↑    face west
forward 36                                     -20     -15      -90       ↑
turn 90 left                                   -20     -15      180       ↑    face south — arc start pose
pen down                                       -20     -15      180       ↓
arc deg=180 radius=20 right=false               20     -15        0       ↓    MOUTH; semicircle bulging to (0,-35)
pen up                                          20     -15        0       ↑
led 0,255,0                                                                     done flourish
beep 1500 100
```

**Why the obvious smiley fails.** The old broken example did
`loop 24×{forward 12, turn 15 R}` straight from `(0,0,0°)`. The
polygon closes — bot returns to `(0,0,0°)` — but the **circle is
centred at `(apothem, side/2) ≈ (46, 6)`**, not at origin. The
eyes and mouth, placed around origin, then drew way to the left of
the face. The fix is the pre-positioning ops at the top.

## Worked examples

See `examples/` in this skill folder:
- `square.json` — basic loop, straight-line shape
- `hexagon.json` — polygon variant
- `snowflake.json` — multi-stroke + pen lifts
- `smiley.json` — multi-stroke + arcs + LED color, properly centred (canonical reference)
- `name.json` — uses `forward` + `turn` to write letters
- `disco.json` — LED + beep program with no movement

Quote from these freely as prior art. **For any face / head / portrait,
follow `smiley.json` — including the pre-positioning trick.**

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
