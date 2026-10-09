// 거기서 한 일. 맞게 찍은 뒤, 결과 화면으로 가기 전에 그 자리에서 먹은 것을 한 장면으로 보인다.
// 장소마다 처음 맞게 찍었을 때 한 번만 나온다. 수첩의 그 칸에 먹은 것이 딱지로 남는다.

// place.there: { image, name, sora }
export function mountThere(root, { place, onNext }) {
  const t = place.there;
  root.innerHTML = `
    <h1>${place.name}</h1>
    <div class="there">
      <figure><div class="frame"><img class="whole" src="../assets/scenes/${t.image}.webp" alt="" draggable="false"></div>
        <figcaption class="hand">${t.name}</figcaption></figure>
    </div>
    <p class="sora">${t.sora}</p>
    <button class="main" data-do="next">사진 보러 가기</button>`;
  root.querySelector("[data-do=next]").onclick = onNext;
}

// 수첩의 칸에 붙는 딱지.
export const keepsake = (place) => `<img class="keepsake" src="../assets/scenes/${place.there.image}.webp" alt="${place.there.name}">`;
