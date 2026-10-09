// 시작 화면과 수첩 두 칸.

import { renderScene, viewOf, answerView, shotOpts, oldOpts } from "./scene.js";

export function mountStart(root, { onOpen, onExport, onStartOver }) {
  root.innerHTML = `
    <h1>팔도 한량 <small>— 시제품</small></h1>
    <p class="note hand">소라야, 이건 내가 다닌 데를<br>적은 수첩이란다.<br>사진이 다 바랬구나.<br>네가 새로 찍어다 주련.<br>두 군데만 먼저 가 보렴.</p>
    <p class="sora">이번엔 땅이야? 그럼 걸어가도 되겠다.</p>
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
        <p class="hand reply"${p.otherView && place.reply2 ? "" : " hidden"}>${(place.reply2 ?? []).join("<br>")}</p>
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
      if (shot) renderScene(first, place, viewOf(place, shot), shotOpts(shot));
      else renderScene(first, place, answerView(place, 1), oldOpts(place, 1));
      if (p.pasted[2]) {
        second.hidden = false;
        renderScene(second, place, viewOf(place, p.pasted[2]), shotOpts(p.pasted[2]));
      }
    } else if (p.pasted) {
      renderScene(first, place, viewOf(place, p.pasted), shotOpts(p.pasted));
    } else {
      renderScene(first, place, answerView(place), oldOpts(place));
    }
    square.querySelector("[data-go]").onclick = () => onOpen(place.id);
  }
  root.querySelector("[data-do=start]").onclick = onStart;
}

// 장소에 처음 들어갈 때의 장면: 바랜 사진, 그 뒷면의 연필 글씨, 소라의 한마디. 왜 찍으러 왔는지를 여기서 안다.
export function mountStory(root, { place, onGo }) {
  root.innerHTML = `
    <h1>${place.name}</h1>
    <div class="story">
      <figure><div class="frame"></div></figure>
      <p class="back hand">${place.story.back.join("<br>")}</p>
    </div>
    <p class="sora">${place.story.sora}</p>
    <button class="main" data-do="go">찍으러 가기</button>`;
  renderScene(root.querySelector(".frame"), place, answerView(place, 1), oldOpts(place, 1));
  root.querySelector("[data-do=go]").onclick = onGo;
}
