// 성산일출봉 화면(A안). 작업 6에서 짓는다. 지금은 빈 화면이다.

export function mountSeongsan(root, { place, onBack }) {
  root.innerHTML = `<header><button data-do="back">수첩</button><h1>${place.name}</h1><span></span></header>`;
  root.querySelector("[data-do=back]").onclick = onBack;
}
