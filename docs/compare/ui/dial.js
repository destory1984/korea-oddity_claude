// 가로 다이얼 하나. 2권(시간 한량)의 유리 다이얼의 윗머리만 보이는 낮은 띠다.
// 끌면 눈금이 흐르고, 놓으면 굴리던 힘으로 더 돌다가 눈금에 딱 멎는다. PC에서는 휠로도 굴린다.

import { click } from "./sound.js";

const TICK_PX = 12;        // 가운데에서 한 눈금의 너비. opts.tickPx 로 바꿀 수 있다(자리가 셋뿐인 다이얼은 넓게).
const FRICTION = 0.94;     // 놓은 뒤 한 장면(1/60초)마다 남는 빠르기
const STOP = 0.02;         // 이보다 느려지면(눈금/장면) 멎을 자리를 찾는다
const MAX_SPEED = 1.5;     // 눈금/장면
const OVER = 1.5;          // 끝이 있는 다이얼이 끝을 넘어 늘어나는 눈금 수
const GLASS_TOP = "#0c1442", GLASS_FOOT = "#04061e";
const GOLD = "#d8b866", GOLD_LIT = "#f3dc9a", GOLD_SHADE = "#8a6f34", GOLD_BRIGHT = "#ffe9a8";
const KICK_MS = 80;          // 눈금이 지나갈 때 바늘이 이만큼 동안 1픽셀 내려앉는다
const SPARK_MS = 340, BEVEL = 6;
// 북두칠성. 별마다 실제 자리다: 꼴의 가운데에서 동쪽(왼쪽)과 북쪽으로 몇 도인가. 2권에서 적경과 적위로 셈한 값이다.
const DIPPER = [
  { east: -11.5, north: 6.75, bright: true }, { east: -11.8, north: 1.38, bright: true }, { east: -4.3, north: -1.31, bright: true },
  { east: -1.2, north: 2.03, bright: false }, { east: 4.3, north: 0.96, bright: true }, { east: 8.6, north: -0.07, bright: true }, { east: 12.0, north: -5.69, bright: true },
];
const DIPPER_LINES = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]];
const DIPPER_PX_PER_DEG = 1.7, DIPPER_DEPTH = 46, DIPPER_EVERY = 22;   // 264픽셀마다 하나. 띠가 낮아 2권의 절반 크기다.
// 같은 두 정수에는 늘 같은 0 → 1의 수(별가루의 자리)
function chance(a, b) {
  let x = (a * 374761393 + b * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
const FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';

const round4 = (v) => Math.round(v * 1e4) / 1e4;   // 눈금을 여러 번 더해 생기는 부동소수의 밀림을 지운다
const mod = (v, size) => ((v % size) + size) % size;

// 값을 다이얼이 낼 수 있는 값으로 맞춘다: 범위 안으로(감아 돌거나 끝에서 멈추고), 걸림에 가까우면 그 값으로, 아니면 눈금으로.
export function settle(value, { min, max, step, wrap, snaps = [] }) {
  const range = max - min;
  const fit = (v) => (wrap ? min + mod(v - min, range) : Math.min(max, Math.max(min, v)));
  const v = fit(value);
  for (const snap of snaps) {
    const gap = Math.abs(v - snap);
    if (Math.min(gap, wrap ? range - gap : gap) <= step + 1e-9) return round4(snap);
  }
  return round4(fit(min + Math.round((v - min) / step) * step));
}

// opts: {name, min, max, step, value, wrap, snaps, major, label(v), marks: [{at, text}], ends: [왼쪽 글, 오른쪽 글], onInput(v), onRelease(v)}
export function createDial(el, opts) {
  const { min, max, step, wrap, snaps = [], major = 5, marks = [], ends } = opts;
  const tickPx = opts.tickPx ?? TICK_PX;
  const wide = tickPx > 40;                 // 자리가 몇 안 되는 다이얼. 글을 크게 쓰고, 한 번 튕겨 끝까지 날아가지 않게 한다.
  const maxSpeed = MAX_SPEED * TICK_PX / tickPx, stopSpeed = STOP * TICK_PX / tickPx;
  const count = Math.round((max - min) / step);
  el.classList.add("dial");
  el.innerHTML = `<canvas></canvas><span class="name">${opts.name}</span><span class="value"></span>`;
  const canvas = el.querySelector("canvas");
  const valueText = el.querySelector(".value");
  let value = opts.value;
  let raw = value;        // 지금 바늘 아래의 값(눈금에 맞추기 전). 끝이 있는 다이얼은 끝을 조금 넘을 수 있다.
  let lastIndex = Math.round((value - min) / step);
  let speed = 0, frame = 0, dragging = null, kickedAt = -1000;

  // ── 그리기 ──────────────────────────────────────────────────────────
  // 생김새는 시간 한량(2권)의 유리 다이얼이다(시험판 overlay-proto.html 의 drawDial 을 옮겼다). 별자리판 같은 짙은 남색의
  // 두꺼운 유리, 은은하게 빛나는 금빛 테, 유리 속에서 함께 도는 북두칠성과 별가루, 굴릴 때 유리 위의 반짝임.
  // 2권은 화면 아래에 큰 원반 하나를 두지만 여기는 한 화면에 넷이라, 원반의 윗머리만 보이는 낮은 띠로 놓았다.
  let sparks = [], lastCenter = null, owed = 0, sparkFrame = 0;

  function draw() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w) return;   // 아직 화면에 없다. 보이게 되면 다시 그린다(아래의 ResizeObserver).
    const ratio = globalThis.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
    const c = canvas.getContext("2d");
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);

    const now = performance.now();
    const good = el.classList.contains("good");   // 값이 맞는 자리에 있으면 테가 초록으로 빛난다
    const RIM = good ? "#8fe39a" : GOLD, RIM_LIT = good ? "#d6ffdc" : GOLD_LIT, RIM_SHADE = good ? "#3f9a52" : GOLD_SHADE;
    const GLOW = good ? "150,240,165" : "255,236,180";
    const radius = w * 1.6, cx = w / 2, apex = 13, cy = apex + radius;
    const center = (raw - min) / step;   // 바늘 아래에 있는 눈금의 번호
    const disc = () => { c.beginPath(); c.arc(cx, cy, radius, 0, Math.PI * 2); };
    // 눈금 u 가 테에서 depth 픽셀 안쪽에 놓이는 자리
    const at = (u, depth) => { const a = ((u - center) * tickPx) / radius; return { x: cx + Math.sin(a) * (radius - depth), y: cy - Math.cos(a) * (radius - depth) }; };
    const ring = (r, colour, width, alpha = 1, dash = null) => {
      c.globalAlpha = alpha; c.strokeStyle = colour; c.lineWidth = width;
      if (dash) c.setLineDash(dash);
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    };
    const arc = (r, from, to, colour, width, blur = 0) => {
      c.save(); c.strokeStyle = colour; c.lineWidth = width; c.lineCap = "round";
      if (blur) { c.shadowColor = colour; c.shadowBlur = blur; }
      c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2 + from, -Math.PI / 2 + to); c.stroke(); c.restore();
    };
    const star = (x, y, size) => {   // 네 갈래 별
      c.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 === 0 ? size : size * 0.3, a = (i * Math.PI) / 4 - Math.PI / 2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath();
    };
    const span = Math.ceil((w / 2 + 24) / tickPx);   // 화면에 들어오는 눈금 수의 절반
    const seen = (i) => wrap || (i >= 0 && i <= count);

    // 유리. 테 위에 옅은 그림자가 진다.
    c.save(); c.shadowColor = "rgba(0,0,0,.45)"; c.shadowBlur = 9; c.shadowOffsetY = -1;
    const glass = c.createLinearGradient(0, apex, 0, h);
    glass.addColorStop(0, GLASS_TOP); glass.addColorStop(1, GLASS_FOOT);
    c.fillStyle = glass; disc(); c.fill(); c.restore();

    // 유리 속의 별자리판. 다이얼과 함께 돈다: 점선 동그라미, 별가루, 북두칠성. 꾸밈이지 계산한 하늘이 아니다.
    c.save(); disc(); c.clip();
    ring(radius - 46, GOLD, 0.8, 0.45, [5, 6]);
    const unit = 12 / tickPx;   // 12픽셀을 눈금 수로. 별가루와 북두칠성은 눈금의 너비와 상관없이 같은 촘촘함으로 놓는다.
    const first = Math.floor((center - span) / unit), last = Math.ceil((center + span) / unit);
    c.fillStyle = "#ffffff";
    for (let i = first; i <= last; i++) for (let k = 0; k < 2; k++) {
      if (chance(i, 20 + k) > 0.55) continue;
      const p = at((i + chance(i, 30 + k) - 0.5) * unit, 28 + chance(i, 40 + k) * 30);
      c.globalAlpha = 0.18 + chance(i, 50 + k) * 0.3;
      c.beginPath(); c.arc(p.x, p.y, 0.7, 0, Math.PI * 2); c.fill();
    }
    for (let n = Math.floor(first / DIPPER_EVERY) - 1; n <= Math.floor(last / DIPPER_EVERY) + 1; n++) {
      const middle = (n * DIPPER_EVERY + DIPPER_EVERY / 2) * unit;
      const spot = ({ east, north }) => at(middle - (east * DIPPER_PX_PER_DEG) / tickPx, DIPPER_DEPTH - north * DIPPER_PX_PER_DEG);
      const stars = DIPPER.map(spot);
      c.strokeStyle = GOLD_BRIGHT; c.lineWidth = 0.8; c.globalAlpha = 0.32;   // 글 뒤에 깔리는 바탕이라 옅게
      c.beginPath();
      for (const [from, to] of DIPPER_LINES) { c.moveTo(stars[from].x, stars[from].y); c.lineTo(stars[to].x, stars[to].y); }
      c.stroke();
      c.fillStyle = GOLD_BRIGHT;
      DIPPER.forEach((one, k) => {
        c.save(); c.globalAlpha = 0.5;
        if (one.bright) { c.shadowColor = GOLD_BRIGHT; c.shadowBlur = 3; star(stars[k].x, stars[k].y, 3); c.fill(); }
        else { c.beginPath(); c.arc(stars[k].x, stars[k].y, 1.2, 0, Math.PI * 2); c.fill(); }
        c.restore();
      });
    }
    c.globalAlpha = 1;
    // 유리 윗부분을 가로지르는 윤기
    const sheen = c.createLinearGradient(0, apex, 0, apex + 34);
    sheen.addColorStop(0, "rgba(160,180,255,.16)"); sheen.addColorStop(1, "rgba(160,180,255,0)");
    c.fillStyle = sheen; c.fillRect(0, apex, w, 34);
    // 유리의 두께: 테 바로 안의 빛 띠, 깎인 면이 끝나는 어두운 줄, 그 아래 가는 빛, 짧은 되비침 둘
    ring(radius - 8 - BEVEL / 2, "rgba(190,210,255,1)", BEVEL, 0.15);
    ring(radius - 9 - BEVEL, "rgba(0,0,16,1)", 2, 0.55);
    ring(radius - 11 - BEVEL, "rgba(170,195,255,1)", 1, 0.3);
    arc(radius - 8 - BEVEL / 2, -0.16, -0.05, "rgba(255,255,255,.5)", 2, 6);
    arc(radius - 8 - BEVEL / 2, 0.08, 0.12, "rgba(255,255,255,.35)", 1.6, 4);
    // 굴릴 때의 반짝임: 지난 장면보다 많이 돌았을수록 많이 켜진다. 유리에 붙어 함께 돌고 3분의 1초에 사라진다.
    const turned = lastCenter === null ? 0 : Math.abs(center - lastCenter) / unit;
    owed = Math.min(5, owed + turned * 1.2);
    while (owed >= 1 && sparks.length < 24) {
      owed -= 1;
      sparks.push({ u: center + (Math.random() - 0.5) * (w / tickPx), depth: 6 + Math.random() * 46, size: 2 + Math.random() * 3, born: now });
    }
    sparks = sparks.filter((spark) => now - spark.born < SPARK_MS);
    for (const spark of sparks) {
      const p = at(spark.u, spark.depth), life = (now - spark.born) / SPARK_MS;
      c.save(); c.globalAlpha = Math.sin(life * Math.PI); c.shadowColor = "rgba(255,255,255,.95)"; c.shadowBlur = 8; c.fillStyle = "#ffffff";
      star(p.x, p.y, spark.size * (0.6 + 0.4 * Math.sin(life * Math.PI))); c.fill(); c.restore();
    }
    lastCenter = center;
    // 테가 빛을 받는 곳에 맺힌 빛
    for (const [angle, size] of [[-0.13, 4.5], [0.06, 3.2], [0.16, 3.8]]) {
      c.save(); c.globalAlpha = 0.8; c.shadowColor = "rgba(255,255,255,.95)"; c.shadowBlur = 8; c.fillStyle = "#ffffff";
      star(cx + Math.sin(angle) * (radius - 3), cy - Math.cos(angle) * (radius - 3), size); c.fill(); c.restore();
    }
    // 가장자리에 빛이 모인다
    ring(radius - 7, `rgba(${GLOW},1)`, 12, good ? 0.3 : 0.18);
    c.restore();
    // 그 빛이 테 밖으로 조금 넘친다
    c.save(); c.shadowColor = `rgba(${GLOW},.85)`; c.shadowBlur = good ? 14 : 10; ring(radius - 1, `rgba(${GLOW},.9)`, 1.5); c.restore();
    // 금빛 테 둘, 그 사이가 유리다
    ring(radius - 1.2, RIM, 2.4); ring(radius - 0.3, RIM_LIT, 0.7, 0.9); ring(radius - 6, RIM, 1.2, 0.9); ring(radius - 7, RIM_SHADE, 0.6, 0.8);

    // 눈금: 가는 금빛. 큰 눈금은 길고 굵다.
    c.strokeStyle = GOLD_LIT; c.lineCap = "butt";
    for (let i = Math.floor(center) - span; i <= Math.ceil(center) + span; i++) {
      if (!seen(i)) continue;
      const big = mod(i, major) === 0, long = big ? 15 : 7;
      const from = at(i, 11), to = at(i, 11 + long);
      c.globalAlpha = big ? 1 : 0.5; c.lineWidth = big ? 2 : 1;
      c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(to.x, to.y); c.stroke();
    }
    // 눈금 아래의 글(달 이름, 정각, 자리의 이름, 양 끝). 바로 선 글씨.
    c.fillStyle = GOLD_LIT; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `600 ${wide ? 15 : 12}px ${FONT}`;
    const write = (u, text, alpha = 1) => {
      const p = at(u, 11 + 15 + 12);
      if (p.x < -20 || p.x > w + 20) return;
      // 바늘 아래에 온 글이 가장 밝다(자리가 몇 안 되는 다이얼에서 지금 고른 것이 보이게).
      const near = Math.max(0, 1 - Math.abs(u - center) * (wide ? 1 : 0));
      // 가장자리로 갈수록 글이 띠 아래로 내려가 잘리므로, 그 전에 흐려지게 한다.
      const edge = Math.min(1, Math.max(0, (1 - Math.abs(p.x - cx) / (w / 2)) / 0.3));
      c.globalAlpha = alpha * edge * (wide ? 0.55 + 0.45 * near : 1);
      c.fillText(text, p.x, p.y);
    };
    for (const mark of marks) for (const turn of wrap ? [-1, 0, 1] : [0]) write((mark.at - min) / step + turn * count, mark.text);
    if (ends) { write(0, ends[0], 0.85); write(count, ends[1], 0.85); }
    c.globalAlpha = 1;
    // 걸림의 표시: 테 위에서 빛나는 작은 별. 넷이 똑같이 생겼다.
    for (const snap of snaps) for (const turn of wrap ? [-1, 0, 1] : [0]) {
      const u = (snap - min) / step + turn * count;
      const p = at(u, 3.5);
      if (p.x < -10 || p.x > w + 10) continue;
      c.save(); c.shadowColor = "rgba(255,233,168,.95)"; c.shadowBlur = 8; c.fillStyle = GOLD_BRIGHT; star(p.x, p.y, 5.5); c.fill(); c.restore();
    }

    // 띠의 아래 끝에서 유리가 어둠 속으로 잦아든다.
    const foot = c.createLinearGradient(0, h - 14, 0, h);
    foot.addColorStop(0, "rgba(5,3,48,0)"); foot.addColorStop(1, "rgba(5,3,48,1)");
    c.fillStyle = foot; c.fillRect(0, h - 14, w, 14);

    // 바늘: 테 위에 박힌 금빛 화살촉. 눈금이 지나갈 때 1픽셀 내려앉는다.
    const tip = apex + 3 + (now - kickedAt < KICK_MS ? 1 : 0);
    const head = () => { c.beginPath(); c.moveTo(cx - 7, tip - 13); c.lineTo(cx + 7, tip - 13); c.lineTo(cx, tip); c.closePath(); };
    c.save(); c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 4; c.shadowOffsetY = 1;
    const gold = c.createLinearGradient(cx - 7, 0, cx + 7, 0);
    gold.addColorStop(0, RIM_LIT); gold.addColorStop(0.5, RIM); gold.addColorStop(1, RIM_SHADE);
    c.fillStyle = gold; head(); c.fill(); c.restore();
    c.strokeStyle = RIM_SHADE; c.lineWidth = 0.8; head(); c.stroke();

    valueText.textContent = opts.label ? opts.label(value) : "";
    // 반짝임이 남아 있거나 바늘이 내려앉아 있으면 한 장면 더 그린다.
    if ((sparks.length || now - kickedAt < KICK_MS) && !sparkFrame) sparkFrame = requestAnimationFrame(() => { sparkFrame = 0; if (el.isConnected) draw(); });
  }

  // 바늘 아래의 값을 옮긴다. 눈금을 넘을 때마다 소리와 떨림이 난다. 굴리는 동안에는 걸리지 않는다.
  function move(next) {
    if (!el.isConnected) { cancelAnimationFrame(frame); return; }
    raw = wrap ? next : Math.min(max + OVER * step, Math.max(min - OVER * step, next));
    const v = settle(raw, { min, max, step, wrap });
    const index = Math.round((v - min) / step);
    if (index !== lastIndex) {
      const big = mod(index, major) === 0;
      click(big);
      kickedAt = performance.now();
      try { navigator.vibrate?.(big ? 6 : 3); } catch { /* 떨림이 없는 기기 */ }
      lastIndex = index;
    }
    if (v !== value) { value = v; opts.onInput?.(value); }
    draw();
  }

  // 멎을 자리(눈금이나 걸림)까지 부드럽게 끌려간다. 다 가면 onRelease.
  function land() {
    const goal = settle(raw, { min, max, step, wrap, snaps });
    let gap = goal - raw;
    if (wrap) gap = mod(gap + (max - min) / 2, max - min) - (max - min) / 2;
    const caught = snaps.some((s) => s === goal || round4(s) === goal);
    const tick = () => {
      gap *= 0.6;
      if (Math.abs(gap) < step * 0.02) {
        raw = goal;
        if (goal !== value) { value = goal; opts.onInput?.(value); }
        if (caught) { click(true); try { navigator.vibrate?.(12); } catch { /* 없음 */ } }
        draw();
        frame = 0;
        if (el.isConnected) opts.onRelease?.(value);   // 화면이 바뀐 뒤에 멎은 옛 다이얼은 아무것도 적지 않는다
        return;
      }
      move(goal - gap);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  // 놓은 뒤: 굴리던 힘으로 더 돌다가 느려지면 멎을 자리를 찾는다. 끝을 넘으면 바로 되돌아온다.
  function glide() {
    const tick = () => {
      speed *= FRICTION;
      const out = !wrap && (raw < min || raw > max);
      if (Math.abs(speed) < stopSpeed || out) { speed = 0; land(); return; }
      move(raw + speed * step);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  el.addEventListener("pointerdown", (e) => {
    cancelAnimationFrame(frame); frame = 0; speed = 0;
    dragging = { x: e.clientX, raw, lastX: e.clientX, lastT: performance.now() };
    try { el.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 끌 수는 있다 */ }
    el.classList.remove("hint");
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(1, now - dragging.lastT);
    // 방금의 빠르기(눈금/장면). 앞의 값과 섞어 손떨림을 누른다.
    const fresh = -((e.clientX - dragging.lastX) / tickPx) / (dt / 16.7);
    speed = speed * 0.6 + fresh * 0.4;
    dragging.lastX = e.clientX; dragging.lastT = now;
    let next = dragging.raw - ((e.clientX - dragging.x) / tickPx) * step;
    // 끝을 넘으면 고무줄처럼 뻑뻑해진다.
    if (!wrap && next > max) next = max + (next - max) * 0.3;
    if (!wrap && next < min) next = min + (next - min) * 0.3;
    move(next);
  });
  const up = () => {
    if (!dragging) return;
    const still = performance.now() - dragging.lastT > 80;   // 멈췄다가 놓으면 더 돌지 않는다
    dragging = null;
    speed = still ? 0 : Math.max(-maxSpeed, Math.min(maxSpeed, speed));
    glide();
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  let wheelTimer = 0;
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    cancelAnimationFrame(frame); frame = 0; speed = 0;
    el.classList.remove("hint");
    move(settle(raw, { min, max, step, wrap }) + Math.sign(e.deltaY || e.deltaX) * step);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(land, 220);
  }, { passive: false });

  if (globalThis.ResizeObserver) new ResizeObserver(draw).observe(el);
  draw();
  return {
    set(v) { value = raw = v; draw(); },
    shake() { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); },
    hint(on) { el.classList.toggle("hint", on); },
    good(on) { if (el.classList.contains("good") === on) return; el.classList.toggle("good", on); if (on) el.classList.remove("hint"); draw(); },   // 이 다이얼의 값이 맞는 자리에 있다   // 소라가 짚은 것을 고칠 다이얼에 금빛 테가 돈다
  };
}
