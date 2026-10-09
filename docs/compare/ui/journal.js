// 시작 화면과 수첩 두 칸.

import { renderScene, viewOf, answerView } from "./scene.js";

export function mountStart(root, { onOpen, onExport, onStartOver }) {
  root.innerHTML = `
    <h1>팔도 한량 <small>— 시제품</small></h1>
    <p class="note hand">소라야, 두 군데만 가 보렴.<br>사진이 다 바랬구나.</p>
    <button class="main" data-do="open">수첩 펴기</button>
    <div class="foot">
      <button class="small" data-do="export">로그 내보내기</button>
      <button class="small" data-do="over">새 사람으로 시작</button>
    </div>
    <textarea class="export" readonly hidden></textarea>`;
  root.querySelector("[data-do=open]").onclick = onOpen;
  root.querySelector("[data-do=export]").onclick = () => onExport(root.querySelector(".export"));
  root.querySelector("[data-do=over]").onclick = onStartOver;
}

const mark = (name, on) => `<span class="mark${on ? " on" : ""}">${name}</span>`;

export function mountJournal(root, { store, places, onOpen, onStart }) {
  const squares = Object.values(places).map((place) => {
    const p = store.state[place.id];
    const photo = place.kind === "discrete" ? p.pasted.photo : p.pasted;
    const marks = [mark("자리", p.visited), mark("사진", Boolean(photo)), mark("기억", p.memory)];
    if (place.kind === "discrete") marks.push(mark("다른 시선", p.otherView));
    return `
      <article class="square" data-place="${place.id}">
        <div class="photos"><div class="frame"></div><div class="frame second" hidden></div></div>
        <h2>${place.name}</h2>
        <p class="hand memo">${place.memo}</p>
        <p class="marks">${marks.join("")}</p>
        <p class="hand reply"${p.memory ? "" : " hidden"}>${place.reply.join("<br>")}</p>
        <button class="main" data-go="${place.id}">가기</button>
      </article>`;
  });
  root.innerHTML = `<h1>수첩</h1><div class="squares">${squares.join("")}</div>
    <div class="foot"><button class="small" data-do="start">처음 화면</button></div>`;

  for (const place of Object.values(places)) {
    const p = store.state[place.id];
    const square = root.querySelector(`[data-place=${place.id}]`);
    const [first, second] = square.querySelectorAll(".frame");
    if (place.kind === "discrete") {
      const shot = p.pasted[1] ?? p.pasted.photo;
      if (shot) renderScene(first, place, viewOf(place, shot), { still: true });
      else renderScene(first, place, answerView(place, 1), { faded: true, still: true });
      if (p.pasted[2]) {
        second.hidden = false;
        renderScene(second, place, viewOf(place, p.pasted[2]), { still: true });
      }
    } else if (p.pasted) {
      renderScene(first, place, viewOf(place, p.pasted), { still: true });
    } else {
      renderScene(first, place, answerView(place), { faded: true, still: true });
    }
    square.querySelector("[data-go]").onclick = () => onOpen(place.id);
  }
  root.querySelector("[data-do=start]").onclick = onStart;
}
