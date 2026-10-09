// 가로 다이얼 하나. 유리 뒤에서 도는 둥근 통처럼 보인다: 눈금이 가장자리로 갈수록 촘촘해지고 흐려진다.
// 끌면 눈금이 흐르고, 놓으면 굴리던 힘으로 더 돌다가 눈금에 딱 멎는다. PC에서는 휠로도 굴린다.
// 색은 2권의 유리 다이얼(시험판의 drawDial)에서 가져왔다. 둥근 다이얼은 한 화면에 넷을 둘 수 없어 띠로 폈다.

import { click } from "./sound.js";

const TICK_PX = 12;        // 가운데에서 한 눈금의 너비
const FRICTION = 0.94;     // 놓은 뒤 한 장면(1/60초)마다 남는 빠르기
const STOP = 0.02;         // 이보다 느려지면(눈금/장면) 멎을 자리를 찾는다
const MAX_SPEED = 1.5;     // 눈금/장면
const OVER = 1.5;          // 끝이 있는 다이얼이 끝을 넘어 늘어나는 눈금 수
const GLASS_TOP = "#0c1442", GLASS_FOOT = "#04061e";
const GOLD = "#d8b866", GOLD_LIT = "#f3dc9a", GOLD_BRIGHT = "#ffe9a8";
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
  const count = Math.round((max - min) / step);
  el.classList.add("dial");
  el.innerHTML = `<canvas></canvas><span class="name">${opts.name}</span><span class="value"></span>`;
  const canvas = el.querySelector("canvas");
  const valueText = el.querySelector(".value");
  let value = opts.value;
  let raw = value;        // 지금 바늘 아래의 값(눈금에 맞추기 전). 끝이 있는 다이얼은 끝을 조금 넘을 수 있다.
  let lastIndex = Math.round((value - min) / step);
  let speed = 0, frame = 0, dragging = null;

  function draw() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w) return;   // 아직 화면에 없다. 보이게 되면 다시 그린다(아래의 ResizeObserver).
    const ratio = globalThis.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
    const g = canvas.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, w, h);

    const glass = g.createLinearGradient(0, 0, 0, h);
    glass.addColorStop(0, GLASS_TOP); glass.addColorStop(1, GLASS_FOOT);
    g.fillStyle = glass; g.fillRect(0, 0, w, h);

    // 둥근 통: 눈금 i 는 가운데에서 각도 a 만큼 돌아가 있고, 옆으로 갈수록 좁아지고 흐려진다.
    const radius = w * 0.6, center = (raw - min) / step;
    const reach = Math.ceil((radius * Math.PI / 2) / TICK_PX);
    const place = (i) => {
      const a = ((i - center) * TICK_PX) / radius;
      return Math.abs(a) < Math.PI / 2 ? { x: w / 2 + Math.sin(a) * radius, face: Math.cos(a) } : null;
    };
    for (let i = Math.floor(center) - reach; i <= Math.ceil(center) + reach; i++) {
      if (!wrap && (i < 0 || i > count)) continue;
      const p = place(i);
      if (!p) continue;
      const big = mod(i, major) === 0, tall = big ? 17 : 9;
      g.globalAlpha = (big ? 0.95 : 0.5) * p.face;
      g.fillStyle = big ? GOLD_LIT : "#cfd6ff";
      g.fillRect(p.x - (big ? 0.9 : 0.5), h - 4 - tall, big ? 1.8 : 1, tall);
    }
    // 눈금 위의 글(달 이름, 시각의 숫자)
    g.font = `600 11px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = GOLD_LIT;
    for (const mark of marks) for (const turn of wrap ? [-1, 0, 1] : [0]) {
      const p = place((mark.at - min) / step + turn * count);
      if (!p || p.face < 0.25) continue;
      g.globalAlpha = 0.85 * p.face * p.face;
      g.fillText(mark.text, p.x, h - 25);
    }
    // 걸림의 표시. 네 갈래 작은 별, 넷이 똑같이 생겼다.
    g.fillStyle = GOLD_BRIGHT;
    for (const snap of snaps) for (const turn of wrap ? [-1, 0, 1] : [0]) {
      const p = place((snap - min) / step + turn * count);
      if (!p) continue;
      g.globalAlpha = p.face;
      g.beginPath();
      for (let k = 0; k < 8; k++) { const r = k % 2 ? 1.4 : 4.2, a = (k * Math.PI) / 4; g.lineTo(p.x + Math.sin(a) * r, h - 31 - Math.cos(a) * r - 8); }
      g.fill();
    }
    // 끝이 있는 다이얼의 양 끝 글(왼쪽, 오른쪽)
    if (ends) {
      g.font = `600 11px ${FONT}`; g.fillStyle = "#cfd6ff";
      for (const [i, text] of [[0, ends[0]], [count, ends[1]]]) {
        const p = place(i);
        if (p && p.face > 0.25) { g.globalAlpha = 0.8 * p.face; g.fillText(text, p.x, h - 25); }
      }
    }
    g.globalAlpha = 1;

    // 유리의 윤기와 양옆의 그늘
    const sheen = g.createLinearGradient(0, 0, 0, h * 0.45);
    sheen.addColorStop(0, "rgba(160,180,255,.2)"); sheen.addColorStop(1, "rgba(160,180,255,0)");
    g.fillStyle = sheen; g.fillRect(0, 0, w, h * 0.45);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(4,6,30,.9)"); side.addColorStop(0.16, "rgba(4,6,30,0)");
    side.addColorStop(0.84, "rgba(4,6,30,0)"); side.addColorStop(1, "rgba(4,6,30,.9)");
    g.fillStyle = side; g.fillRect(0, 0, w, h);

    // 바늘: 금빛 줄과 위아래의 세모
    g.save();
    g.shadowColor = GOLD_BRIGHT; g.shadowBlur = 6;
    g.fillStyle = GOLD_BRIGHT; g.fillRect(w / 2 - 0.75, 6, 1.5, h - 10);
    g.beginPath(); g.moveTo(w / 2 - 5, 0); g.lineTo(w / 2 + 5, 0); g.lineTo(w / 2, 7); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 4, h); g.lineTo(w / 2 + 4, h); g.lineTo(w / 2, h - 5); g.fill();
    g.restore();

    valueText.textContent = opts.label ? opts.label(value) : "";
  }

  // 바늘 아래의 값을 옮긴다. 눈금을 넘을 때마다 소리와 떨림이 난다. 굴리는 동안에는 걸리지 않는다.
  function move(next) {
    raw = wrap ? next : Math.min(max + OVER * step, Math.max(min - OVER * step, next));
    const v = settle(raw, { min, max, step, wrap });
    const index = Math.round((v - min) / step);
    if (index !== lastIndex) {
      const big = mod(index, major) === 0;
      click(big);
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
        opts.onRelease?.(value);
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
      if (Math.abs(speed) < STOP || out) { speed = 0; land(); return; }
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
    const fresh = -((e.clientX - dragging.lastX) / TICK_PX) / (dt / 16.7);
    speed = speed * 0.6 + fresh * 0.4;
    dragging.lastX = e.clientX; dragging.lastT = now;
    let next = dragging.raw - ((e.clientX - dragging.x) / TICK_PX) * step;
    // 끝을 넘으면 고무줄처럼 뻑뻑해진다.
    if (!wrap && next > max) next = max + (next - max) * 0.3;
    if (!wrap && next < min) next = min + (next - min) * 0.3;
    move(next);
  });
  const up = () => {
    if (!dragging) return;
    const still = performance.now() - dragging.lastT > 80;   // 멈췄다가 놓으면 더 돌지 않는다
    dragging = null;
    speed = still ? 0 : Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
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
    hint(on) { el.classList.toggle("hint", on); },   // 소라가 짚은 것을 고칠 다이얼에 금빛 테가 돈다
  };
}
