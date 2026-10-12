// 명동역 걷기 시험판: 지도 위를 유이가 직접 걸어 출구를 찾는다(사용자, 2026.10.12: "2번. 명동역 시험판 만들어봐").
// 길 찾기와 칸의 셈은 core/walk.js, 지도는 maps.json, 글은 text.js 에 있다. 여기는 화면만 놓는다.
// 물어보려는 것은 하나다: 손전화의 세로 화면에서 걸어 다니는 것이 편한가.

import * as walk from "./core/walk.js";
import { LANGS, translate } from "./text.js";
import { click as tick, ding } from "../compare/ui/sound.js";

const maps = await (await fetch("maps.json")).json();
const fares = await (await fetch("../trip/data/fares.json")).json();
const exits = fares.myeongdong.exits;   // 맞는 출구와 할머니가 나온 출구는 첫 시제품과 같은 자료에서 읽는다

const $ = (id) => document.getElementById(id);
const canvas = $("map"), ctx = canvas.getContext("2d");
const COLS = 12, ROWS = 18, TILE = canvas.width / COLS;
const SPEED = 5.5;          // 1초에 걷는 칸
const WRONG_MS = 2600;      // 틀린 출구의 바깥을 보여 주는 동안

const load = (src) => new Promise((done) => { const image = new Image(); image.onload = () => done(image); image.onerror = () => done(null); image.src = src; });
const art = {
  station: await load("art/station.webp"), street: await load("art/street.webp"),
  down: await load("art/yui-down.png"), up: await load("art/yui-up.png"), side: await load("art/yui-side.png"),
};
const params = new URLSearchParams(location.search);
const showGrid = params.has("grid");

let lang = LANGS.includes(params.get("lang")) ? params.get("lang") : LANGS.includes((navigator.language ?? "").slice(0, 2)) ? navigator.language.slice(0, 2) : "en";
const t = (key, values) => translate(lang, key, values);

let state;
function fresh() {
  const [x, y] = maps.station.start;
  state = { map: "station", x, y, way: [], face: "up", steps: 0, misses: 0, gated: false, busy: false, done: false, say: ["start"], warn: false, target: null };
}
const map = () => maps[state.map];
const tile = () => [Math.round(state.x), Math.round(state.y)];

function say(key, values, warn = false) { state.say = [key, values]; state.warn = warn; showText(); }
function showText() {
  $("bubble").textContent = t(...state.say);
  $("bubble").className = state.warn ? "yui warn" : "yui";
  $("hint").textContent = t("hint");
  $("note").textContent = t("note");
  $("again").textContent = t("again");
  $("result").textContent = t("result", { steps: state.steps, misses: state.misses });
  $("result").hidden = $("again").hidden = !state.done;
  document.title = `Korea Oddity — ${t("title")}`;
  document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  for (const button of document.querySelectorAll("#langs button")) button.classList.toggle("on", button.dataset.lang === lang);
}

function overlay(name) {
  $("overlay").hidden = !name;
  if (name) $("overlayArt").src = `../trip/art/${name}.webp`;
}

// ── 걷기 ────────────────────────────────────────────────────────────

function goTo(x, y) {
  if (state.busy || state.done) return;
  state.way = walk.path(map(), tile(), [x, y]);
  state.target = state.way.at(-1) ?? null;
}

// 한 칸에 닿을 때마다 그 칸이 일으키는 일을 본다.
function arrive(from) {
  state.steps += 1;
  const hit = walk.trigger(map(), ...tile());
  if (!hit) return;
  if (hit.gate && !state.gated) { state.gated = true; tick(true); say("gate"); return; }
  if (hit.exit) return leave(hit.exit, from);
  if (hit.goal && !state.done) {
    state.way = []; state.target = null; state.done = true;
    ding(); overlay("md-eat"); say("goal");
  }
}

function leave(exit, from) {
  state.way = []; state.target = null;
  if (exit === exits.right) {
    ding();
    state.map = "street";
    [state.x, state.y] = maps.street.start;
    state.face = "up";
    say("exitOk");
    return;
  }
  // 틀린 출구. 바깥을 잠깐 보고 계단 아래로 돌아온다.
  state.misses += 1; state.busy = true;
  tick(true);
  if (exit === exits.grandma) overlay("md-wrong");
  say(exit === exits.grandma ? "exitWrongG" : "exitWrong", undefined, true);
  setTimeout(() => {
    overlay(null);
    [state.x, state.y] = from;
    state.face = "down"; state.busy = false;
  }, WRONG_MS);
}

function update(seconds) {
  let left = SPEED * seconds;
  while (left > 0 && state.way.length && !state.busy && !state.done) {
    const [tx, ty] = state.way[0];
    const gap = Math.hypot(tx - state.x, ty - state.y);
    if (gap > 0.001) state.face = walk.facing([state.x, state.y], [tx, ty]);
    if (gap > left) { state.x += ((tx - state.x) / gap) * left; state.y += ((ty - state.y) / gap) * left; break; }
    const from = tile();
    state.x = tx; state.y = ty; left -= gap;
    state.way.shift();
    arrive(from[0] === tx && from[1] === ty ? [tx, ty] : from);
  }
  if (!state.way.length) state.target = null;
}

