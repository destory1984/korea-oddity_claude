// 틀린 사진을 찍었을 때 그 자리에서 소라가 한마디 한다. 화면을 옮기지 않아 바로 고쳐 다시 찍을 수 있다.
// 잇달아 세 번 틀리면 소라가 도움을 권하고, 그 단추가 깜빡인다. 두 장소가 함께 쓴다.

import { missStreak } from "../core/log.js";

const NUDGE_AFTER = 3;

// stage: 풍경을 감싼 .stage. nudge: {can, button} 도움을 권할 수 있는가와 깜빡일 단추. onLook: 이 사진을 붙이러 결과 화면으로.
export function showMiss(stage, { store, place, verdict, nudge, onLook }) {
  clearMiss(stage);
  const streak = missStreak(store.state.log, place.id);
  const push = streak >= NUDGE_AFTER && nudge.can;
  const needs = (verdict.needs ?? []).map((n) => `<span class="mark${n.met ? " on" : ""}">${n.label}</span>`).join("");
  const box = document.createElement("div");
  box.className = "miss";
  box.innerHTML = `
    ${needs ? `<p class="marks">${needs}</p>` : ""}
    ${verdict.line ? `<p class="sora">${verdict.line}</p>` : ""}
    ${push ? `<p class="sora nudge">${place.nudge}</p>` : ""}
    <button class="small" data-do="look">이 사진 붙이기</button>`;
  box.querySelector("[data-do=look]").onclick = onLook;
  stage.appendChild(box);
  nudge.button.classList.toggle("pulse", push);
  // 사진이 찍힌 것을 알리는 번쩍임
  stage.classList.remove("flash");
  void stage.offsetWidth;
  stage.classList.add("flash");
}

export function clearMiss(stage) {
  stage.querySelector(".miss")?.remove();
}
