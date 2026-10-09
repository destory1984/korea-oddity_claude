// 상태값으로 받은 겹 그림을 놓아 풍경 한 장을 만든다. 장소 화면, 결과, 비교, 수첩이 함께 쓴다.
// 틀(.frame)은 가로 3, 세로 2이고 받은 그림도 3:2라, 놓는 값은 모두 틀에 대한 비율이다.

import { dayOfYear, stagedSun } from "../core/judge.js";

const SCENES = "../assets/scenes/";
const ZOOM = 1.45;   // 그림의 너비는 틀 너비의 1.45배다(시험판과 같다)

const el = (tag, cls, parent) => {
  const node = document.createElement(tag);
  node.className = cls;
  parent.appendChild(node);
  return node;
};

// 겹 한 장. horizon(그림 안의 높이)이 틀의 at 높이에 오게 놓는다. transform 의 기준점은 그 줄의 가운데다.
function layerImg(frame, cls, image, horizon, at, origin = `50% ${horizon * 100}%`) {
  const img = el("img", `layer ${cls}`, frame);
  img.src = `${SCENES}${image}.webp`;
  img.alt = "";
  img.draggable = false;
  img.style.top = `${(at - horizon * ZOOM) * 100}%`;
  img.style.transformOrigin = origin;
  return img;
}

// 늘 같은 자리에 찍히는 수열(별의 자리).
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

// ── 첨성대 ──────────────────────────────────────────────────────────────

const CHEOM_SKY = {
  day: "linear-gradient(#8fc1e8, #cfe6f5)",
  dusk: "linear-gradient(#3d3a78, #b8617a 55%, #f0925a)",
  night: "linear-gradient(#0b1440, #1d2a6b)",
};
const CHEOM_LIGHT = {
  day: "none",
  dusk: "brightness(0.8) sepia(0.25) hue-rotate(-12deg)",
  night: "brightness(0.42) saturate(0.6) hue-rotate(20deg)",
};
const DEPTH = { far: 0.15, mid: 0.45, front: 1 };   // 가까이 갈 때 겹마다 커지는 몫

function buildCheom(frame, place) {
  const parts = { sky: el("div", "sky", frame), stars: el("div", "stars", frame), layers: {} };
  const rand = seeded(63);
  for (let i = 0; i < 40; i++) {
    const star = el("i", "", parts.stars);
    // 처음 열 개는 위쪽 양 끝에 둔다. 가까이에서 탑이 하늘을 가려도 별이 보인다.
    const edge = i < 10;
    const x = edge ? (i % 2 ? 0.85 + rand() * 0.13 : 0.02 + rand() * 0.13) : rand();
    star.style.left = `${x * 100}%`;
    star.style.top = `${(edge ? rand() * 0.3 : rand() * 0.5) * 100}%`;
    star.style.opacity = String(0.6 + rand() * 0.4);
  }
  for (const layer of place.layers) parts.layers[layer.id] = layerImg(frame, layer.id, layer.image, layer.horizon, layer.at);
  parts.tree = layerImg(frame, "tree", place.tree.image, place.tree.horizon, place.tree.at);
  return parts;
}

function drawCheom(parts, place, view) {
  const cam = place.camera[view.spot] ?? place.camera.B;
  parts.sky.style.background = CHEOM_SKY[view.time] ?? CHEOM_SKY.day;
  parts.stars.style.opacity = view.time === "night" ? "1" : "0";
  const light = CHEOM_LIGHT[view.time] ?? "none";
  for (const layer of place.layers) {
    const img = parts.layers[layer.id];
    img.style.transform = `scale(${1 + (cam.scale - 1) * DEPTH[layer.id]})`;
    img.style.filter = light;
  }
  const tree = place.tree;
  parts.tree.style.filter = light;
  parts.tree.style.transform = cam.tree
    ? `translateX(${tree.shift * 100}%) scale(${tree.scale})`
    : `translateX(${tree.away * 100}%) scale(${tree.scale})`;
}

// ── 풍경 한 장 ─────────────────────────────────────────────────────────

const built = new WeakMap();

// 같은 frame 에 다시 부르면 겹을 새로 만들지 않고 놓는 값만 고친다.
// opts: faded(할머니의 바랜 사진), gray(해답 미리보기), outline(윤곽선), still(옮기는 연출 없이 바로)
export function renderScene(frame, place, view, opts = {}) {
  let parts = built.get(frame);
  if (!parts || parts.placeId !== place.id) {
    frame.replaceChildren();
    parts = place.kind === "discrete" ? buildCheom(frame, place) : buildSeongsan(frame, place);
    parts.placeId = place.id;
    built.set(frame, parts);
  }
  frame.classList.toggle("faded", Boolean(opts.faded));
  frame.classList.toggle("gray", Boolean(opts.gray));
  frame.classList.toggle("outline", Boolean(opts.outline));
  frame.classList.toggle("still", Boolean(opts.still));
  if (place.kind === "discrete") drawCheom(parts, place, view);
  else drawSeongsan(parts, place, view);
}

// 저장한 사진(상태값)을 풍경으로 놓을 값으로.
export function viewOf(place, shot) {
  return place.kind === "discrete"
    ? { spot: shot.spot, time: shot.time }
    : { x: shot.x, d: shot.d, s: shot.s, h: shot.h };
}