// ── 그리기 ──────────────────────────────────────────────────────────

const FLOOR = { "#": "#3c3c46", ".": "#e1d7c3", s: "#c85a8c", g: "#2878dc", p: "#78788a", c: "#dc3c28", C: "#f0961e", e: "#f5c800", 3: "#f5c800", 6: "#f5c800", 8: "#f5c800" };

function draw(now) {
  const m = map();
  ctx.imageSmoothingEnabled = false;
  if (art[m.art]) ctx.drawImage(art[m.art], 0, 0, canvas.width, canvas.height);
  if (!art[m.art] || showGrid) {
    // 그림이 없거나 ?grid 를 붙이면 칸의 배치를 색으로 보인다. 그림과 칸이 맞는지 보는 데 쓴다.
    ctx.globalAlpha = art[m.art] ? 0.45 : 1;
    m.rows.forEach((row, y) => [...row].forEach((ch, x) => { ctx.fillStyle = FLOOR[ch]; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }));
    ctx.globalAlpha = 1;
  }

  // 출구의 번호판. 그림에는 숫자가 없어 여기서 얹는다.
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${TILE * 0.42}px "Pretendard Variable", sans-serif`;
  for (const n of walk.EXITS) {
    const at = walk.centreOf(m, n);
    if (!at) continue;
    const label = t("exitN", { n }), width = ctx.measureText(label).width + TILE * 0.36, x = at[0] * TILE, y = at[1] * TILE;
    ctx.fillStyle = "#f6c800"; ctx.strokeStyle = "#1b1730"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x - width / 2, y - TILE * 0.36, width, TILE * 0.72, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1b1730"; ctx.fillText(label, x, y + 2);
  }

  // 계란빵 수레 위의 느낌표.
  const goal = walk.centreOf(m, "C");
  if (goal && !state.done) {
    const y = (goal[1] - 1.5) * TILE + Math.sin(now / 220) * 6;
    ctx.fillStyle = "#f6b951"; ctx.strokeStyle = "#1b1730"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(goal[0] * TILE, y, TILE * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1b1730"; ctx.fillText("!", goal[0] * TILE, y + 2);
  }

  // 가려는 칸.
  if (state.target) {
    ctx.strokeStyle = "#f6b951"; ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -now / 40;
    ctx.beginPath(); ctx.arc((state.target[0] + 0.5) * TILE, (state.target[1] + 0.5) * TILE, TILE * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // 유이. 발이 칸의 한가운데 조금 아래에 놓인다. 걸을 때는 두 걸음에 한 번 통통 뛴다.
  const sprite = art[state.face === "up" ? "up" : state.face === "down" ? "down" : "side"];
  const cx = (state.x + 0.5) * TILE, feet = (state.y + 0.85) * TILE - (state.way.length ? Math.abs(Math.sin(now / 90)) * 5 : 0);
  ctx.fillStyle = "rgba(0, 0, 0, .28)";
  ctx.beginPath(); ctx.ellipse(cx, (state.y + 0.85) * TILE, TILE * 0.3, TILE * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  if (sprite) {
    const height = TILE * 1.7, width = (sprite.width / sprite.height) * height;
    ctx.save(); ctx.translate(cx, feet);
    if (state.face === "right") ctx.scale(-1, 1);   // 옆모습의 그림은 왼쪽을 본다
    ctx.drawImage(sprite, -width / 2, -height, width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = "#6ec3f0"; ctx.fillRect(cx - TILE * 0.25, feet - TILE, TILE * 0.5, TILE);
  }
}

let last = performance.now();
function frame(now) {
  update(Math.min(0.1, (now - last) / 1000));
  last = now;
  draw(now);
  requestAnimationFrame(frame);
}

// ── 손가락, 자판 ────────────────────────────────────────────────────

function pointed(event) {
  const box = canvas.getBoundingClientRect();
  goTo(Math.floor(((event.clientX - box.left) / box.width) * COLS), Math.floor(((event.clientY - box.top) / box.height) * ROWS));
}
let held = false;
canvas.addEventListener("pointerdown", (event) => { held = true; canvas.setPointerCapture(event.pointerId); pointed(event); });
canvas.addEventListener("pointermove", (event) => { if (held) pointed(event); });
for (const name of ["pointerup", "pointercancel"]) canvas.addEventListener(name, () => { held = false; });

const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
addEventListener("keydown", (event) => {
  const step = KEYS[event.key];
  if (!step || state.way.length) return;
  event.preventDefault();
  const [x, y] = tile();
  if (walk.walkable(map(), x + step[0], y + step[1])) goTo(x + step[0], y + step[1]);
});

$("again").onclick = () => { fresh(); overlay(null); showText(); };
for (const button of document.querySelectorAll("#langs button")) button.onclick = () => { lang = button.dataset.lang; showText(); };

fresh();
showText();
requestAnimationFrame(frame);

// 시험할 때 쓴다: 브라우저의 콘솔에서 지금의 자리와 지도를 본다.
globalThis.walkTest = { get state() { return state; }, goTo };
