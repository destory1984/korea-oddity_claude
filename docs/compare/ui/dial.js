// 가로 다이얼 하나. 카메라 렌즈의 링처럼 생겼고 그렇게 돈다.
// 끌면 눈금이 흐르고, 놓으면 굴리던 힘으로 더 돌다가 눈금에 딱 멎는다. PC에서는 휠로도 굴린다.

import { click } from "./sound.js";

const TICK_PX = 12;        // 가운데에서 한 눈금의 너비. opts.tickPx 로 바꿀 수 있다(자리가 셋뿐인 다이얼은 넓게).
const FRICTION = 0.9;      // 놓은 뒤 한 장면(1/60초)마다 남는 빠르기. 렌즈의 링은 기름을 먹어 묵직하다: 조금만 더 돌고 멎는다.
const STOP = 0.02;         // 이보다 느려지면(눈금/장면) 멎을 자리를 찾는다
const MAX_SPEED = 1.5;     // 눈금/장면
const OVER = 1.5;          // 끝이 있는 다이얼이 끝을 넘어 늘어나는 눈금 수
const GOLD_LIT = "#f3dc9a", GOLD_BRIGHT = "#ffe9a8";
const KICK_MS = 80;          // 눈금이 지나갈 때 기준선이 이만큼 동안 밝아진다

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
  let speed = 0, frame = 0, dragging = null, kickedAt = -1000, kickFrame = 0;

  // ── 그리기 ──────────────────────────────────────────────────────────
  // 카메라 렌즈의 링이다(사용자, 2026.10.10: "카메라 렌즈 돌리는 것처럼 하자"). 렌즈 경통을 옆에서 본 모습으로,
  // 위쪽은 눈금과 글이 새겨진 띠, 아래쪽은 손에 잡히는 톱니 띠다. 둘이 함께 돌고, 둥근 통이라 가장자리로 갈수록
  // 눈금이 촘촘해지고 어두워진다. 가운데 위의 금빛 표시는 움직이지 않는 기준선이다.
  // 색은 시리즈의 남색과 금빛을 지켰다: 검푸른 경통, 흰 새김, 금빛 강조.
  function draw() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w) return;   // 아직 화면에 없다. 보이게 되면 다시 그린다(아래의 ResizeObserver).
    const ratio = globalThis.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
    const c = canvas.getContext("2d");
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);

    const good = el.classList.contains("good");   // 값이 맞는 자리에 있으면 기준선이 초록으로 켜진다
    const MARK = good ? "#8fe39a" : GOLD_BRIGHT;
    const cx = w / 2, radius = w * 0.62;
    const band = Math.round(h * 0.6);    // 눈금 띠의 높이. 그 아래는 톱니 띠다.
    const center = (raw - min) / step;   // 기준선 아래에 있는 눈금의 번호
    // 링 위의 자리 u(눈금 번호)가 화면에서 보이는 곳. face 는 그 자리가 이쪽을 얼마나 바라보는가(가운데 1, 가장자리 0).
    const at = (u) => {
      const a = ((u - center) * tickPx) / radius;
      return Math.abs(a) < Math.PI / 2 ? { x: cx + Math.sin(a) * radius, face: Math.cos(a) } : null;
    };
    const reach = Math.ceil((radius * Math.PI / 2) / tickPx) + 1;
    const seen = (i) => wrap || (i >= 0 && i <= count);

    // 눈금 띠: 매끈한 검푸른 경통
    const barrel = c.createLinearGradient(0, 0, 0, band);
    barrel.addColorStop(0, "#1b2140"); barrel.addColorStop(0.5, "#101531"); barrel.addColorStop(1, "#0a0d22");
    c.fillStyle = barrel; c.fillRect(0, 0, w, band);

    // 새긴 눈금. 큰 눈금은 길고 금빛이다.
    for (let i = Math.floor(center) - reach; i <= Math.ceil(center) + reach; i++) {
      if (!seen(i)) continue;
      const p = at(i);
      if (!p) continue;
      const big = mod(i, major) === 0, tall = big ? 9 : 5;
      c.globalAlpha = (big ? 1 : 0.65) * p.face;
      c.fillStyle = big ? GOLD_LIT : "#e9e6dc";
      const thick = (big ? 2 : 1.2) * Math.max(0.4, p.face);
      c.fillRect(p.x - thick / 2, band - 3 - tall, thick, tall);
    }
    // 새긴 글(달 이름, 정각, 자리의 이름, 양 끝). 통이 둥글어 가장자리의 글은 옆으로 눌려 보인다.
    c.textAlign = "center"; c.textBaseline = "middle"; c.font = `700 ${wide ? 15 : 12}px ${FONT}`;
    const write = (u, text, colour) => {
      const p = at(u);
      if (!p || p.face < 0.2) return;
      const here = Math.abs(u - center) < 0.5;   // 기준선 아래에 온 글
      c.save();
      c.translate(p.x, wide ? band / 2 - 3 : band - 21);
      c.scale(p.face, 1);
      // 링의 이름(왼쪽)과 지금 값(오른쪽)이 적힌 자리에서는 새긴 글이 비켜 준다.
      const clear = wide ? 1 : Math.min(1, Math.max(0, Math.min(p.x - 58, w - 76 - p.x) / 18));
      c.globalAlpha = p.face * p.face * clear * (wide && !here ? 0.6 : 1);
      c.fillStyle = wide && here ? GOLD_BRIGHT : colour;
      c.fillText(text, 0, 0);
      c.restore();
    };
    for (const mark of marks) for (const turn of wrap ? [-1, 0, 1] : [0]) write((mark.at - min) / step + turn * count, mark.text, "#f1eee4");
    if (ends) { write(0, ends[0], GOLD_LIT); write(count, ends[1], GOLD_LIT); }
    // 걸림의 표시: 눈금 위의 금빛 점. 넷이 똑같이 생겼다.
    for (const snap of snaps) for (const turn of wrap ? [-1, 0, 1] : [0]) {
      const p = at((snap - min) / step + turn * count);
      if (!p) continue;
      c.globalAlpha = p.face; c.fillStyle = "#f6b951";
      c.beginPath(); c.ellipse(p.x, band - 15.5, 2.6 * Math.max(0.4, p.face), 2.6, 0, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;

    // 톱니 띠: 손에 잡히는 골. 6픽셀마다 한 줄이고 링과 함께 돈다.
    c.fillStyle = "#07091a"; c.fillRect(0, band, w, h - band);
    const pitch = 6 / tickPx;   // 골 하나의 너비를 눈금 수로
    const firstRidge = Math.floor((center - reach) / pitch), lastRidge = Math.ceil((center + reach) / pitch);
    for (let k = firstRidge; k <= lastRidge; k++) {
      const p = at(k * pitch), q = at((k + 0.5) * pitch);
      if (!p || !q) continue;
      const wide2 = Math.max(0.6, q.x - p.x);
      c.globalAlpha = 0.25 + 0.75 * p.face;
      const ridge = c.createLinearGradient(p.x, 0, p.x + wide2, 0);
      ridge.addColorStop(0, "#4a5170"); ridge.addColorStop(1, "#1d2138");
      c.fillStyle = ridge; c.fillRect(p.x, band + 2, wide2, h - band - 4);
    }
    c.globalAlpha = 1;
    // 띠의 모서리: 눈금 띠와 톱니 띠 사이의 깎인 면, 링의 위아래 끝
    c.fillStyle = "rgba(255,255,255,.22)"; c.fillRect(0, 0, w, 1);
    c.fillStyle = "rgba(0,0,0,.7)"; c.fillRect(0, band - 1, w, 1.5);
    c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(0, band + 0.5, w, 1);
    c.fillStyle = "rgba(0,0,0,.85)"; c.fillRect(0, h - 2, w, 2);

    // 둥근 통의 빛: 양 끝은 어둡고, 가운데에서 조금 비낀 곳에 빛줄기가 선다.
    const shade = c.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, "rgba(2,3,14,.95)"); shade.addColorStop(0.2, "rgba(2,3,14,.35)"); shade.addColorStop(0.38, "rgba(255,255,255,.07)");
    shade.addColorStop(0.5, "rgba(255,255,255,0)"); shade.addColorStop(0.8, "rgba(2,3,14,.4)"); shade.addColorStop(1, "rgba(2,3,14,.95)");
    c.fillStyle = shade; c.fillRect(0, 0, w, h);

    // 기준선: 경통에 찍힌 금빛 세모와 줄. 움직이지 않는다. 눈금이 지나갈 때 잠깐 밝아진다.
    const lit = performance.now() - kickedAt < KICK_MS;
    c.save();
    c.shadowColor = MARK; c.shadowBlur = good ? 10 : lit ? 8 : 4;
    c.fillStyle = MARK;
    c.beginPath(); c.moveTo(cx - 5, 0); c.lineTo(cx + 5, 0); c.lineTo(cx, 7); c.closePath(); c.fill();
    c.fillRect(cx - 0.75, band - 3 - 11, 1.5, 11);
    c.restore();

    valueText.textContent = opts.label ? opts.label(value) : "";
    if (lit && !kickFrame) kickFrame = requestAnimationFrame(() => { kickFrame = 0; if (el.isConnected) setTimeout(() => el.isConnected && draw(), KICK_MS); });
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
