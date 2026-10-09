// 결과 화면(할머니의 사진과 소라의 사진, 붙이기, 답장)과 마지막 물음.

import { renderScene, viewOf, answerView, shotOpts, oldOpts } from "./scene.js";

export function mountResult(root, { store, place, shot, verdict, onJournal, onRetry, onPasted }) {
  const needs = (verdict.needs ?? []).map((n) => `<span class="mark${n.met ? " on" : ""}">${n.label}</span>`).join("");
  root.innerHTML = `
    <h1>${place.name}</h1>
    <div class="pair">
      <figure><div class="frame old"></div><figcaption class="hand">할머니</figcaption></figure>
      <figure><div class="frame new"></div><figcaption class="hand">소라</figcaption></figure>
    </div>
    <p class="marks">${needs}</p>
    <p class="sora"${verdict.line ? "" : " hidden"}>${verdict.line ?? ""}</p>
    <p class="hand reply" hidden></p>
    <button class="main" data-do="paste">수첩에 붙이기</button>
    <div class="foot">
      <button data-do="journal">수첩으로</button>
      <button data-do="retry">한 번 더 찍기</button>
    </div>`;
  renderScene(root.querySelector(".old"), place, answerView(place, shot.task ?? 1), oldOpts(place, shot.task ?? 1));
  renderScene(root.querySelector(".new"), place, viewOf(place, shot), shotOpts(shot));

  const paste = root.querySelector("[data-do=paste]");
  const p = store.state[place.id];
  const stuck = place.kind === "discrete" ? p.pasted.photo : p.pasted;
  if (stuck?.id === shot.id) { paste.textContent = "붙였어"; paste.disabled = true; }
  paste.onclick = () => {
    const r = store.paste(place.id, shot.id);
    onPasted?.(r);   // 저장이 안 됐으면 화면 위의 안내가 뜬다
    if (!r.saved) { paste.textContent = "다시 붙이기"; return; }   // 저장이 안 되면 성공 연출을 내지 않는다
    paste.textContent = "붙였어";
    paste.disabled = true;
    // 답장은 기억이 새로 채워진 때에만 온다. 첨성대의 과제 2에는 둘째 답장이 온다.
    const reply = r.memoryNew ? place.reply : r.otherViewNew ? place.reply2 : null;
    if (reply) {
      root.querySelector(".reply").innerHTML = reply.join("<br>");
      root.querySelector(".reply").hidden = false;
    }
  };
  root.querySelector("[data-do=journal]").onclick = onJournal;
  root.querySelector("[data-do=retry]").onclick = onRetry;
}

export function mountAsk(root, { places, onDone }) {
  const ANSWERS = [...Object.values(places).map((place) => [place.id, place.name]), ["both", "둘 다"], ["neither", "둘 다 아님"]];
  root.innerHTML = `<h1>한 번 더 하고 싶은 곳은?</h1>
    <div class="answers">${ANSWERS.map(([id, name]) => `<button class="main" data-answer="${id}">${name}</button>`).join("")}</div>`;
  for (const button of root.querySelectorAll("[data-answer]")) button.onclick = () => onDone(button.dataset.answer);
}