// 과제의 본보기(옛 사진과 해답 미리보기)로 놓을 값.
export function answerView(place, taskId = 1) {
  if (place.kind === "discrete") {
    const [spot, time] = place.tasks.find((t) => t.id === taskId).answer.split("-");
    return { spot, time };
  }
  const { x, d, day, h } = place.target;
  return { x, d, s: (day + 0.5) / 365, h };
}

// ── 성산일출봉 ──────────────────────────────────────────────────────────

// 해의 높이와 방위. 계산이 없거나 실패하면 연출로 바꾸고 staged 를 켠다.
export function sunFor(place, dials) {
  try {
    const sun = globalThis.sunAt(place.latlon[0], place.latlon[1], dayOfYear(dials.s), dials.h * 60 - 540);
    if (Number.isFinite(sun.alt) && Number.isFinite(sun.az)) return { alt: sun.alt, az: sun.az, staged: false };
  } catch { /* 아래의 연출로 */ }
  return { ...stagedSun(dials.h), staged: true };
}

const SEASONS = ["winter", "spring", "summer", "autumn"];
const MID = [14, 104, 195, 287];   // 네 철의 가운데 날(1월, 4월, 7월, 10월의 15일)

// 날 번호 → 철마다의 불투명도. 이웃한 두 철의 가운데 날 사이 어디인지로 정한다.
export function seasonMix(day) {
  const mix = { winter: 0, spring: 0, summer: 0, autumn: 0 };
  for (let i = 0; i < 4; i++) {
    const from = MID[i], to = i === 3 ? MID[0] + 365 : MID[i + 1];
    const at = day < MID[0] ? day + 365 : day;
    if (at >= from && at < to) {
      const k = (at - from) / (to - from);
      mix[SEASONS[i]] = 1 - k;
      mix[SEASONS[(i + 1) % 4]] = k;
    }
  }
  return mix;
}

const SKY = { night: [11, 20, 64], dawn: [243, 181, 138], dusk: [232, 121, 74], day: [143, 193, 232] };
const lerp = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 해의 높이로 하늘의 색을 잇는다. -6도 아래는 밤, 0도는 새벽이나 저녁, 10도 위는 낮.
function skyColor(sun) {
  const low = sun.az < 180 ? SKY.dawn : SKY.dusk;
  const rgb = sun.alt < 0 ? lerp(SKY.night, low, clamp((sun.alt + 6) / 6, 0, 1)) : lerp(low, SKY.day, clamp(sun.alt / 10, 0, 1));
  return `rgb(${rgb.join(",")})`;
}

const FOOT = "50% 100%";   // 성산의 겹은 그림의 맨 아래를 기준으로 커진다. 가까이 가면 풀이 위로 솟는다.

function buildSeongsan(frame, place) {
  const parts = { sky: el("div", "sky", frame), sun: null, layers: {} };
  parts.sun = el("div", "sun", frame);
  for (const layer of place.layers) {
    if (layer.seasons) {
      parts.layers[layer.id] = Object.fromEntries(SEASONS.map((season) =>
        [season, layerImg(frame, layer.id, `${layer.image}-${season}`, layer.horizon, layer.at, FOOT)]));
    } else {
      parts.layers[layer.id] = { all: layerImg(frame, layer.id, layer.image, layer.horizon, layer.at, FOOT) };
    }
  }
  const sh = place.shadow;
  parts.shadow = layerImg(frame, "shadow", sh.image, sh.horizon, sh.at, FOOT);
  return parts;
}

function drawSeongsan(parts, place, view) {
  const sun = view.sun ?? sunFor(place, view);
  const [lowFrom, lowTo] = place.lowSun;
  parts.sky.style.background = skyColor(sun);

  // 해: 사진기는 서쪽을 본다. 방위가 화면 안(가운데 ± 절반)이고 떠 있을 때만 보인다.
  const half = place.view.fov / 2;
  const off = sun.az - place.view.azimuth;
  const seen = Math.abs(off) <= half && sun.alt > lowFrom;
  parts.sun.style.opacity = seen ? "1" : "0";
  parts.sun.style.left = `${(0.5 + off / place.view.fov) * 100}%`;
  parts.sun.style.top = `${(place.layers[0].at - sun.alt / 40) * 100}%`;

  const light = `brightness(${(0.4 + 0.6 * clamp((sun.alt + 6) / 16, 0, 1)).toFixed(3)})`;
  const mix = seasonMix(dayOfYear(view.s));
  for (const layer of place.layers) {
    const move = `translateX(${-view.x * layer.parallax * place.shiftX * 100 / ZOOM}%) scale(${1 + (1 - view.d) * layer.parallax * place.zoomNear})`;
    for (const [season, img] of Object.entries(parts.layers[layer.id])) {
      img.style.transform = move;
      img.style.filter = light;
      if (season !== "all") img.style.opacity = String(mix[season]);
    }
  }

  // 그림자: 해가 낮게 떠 있는 아침에만. 찍는 사람의 것이라 좌우와 거리에 따라 움직이지 않는다.
  const morning = sun.alt >= lowFrom && sun.alt <= lowTo && sun.az < 180;
  const long = 1 - clamp(sun.alt / lowTo, 0, 1) * 0.5;
  parts.shadow.style.opacity = morning ? "0.55" : "0";
  parts.shadow.style.transform = `scaleY(${long.toFixed(3)})`;
}
