// 가로 눈금 다이얼 하나. 가운데에 바늘이 서 있고, 끌면 눈금이 흐른다. PC에서는 휠로도 굴린다.
// 2권의 둥근 유리 다이얼은 한 화면에 넷을 둘 수 없어 쓰지 않고, 걸림과 눈금 소리만 가져왔다.

import { click } from "./sound.js";

const TICK_PX = 12;   // 한 눈금의 너비
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

// opts: {name, min, max, step, value, wrap, snaps, major, label(v), onInput(v), onRelease(v)}
export function createDial(el, opts) {
  const { min, max, step, wrap, snaps = [], major = 5 } = opts;
  el.classList.add("dial");
  el.innerHTML = `<canvas></canvas><i class="needle"></i><span class="name">${opts.name}</span><span class="value"></span>`;
  const canvas = el.querySelector("canvas");
  const valueText = el.querySelector(".value");
  let value = opts.value;
  let raw = value;        // 끄는 동안의 값(눈금에 맞추기 전)
  let lastIndex = Math.round((value - min) / step);

  function draw() {
    const w = el.clientWidth || 345, h = el.clientHeight || 44, ratio = globalThis.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
    const g = canvas.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, w, h);
    const center = (raw - min) / step;   // 바늘 아래에 있는 눈금의 번호
    const half = Math.ceil(w / 2 / TICK_PX) + 1;
    const count = Math.round((max - min) / step);
    for (let i = Math.floor(center) - half; i <= Math.ceil(center) + half; i++) {
      if (!wrap && (i < 0 || i > count)) continue;
      const x = w / 2 + (i - center) * TICK_PX;
      const big = mod(i, major) === 0;
      g.fillStyle = big ? "rgba(246,185,81,.95)" : "rgba(251,248,249,.55)";
      g.fillRect(Math.round(x), h - (big ? 20 : 12), big ? 2 : 1, big ? 20 : 12);
    }
    // 걸림의 표시. 넷이 똑같이 생겼다.
    g.fillStyle = "rgba(251,248,249,.9)";
    for (const snap of snaps) {
      for (const turn of wrap ? [-1, 0, 1] : [0]) {
        const x = w / 2 + ((snap - min) / step + turn * count - center) * TICK_PX;
        g.beginPath(); g.moveTo(x, h - 27); g.lineTo(x + 4, h - 23); g.lineTo(x, h - 19); g.lineTo(x - 4, h - 23); g.fill();
      }
    }
    valueText.textContent = opts.label ? opts.label(value) : "";
  }

  function input(next) {
    raw = next;
    if (!wrap) raw = Math.min(max, Math.max(min, raw));
    const v = settle(raw, { min, max, step, wrap });   // 굴리는 동안에는 걸리지 않는다
    const index = Math.round((v - min) / step);
    if (index !== lastIndex) { click(mod(index, major) === 0); lastIndex = index; }
    if (v !== value) { value = v; opts.onInput?.(value); }
    draw();
  }

  function release() {
    const v = settle(raw, { min, max, step, wrap, snaps });
    raw = v;
    if (v !== value) { value = v; opts.onInput?.(value); }
    draw();
    opts.onRelease?.(value);
  }

  let dragFrom = null;
  el.addEventListener("pointerdown", (e) => {
    dragFrom = { x: e.clientX, raw };
    try { el.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 끌 수는 있다 */ }
  });
  el.addEventListener("pointermove", (e) => {
    if (dragFrom) input(dragFrom.raw - (e.clientX - dragFrom.x) / TICK_PX * step);
  });
  const up = () => { if (dragFrom) { dragFrom = null; release(); } };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  let wheelTimer = 0;
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    input(raw + Math.sign(e.deltaY || e.deltaX) * step);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(release, 250);
  }, { passive: false });

  draw();
  return {
    set(v) { value = raw = v; draw(); },
    shake() { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); },
  };
}
