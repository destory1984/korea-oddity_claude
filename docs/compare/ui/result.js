// 결과 화면(할머니의 사진과 소라의 사진, 붙이기, 답장)과 마지막 물음.

import { renderScene, viewOf, answerView } from "./scene.js";

export function mountResult(root, { store, place, shot, verdict, onJournal, onRetry }) {
  const needs = (verdict.needs ?? []).map((n) => `<span class="mark${n.met ? " on" : ""}">${n.label}</span>`).join("");
  root.innerHTML = `
    <h1>${place.name}</h1>
    <div class="pair">
      <figure><div class="frame old"></div><figcaption class="hand">할머니</figcaption></figure>
      <figure><div class="frame new"></div><figcaption class="hand">소라</figcaption></figure>
    </div>
    <p class="marks">${needs}</p>
    <p class="sora"${verdict.line ? "" : " hidden"}>${verdict.line ?? ""}</p>
    <p class="hand reply" hidden>${place.reply.join("<br>")}</p>
    <button class="main" data-do="paste">수첩에 붙이기</button>
    <div class="foot">
      <button data-do="journal">수첩으로</button>
      <button data-do="retry">한 번 더 찍기</button>
    </div>`;
  renderScene(root.querySelector(".old"), place, answerView(place, shot.task ?? 1), { faded: true, still: true });
  renderScene(root.querySelector(".new"), place, viewOf(place, shot), { still: true });

  const paste = root.querySelector("[data-do=paste]");
  const p = store.state[place.id];
  const stuck = place.kind === "discrete" ? p.pasted.photo : p.pasted;
  if (stuck?.id === shot.id) { paste.textContent = "붙였어"; paste.disabled = true; }
  paste.onclick = () => {
    const r = store.paste(place.id, shot.id);
    if (!r.saved) { paste.textContent = "다시 붙이기"; return; }   // 저장이 안 되면 성공 연출을 내지 않는다
    paste.textContent = "붙였어";
    paste.disabled = true;
    if (r.memoryNew) root.querySelector(".reply").hidden = false;
  };
  root.querySelector("[data-do=journal]").onclick = onJournal;
  root.querySelector("[data-do=retry]").onclick = onRetry;
}

const ANSWERS = [["seongsan", "성산일출봉"], ["cheomseongdae", "첨성대"], ["both", "둘 다"], ["neither", "둘 다 아님"]];

export function mountAsk(root, { onDone }) {
  root.innerHTML = `<h1>한 번 더 하고 싶은 곳은?</h1>
    <div class="answers">${ANSWERS.map(([id, name]) => `<button class="main" data-answer="${id}">${name}</button>`).join("")}</div>`;
  for (const button of root.querySelectorAll("[data-answer]")) button.onclick = () => onDone(button.dataset.answer);
}
