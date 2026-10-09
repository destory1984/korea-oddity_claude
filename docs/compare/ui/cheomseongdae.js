// 첨성대 화면(B안). 촬영 지점 셋과 때 셋에서 골라 찍고, 결과를 읽어 하나만 바꿔 다시 찍는다.

import { judgeDiscrete } from "../core/judge.js";
import { renderScene, viewOf, answerView } from "./scene.js";
import { shutter as shutterSound } from "./sound.js";

const MOVE_MS = 500;   // 지점을 옮기는 연출. 그동안 셔터가 잠긴다.

// 도움 1단계: 옛 사진에서 필요한 요소에 두르는 테두리. 틀에 대한 비율 [x, y, 너비, 높이].
const HIGHLIGHT = {
  towerFull: { 1: [0.4, 0.12, 0.2, 0.26], 2: [0.4, 0.12, 0.2, 0.62] },
  grass: { 1: [0.06, 0.74, 0.88, 0.22] },
  stars: { 2: [0.05, 0.04, 0.3, 0.3] },
};

// 도움 2단계: 지금 풍경 위에 긋는 글 없는 선. viewBox 는 300 × 200.
function diagram(place, c) {
  const tags = place.states[`${c.spot}-${c.time}`] ?? [];
  const lines = [];
  if (tags.includes("topCut")) {
    lines.push(`<polyline points="110,10 120,2 130,10 140,2 150,10 160,2 170,10 180,2 190,10"/>`, `<path d="M150 46 V16 M142 26 L150 16 L158 26"/>`);
  }
  if (tags.includes("towerHidden")) {
    lines.push(`<circle cx="118" cy="70" r="26"/>`, `<path d="M118 70 H168 M158 62 L168 70 L158 78"/>`);
  }
  if (c.task === 2 && !tags.includes("stars")) {
    for (const [x, y] of [[40, 30], [70, 18], [252, 34]]) {
      lines.push(`<path class="dash" d="M${x} ${y - 8} L${x + 3} ${y - 3} L${x + 8} ${y} L${x + 3} ${y + 3} L${x} ${y + 8} L${x - 3} ${y + 3} L${x - 8} ${y} L${x - 3} ${y - 3} Z"/>`);
    }
  }
  return lines.join("");
}

