/* ────────────────────────────────────────────────────────────────────
 *  DoodleBot Preview  —  paste into https://editor.p5js.org/  and hit Play
 *  ▸ animates how the real bot will move
 *  ▸ same JSON DSL the firmware interprets (no extra grammar to learn)
 *  ▸ controls:  SPACE = pause/resume   +/- = speed up / slow down
 *               R = restart   E = jump to end (instant render)
 * ──────────────────────────────────────────────────────────────────── */

// ▼▼▼ Replace this block with your program.json content ▼▼▼
const PROGRAM = {
  "name": "snowflake",
  "version": 1,
  "ops": [
    {"op":"led","r":120,"g":160,"b":255},
    {"op":"pen","down":true},
    {"op":"loop","n":6,"body":[
      {"op":"forward","mm":60},
      {"op":"turn","deg":60,"right":true},
      {"op":"forward","mm":30},
      {"op":"turn","deg":120,"right":false},
      {"op":"forward","mm":30},
      {"op":"turn","deg":60,"right":true}
    ]},
    {"op":"pen","down":false},
    {"op":"led","r":255,"g":255,"b":255},
    {"op":"beep","hz":1400,"ms":120}
  ]
};
// ▲▲▲ Replace the block above with your program.json content ▲▲▲

// ── Bot physical model (matches the firmware constants) ──────────────
const WHEEL_BASE_MM    = 140;
const FORWARD_SPEED_MM = 80;    // preview speed (mm/sec); real bot is slower
const TURN_SPEED_DEG   = 180;   // preview rotation speed (deg/sec)
const PX_PER_MM        = 1.5;   // canvas scale

// ── State ────────────────────────────────────────────────────────────
let timeline = [];
let cursor   = 0;
let opStartBot;
let opDuration;
let opStartedAt;
let lastBot;
let bot, trail, ledColor;
let paused = false;
let speedMul = 1.0;
let beeps    = [];

function setup() {
  createCanvas(720, 720);
  textFont('monospace');
  resetRun();
}

function resetRun() {
  bot      = { x: 0, y: 0, heading: 0, penDown: false };
  lastBot  = { ...bot };
  trail    = [];
  ledColor = [60, 60, 60];
  beeps    = [];
  cursor   = 0;
  opStartBot = null;
  paused = false;
  timeline.length = 0;
  flatten(PROGRAM.ops || [], timeline);
  opStartedAt = millis();
  loop();
}

function flatten(ops, out) {
  for (const op of ops) {
    if (op.op === 'loop') {
      const n = Math.max(0, op.n | 0);
      for (let i = 0; i < n; i++) flatten(op.body || [], out);
    } else {
      out.push(op);
    }
  }
}

function durationFor(op) {
  switch (op.op) {
    case 'forward':
    case 'reverse': return (op.mm | 0) / FORWARD_SPEED_MM;
    case 'turn':    return (op.deg | 0) / TURN_SPEED_DEG;
    case 'arc': {
      const len = ((op.deg | 0) * Math.PI / 180) * (op.radius_mm | 0);
      return len / FORWARD_SPEED_MM;
    }
    case 'wait':    return (op.ms | 0) / 1000;
    default:        return 0.05;
  }
}

function applyAt(op, t, start) {
  switch (op.op) {
    case 'forward':
    case 'reverse': {
      const sign = op.op === 'forward' ? 1 : -1;
      const mm = (op.mm | 0) * sign * t;
      const rad = radians(start.heading);
      bot.x = start.x + mm * sin(rad);
      bot.y = start.y - mm * cos(rad);
      bot.heading = start.heading;
      break;
    }
    case 'turn': {
      const dir = op.right ? 1 : -1;
      bot.heading = start.heading + dir * (op.deg | 0) * t;
      bot.x = start.x; bot.y = start.y;
      break;
    }
    case 'arc': {
      const dir = op.right ? 1 : -1;
      const angle = (op.deg | 0) * t * dir;
      const rad0 = radians(start.heading);
      const cx = start.x + dir * (op.radius_mm | 0) * cos(rad0);
      const cy = start.y + dir * (op.radius_mm | 0) * sin(rad0);
      const rel = radians(angle);
      bot.x = cx - dir * (op.radius_mm | 0) * cos(rad0 + rel);
      bot.y = cy - dir * (op.radius_mm | 0) * sin(rad0 + rel);
      bot.heading = start.heading + angle;
      break;
    }
    case 'pen':
      bot.penDown = !!op.down;
      bot.x = start.x; bot.y = start.y; bot.heading = start.heading;
      break;
    case 'led':
      ledColor = [op.r | 0, op.g | 0, op.b | 0];
      break;
    case 'beep':
      if (t === 0) beeps.push({ at: millis(), hz: op.hz | 0, ms: op.ms | 0 });
      break;
  }
}

