// 가는 길. 수첩에서 장소로 들어갈 때, 지하철을 타고 역에 내려 골목으로 걸어 들어가는 짧은 장면이다.
// (사용자, 2026.10.10: "갔다왔다~는게 좀 안 느껴지는데") 노선의 줄과 점은 코드가 긋고, 역 출구의 그림은 받은 것이다.
// 처음 갈 때는 지하철 2초와 걷기 2초, 다시 갈 때는 걷기 1초만 보인다. 화면을 누르면 건너뛴다.

export const RIDE_MS = 2000, WALK_MS = 2000, SHORT_MS = 1000;

// place.travel: { line, color, stations: [앞 역, 내리는 역, 다음 역], exit, image, sora }
export function mountTravel(root, { place, short, onArrive }) {
  const t = place.travel;
  const [before, stop, after] = t.stations;
  root.innerHTML = `
    <div class="travel${short ? " short" : ""}" style="--line:${t.color}">
      <p class="lineName"><b>${t.line}</b></p>
      <div class="rail">
        <i class="track"></i>
        <span class="station s0"><i></i>${before}</span>
        <span class="station s1"><i></i>${stop}</span>
        <span class="station s2"><i></i>${after}</span>
        <i class="train"></i>
      </div>
      <p class="exit"><b>${stop}역</b> ${t.exit}</p>
      <div class="frame way"><img class="whole" src="../assets/scenes/${t.image}.webp" alt="" draggable="false"></div>
      <p class="sora">${t.sora}</p>
      <p class="skip">누르면 건너뛴다</p>
    </div>`;
  const box = root.querySelector(".travel");
  let done = false;
  const timers = [];
  const arrive = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    onArrive();
  };
  const ride = short ? 0 : RIDE_MS;
  // 역에 닿으면 출구와 골목의 그림이 나타나고, 그림이 천천히 다가온다.
  timers.push(setTimeout(() => box.classList.add("walking"), ride));
  timers.push(setTimeout(arrive, ride + (short ? SHORT_MS : WALK_MS)));
  box.onclick = arrive;
}
