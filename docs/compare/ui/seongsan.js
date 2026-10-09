// 성산일출봉 화면(A안). 다이얼 넷(좌우, 거리, 계절, 시각)으로 할머니의 바랜 사진과 포갠다.

import { judgeContinuous, dayOfYear } from "../core/judge.js";
import { renderScene, answerView, sunFor } from "./scene.js";
import { createDial } from "./dial.js";
import { shutter as shutterSound } from "./sound.js";
import { showMiss } from "./miss.js";

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MID = [14.5, 104.5, 195.5, 287.5].map((d) => d / 365);   // 네 철의 가운데(1월, 4월, 7월, 10월의 15일)

// 다이얼의 눈금 위에 적을 글: 달이 바뀌는 날과 정각.
const MONTH_MARKS = MONTH_DAYS.map((_, m) => ({ at: MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0) / 365, text: `${m + 1}월` }));
const HOUR_MARKS = Array.from({ length: 24 }, (_, h) => ({ at: h, text: `${h}시` }));

function dateText(s) {
  let day = dayOfYear(s), month = 0;
  while (day >= MONTH_DAYS[month]) day -= MONTH_DAYS[month++];
  return `${month + 1}월 ${day + 1}일`;
}
function clockText(h) {
  const minutes = Math.round(h * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function mountSeongsan(root, { store, place, onShot, onBack }) {
  const p = store.state.seongsan;
  const dials = { ...p.dials };
  if (place.fixDistance) {
    dials.d = place.target.d;
    if (!store.state.log.some((l) => l.kind === "config")) store.log(place.id, "config", { fixDistance: true });
  }

  root.innerHTML = `
    <header><button data-do="back">수첩</button><h1>${place.name}</h1><button data-do="old">옛 사진</button></header>
    <p class="hand memo task">${place.memoShort}</p>
    <div class="stage"><div class="frame"></div><div class="frame overlay" hidden></div></div>
    <div class="dials"><div data-dial="x"></div><div data-dial="d"></div><div data-dial="s"></div><div data-dial="h"></div></div>
    <div class="tools"><button class="shutter" data-do="shutter" aria-label="셔터"></button></div>`;

  const q = (sel) => root.querySelector(sel);
  const frame = q(".stage > .frame");
  const overlay = q(".overlay");
  const oldButton = q("[data-do=old]");
  let matched = null;

  const look = () => {
    const sun = sunFor(place, dials);
    if (sun.staged && !store.state.log.some((l) => l.kind === "fallback")) store.log(place.id, "fallback", "sun");
    return { sun, verdict: judgeContinuous(place, dials, sun) };
  };

  function draw() {
    const { sun, verdict } = look();
    renderScene(frame, place, { ...dials, sun }, { still: true });
    // 포개지는 순간: 옛 사진을 켜 두었으면 겹친 윤곽선이 알리고, 꺼 두었으면 다이얼이 가볍게 떨린다.
    if (matched === false && verdict.matched && !p.overlay) for (const dial of Object.values(made)) dial.shake();
    matched = verdict.matched;
  }

  function drawOverlay() {
    overlay.hidden = !p.overlay;
    oldButton.classList.toggle("on", p.overlay);
    if (p.overlay) renderScene(overlay, place, answerView(place), { faded: true, outline: true, still: true });
  }

  const common = (key) => ({
    value: dials[key],
    min: place.dials[key][0], max: place.dials[key][1],
    onInput: (v) => { dials[key] = v; draw(); },
    onRelease: () => keep(),
  });
  // 화면의 다이얼 값을 저장에 옮긴다. 다이얼이 아직 구르는 중에 셔터나 수첩을 눌러도 값이 남게, 화면을 떠나기 전에도 부른다.
  // (2026.10.10: 구르는 중에 찍고 돌아오면 다이얼이 옛 값으로 돌아가 있었다.)
  function keep() {
    const now = store.state.seongsan.dials;
    const changed = Object.fromEntries(Object.entries(dials).filter(([key, v]) => v !== now[key]));
    if (Object.keys(changed).length) store.setDials(changed);
  }
  const onHide = () => { if (root.isConnected && frame.isConnected && document.hidden) keep(); };
  document.addEventListener("visibilitychange", onHide);
  const made = {
    x: createDial(q("[data-dial=x]"), { ...common("x"), name: "좌우", step: 0.02, wrap: false, major: 5, ends: ["왼쪽", "오른쪽"] }),
    s: createDial(q("[data-dial=s]"), { ...common("s"), name: "계절", step: 5 / 365, wrap: true, snaps: MID, major: 1000, marks: MONTH_MARKS, label: dateText }),
    h: createDial(q("[data-dial=h]"), { ...common("h"), name: "시각", step: 1 / 6, wrap: true, major: 6, marks: HOUR_MARKS, label: clockText }),
  };
  if (place.fixDistance) q("[data-dial=d]").remove();
  else made.d = createDial(q("[data-dial=d]"), { ...common("d"), name: "거리", step: 0.02, wrap: false, major: 5, ends: ["가까이", "멀리"] });

  q("[data-do=back]").onclick = () => { keep(); onBack(); };
  oldButton.onclick = () => { oldButton.classList.remove("pulse"); store.setOverlay(!p.overlay); drawOverlay(); };
  q("[data-do=shutter]").onclick = () => {
    keep();
    const { verdict } = look();
    const shot = store.addShot(place.id, { ...dials, matched: verdict.matched });
    if (!shot) return;   // 연달아 누른 것은 한 장이다
    shutterSound();
    if (verdict.matched) return onShot(shot, verdict);
    // 틀렸으면 이 화면에 머문다. 소라가 보이는 사실 하나를 짚고, 고칠 다이얼에 금빛 테가 돈다.
    showMiss(q(".stage"), { store, place, verdict, nudge: { can: !p.overlay, button: oldButton }, onLook: () => onShot(shot, verdict) });
    for (const [key, dial] of Object.entries(made)) dial.hint(key === verdict.dial);
  };

  draw();
  drawOverlay();
  // 처음 들어오면 옛 사진을 2.5초 겹쳐 보여 주고 걷는다. 무엇과 포개야 하는지를 먼저 본다(첨성대가 과제를 처음 볼 때와 같다).
  if (!p.shots.length && !p.overlay) {
    overlay.hidden = false;
    renderScene(overlay, place, answerView(place), { faded: true, outline: true, still: true });
    setTimeout(() => { if (overlay.isConnected && !p.overlay) overlay.hidden = true; }, 2500);
  }
}
