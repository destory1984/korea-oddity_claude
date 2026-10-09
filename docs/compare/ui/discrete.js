// B안의 화면(첨성대, 소백산 천문대). 촬영 지점 셋과 때 셋에서 골라 찍고, 결과를 읽어 하나만 바꿔 다시 찍는다.
// 장소마다 다른 것(지점과 때의 이름, 과제, 도움의 테두리와 선)은 모두 장소 자료에서 읽는다.

import { judgeDiscrete } from "../core/judge.js";
import { renderScene, viewOf, answerView, shotOpts, oldOpts } from "./scene.js";
import { shutter as shutterSound } from "./sound.js";
import { createDial } from "./dial.js";
import { showMiss, clearMiss } from "./miss.js";

const MOVE_MS = 500;   // 지점을 옮기는 연출. 그동안 셔터가 잠긴다.

export function mountDiscrete(root, { store, place, onShot, onBack }) {
  const c = () => store.state[place.id];
  const task = () => place.tasks.find((t) => t.id === c().task);

  root.innerHTML = `
    <header><button data-do="back">수첩</button><h1>${place.name}</h1><button data-do="old">옛 사진</button></header>
    <div class="oldphoto" hidden><div class="frame"></div><div class="boxes"></div></div>
    <div class="stage">
      <div class="frame"></div>
      <p class="hand memo task"></p>
      <svg class="lines" viewBox="0 0 300 200" hidden></svg>
      <div class="preview" hidden><div class="frame"></div></div>
    </div>
    <div class="dials"><div data-dial="spot"></div><div data-dial="time"></div></div>
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
    q("[data-dial=time]").hidden = task().timesLocked;   // 첫 과제에서는 때를 고르지 않는다
    q("[data-do=compare]").disabled = s.shots.length < 2;
    drawHelp();
  }

  function drawOld(highlight) {
    const old = q(".oldphoto");
    renderScene(old.querySelector(".frame"), place, answerView(place, c().task), oldOpts(place, c().task));
    old.querySelector(".boxes").innerHTML = !highlight ? "" : task().need.map((tag) => {
      // 도움 1단계의 테두리. 틀에 대한 비율 [x, y, 너비, 높이]이고 과제마다 다를 수 있다.
      const [x, y, w, h] = place.helpBoxes[tag][c().task] ?? Object.values(place.helpBoxes[tag])[0];
      return `<i style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%"></i>`;
    }).join("");
  }

  function drawHelp() {
    const level = c().help;
    if (level >= 1) { q(".oldphoto").hidden = false; drawOld(true); }
    const lines = q(".lines");
    lines.toggleAttribute("hidden", level < 2);   // SVG 요소에는 hidden 속성값이 없어 attribute 로 켜고 끈다
    // 도움 2단계: 지금 찍으면 소라가 할 말에 맞는 글 없는 선. viewBox 는 300 × 200.
    if (level >= 2) lines.innerHTML = place.diagrams[judgeDiscrete(place, c().task, c().spot, c().time).sora] ?? "";
    const preview = q(".preview");
    preview.hidden = level < 3;
    if (level >= 3) renderScene(preview.querySelector(".frame"), place, answerView(place, c().task), { gray: true, still: true });
  }

  // 자리와 때는 세 자리에 딱딱 걸리는 다이얼로 고른다(사용자, 2026.10.10: "버튼은 맛이 없어"). 값은 여전히 셋씩이다.
  const stops = (list, names) => list.map((id, i) => ({ at: i, text: names[id] }));
  createDial(q("[data-dial=spot]"), {
    name: "자리", min: 0, max: place.spots.length - 1, step: 1, wrap: false, major: 1, tickPx: 84,
    value: place.spots.indexOf(c().spot), marks: stops(place.spots, place.spotNames),
    onInput: (v) => {
      store.setSpot(place.id, place.spots[v]);
      clearMiss(q(".stage"));   // 자리를 옮기면 방금 한 말은 맞지 않는다
      // 옮기는 중에 또 돌리면 마지막에 고른 곳으로 간다. 다 옮길 때까지 셔터를 잠근다.
      shutterButton.disabled = true;
      clearTimeout(moving);
      moving = setTimeout(() => { shutterButton.disabled = false; }, MOVE_MS);
      draw();
    },
  });
  createDial(q("[data-dial=time]"), {
    name: "때", min: 0, max: place.times.length - 1, step: 1, wrap: false, major: 1, tickPx: 84,
    value: place.times.indexOf(c().time), marks: stops(place.times, place.timeNames),
    onInput: (v) => { store.setTime(place.id, place.times[v]); clearMiss(q(".stage")); draw(); },
  });

  q("[data-do=back]").onclick = onBack;
  q("[data-do=old]").onclick = () => {
    const old = q(".oldphoto");
    old.hidden = !old.hidden;
    if (!old.hidden) drawOld(c().help >= 1);
  };
  q("[data-do=help]").onclick = () => { q("[data-do=help]").classList.remove("pulse"); store.bumpHelp(place.id); drawHelp(); };
  q("[data-do=compare]").onclick = () => {
    const [before, after] = c().shots.slice(-2);
    renderScene(q(".before"), place, viewOf(place, before), shotOpts(before));
    renderScene(q(".after"), place, viewOf(place, after), shotOpts(after));
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
    if (verdict.ok) return onShot(shot, verdict);
    // 틀렸으면 이 화면에 머문다. 소라가 보이는 사실 하나를 짚는다.
    showMiss(q(".stage"), { store, place, verdict, nudge: { can: s.help < 3, button: q("[data-do=help]") }, onLook: () => onShot(shot, verdict) });
    q("[data-do=compare]").disabled = c().shots.length < 2;
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