function draw() {
  if (paused) { drawHud(); return; }
  if (cursor >= timeline.length) { drawHud("DONE"); noLoop(); return; }

  const op = timeline[cursor];
  if (opStartBot === null) {
    opStartBot = { ...bot };
    opDuration = durationFor(op);
    opStartedAt = millis();
  }
  const t = opDuration > 0
    ? min(1, ((millis() - opStartedAt) / 1000) * speedMul / opDuration)
    : 1;

  applyAt(op, t, opStartBot);

  if (lastBot && bot.penDown) {
    const dx = bot.x - lastBot.x, dy = bot.y - lastBot.y;
    if (dx * dx + dy * dy > 0.0001) {
      trail.push({ x0: lastBot.x, y0: lastBot.y,
                   x1: bot.x,     y1: bot.y,
                   c: [...ledColor] });
    }
  }
  lastBot = { ...bot };

  render();

  if (t >= 1) {
    cursor++;
    opStartBot = null;
  }
}

function render() {
  background(15, 23, 42);
  push();
  translate(width / 2, height / 2);
  scale(PX_PER_MM, PX_PER_MM);

  stroke(40, 55, 80); strokeWeight(0.5);
  for (let g = -300; g <= 300; g += 50) {
    line(g, -300, g, 300);
    line(-300, g, 300, g);
  }
  stroke(80, 110, 150); line(-300, 0, 300, 0); line(0, -300, 0, 300);

  strokeWeight(1.2); noFill();
  for (const s of trail) {
    stroke(s.c[0], s.c[1], s.c[2]);
    if (s.c[0] + s.c[1] + s.c[2] < 100) stroke(245, 200, 80);
    line(s.x0, s.y0, s.x1, s.y1);
  }

  push();
  translate(bot.x, bot.y);
  rotate(radians(bot.heading));
  noStroke();
  fill(ledColor[0], ledColor[1], ledColor[2], 110);
  ellipse(0, 0, 26, 26);
  fill(245, 158, 11);
  triangle(10, 0, -8, -7, -8, 7);
  pop();

  pop();
  drawHud();
}

function drawHud(status) {
  noStroke();
  fill(245, 158, 11);
  textSize(14);
  text((PROGRAM.name || 'program') + '   v' + (PROGRAM.version || 1), 12, 22);
  fill(180, 200, 220);
  textSize(11);
  text((status || 'op ' + (cursor + 1) + ' / ' + timeline.length), 12, 40);
  text('speed ' + speedMul.toFixed(2) + 'x   SPACE pause   +/- speed   R restart   E end', 12, height - 14);

  const now = millis();
  for (const b of beeps) {
    const age = now - b.at;
    if (age < 250) {
      fill(255, 220, 0, 200 * (1 - age / 250));
      ellipse(width - 24, 24, 16, 16);
    }
  }
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === '+' || key === '=') speedMul = min(8, speedMul * 2);
  if (key === '-' || key === '_') speedMul = max(0.25, speedMul / 2);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'e' || key === 'E') {
    while (cursor < timeline.length) {
      const op = timeline[cursor];
      const start = { ...bot };
      applyAt(op, 1, start);
      if (bot.penDown && op.op !== 'pen') {
        trail.push({ x0: start.x, y0: start.y, x1: bot.x, y1: bot.y, c: [...ledColor] });
      }
      lastBot = { ...bot };
      cursor++;
    }
    render();
    noLoop();
  }
}