export function mountCheomseongdae(root, { store, place, onShot, onBack }) {
  const c = () => store.state.cheomseongdae;
  const task = () => place.tasks.find((t) => t.id === c().task);

  root.innerHTML = `
    <header><button data-do="back">수첩</button><h1>${place.name}</h1><button data-do="old">옛 사진</button></header>
    <p class="hand memo task"></p>
    <div class="oldphoto" hidden><div class="frame"></div><div class="boxes"></div></div>
    <div class="stage">
      <div class="frame"></div>
      <svg class="lines" viewBox="0 0 300 200" hidden></svg>
      <div class="preview" hidden><div class="frame"></div></div>
      <div class="spots">${place.spots.map((s) => `<button data-spot="${s}">${place.spotNames[s]}</button>`).join("")}</div>
    </div>
    <div class="times">${place.times.map((t) => `<button data-time="${t}">${place.timeNames[t]}</button>`).join("")}</div>
    <div class="tools">
      <button data-do="compare">비교</button>
      <button class="shutter" data-do="shutter" aria-label="셔터"></button>
      <button data-do="help">도움</button>
    </div>
    <div class="sheet" hidden><div class="pair">
      <figure><div class="frame before"></div><figcaption class="hand">그 전</figcaption></figure>
      <figure><div class="frame after"></div><figcaption class="hand">방금</figcaption></figure>
    </div></div>`;

  const q = (sel) => root.querySelector(sel);
  const frame = q(".stage > .frame");
  const shutterButton = q("[data-do=shutter]");
  let moving = 0;

  function draw() {
    const s = c();
    renderScene(frame, place, { spot: s.spot, time: s.time });
    q(".task").textContent = task().memo;
    q(".times").hidden = task().timesLocked;
    for (const b of root.querySelectorAll("[data-spot]")) b.classList.toggle("on", b.dataset.spot === s.spot);
    for (const b of root.querySelectorAll("[data-time]")) b.classList.toggle("on", b.dataset.time === s.time);
    q("[data-do=compare]").disabled = s.shots.length < 2;
    drawHelp();
  }

  function drawOld(highlight) {
    const old = q(".oldphoto");
    renderScene(old.querySelector(".frame"), place, answerView(place, c().task), { faded: true, still: true });
    old.querySelector(".boxes").innerHTML = !highlight ? "" : task().need.map((tag) => {
      const [x, y, w, h] = HIGHLIGHT[tag][c().task] ?? HIGHLIGHT[tag][1];
      return `<i style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%"></i>`;
    }).join("");
  }

  function drawHelp() {
    const level = c().help;
    if (level >= 1) { q(".oldphoto").hidden = false; drawOld(true); }
    const lines = q(".lines");
    lines.toggleAttribute("hidden", level < 2);   // SVG 요소에는 hidden 속성값이 없어 attribute 로 켜고 끈다
    if (level >= 2) lines.innerHTML = diagram(place, c());
    const preview = q(".preview");
    preview.hidden = level < 3;
    if (level >= 3) renderScene(preview.querySelector(".frame"), place, answerView(place, c().task), { gray: true, still: true });
  }

  for (const b of root.querySelectorAll("[data-spot]")) {
    b.onclick = () => {
      if (b.dataset.spot === c().spot) return;
      store.setSpot(b.dataset.spot);
      // 옮기는 중에 다른 지점을 누르면 마지막에 누른 곳으로 간다. 다 옮길 때까지 셔터를 잠근다.
      shutterButton.disabled = true;
      clearTimeout(moving);
      moving = setTimeout(() => { shutterButton.disabled = false; }, MOVE_MS);
      draw();
    };
  }
  for (const b of root.querySelectorAll("[data-time]")) {
    b.onclick = () => { if (b.dataset.time !== c().time) { store.setTime(b.dataset.time); draw(); } };
  }

  q("[data-do=back]").onclick = onBack;
  q("[data-do=old]").onclick = () => {
    const old = q(".oldphoto");
    old.hidden = !old.hidden;
    if (!old.hidden) drawOld(c().help >= 1);
  };
  q("[data-do=help]").onclick = () => { store.bumpHelp(); drawHelp(); };
  q("[data-do=compare]").onclick = () => {
    const [before, after] = c().shots.slice(-2);
    renderScene(q(".before"), place, viewOf(place, before), { still: true });
    renderScene(q(".after"), place, viewOf(place, after), { still: true });
    q(".sheet").hidden = false;
  };
  q(".sheet").onclick = () => { q(".sheet").hidden = true; };

  shutterButton.onclick = () => {
    if (shutterButton.disabled) return;
    const s = c();
    const verdict = judgeDiscrete(place, s.task, s.spot, s.time);
    const shot = store.addShot(place.id, { spot: s.spot, time: s.time, task: s.task, ok: verdict.ok });
    if (!shot) return;   // 연달아 누른 것은 한 장이다
    shutterSound();
    onShot(shot, verdict);
  };

  draw();
  // 과제를 처음 볼 때는 옛 사진을 펴 두고, 필요한 두 요소를 한 번 짚어 준다(도윤 초안 5절의 장면 1).
  if (!c().shots.some((shot) => shot.task === c().task)) {
    q(".oldphoto").hidden = false;
    drawOld(true);
    // 2.5초 안에 다른 화면으로 가면 이 화면의 요소는 이미 없다.
    if (c().help < 1) setTimeout(() => { if (q(".oldphoto") && c().help < 1) drawOld(false); }, 2500);
  }
}
