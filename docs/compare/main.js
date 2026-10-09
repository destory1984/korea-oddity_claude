// 화면 옮기기. 자료를 읽고, 저장과 로그를 화면에 잇는다.

import { createStore, KEY } from "./core/store.js";
import { exportText, allDone } from "./core/log.js";
import { judgeContinuous, judgeDiscrete } from "./core/judge.js";
import { sunFor } from "./ui/scene.js";
import { mountStart, mountJournal, mountStory } from "./ui/journal.js";
import { mountResult, mountAsk } from "./ui/result.js";
import { mountDiscrete } from "./ui/discrete.js";
import { mountContinuous } from "./ui/continuous.js";
import { mountTravel } from "./ui/travel.js";
import { mountThere } from "./ui/there.js";

const load = async (id) => (await fetch(`places/${id}.json`)).json();
// 판마다 두 장소를 견준다. 앞이 A안(링을 돌려 포개기), 뒤가 B안(골라 찍고 읽어 고치기)이다.
// 셋째 판이 기본이고, 주소에 ?round=1, ?round=2 를 붙이면 앞의 판이 열린다. 판마다 저장이 따로다.
const ROUNDS = { 1: ["seongsan", "cheomseongdae"], 2: ["buseoksa", "sobaeksan"], 3: ["seongsu", "hongdae"] };
const LATEST = 3;
const round = ROUNDS[new URLSearchParams(location.search).get("round")] ? Number(new URLSearchParams(location.search).get("round")) : LATEST;
const ids = ROUNDS[round];
const places = {};
for (const id of ids) places[id] = await load(id);
const key = round === 1 ? KEY : `paldo.compare.v${round}`;

// localStorage 에 손대는 것조차 막힌 브라우저가 있다. 그때는 던지는 storage 를 넘겨 저장 없이 논다.
const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
let storage = denied;
try { storage = globalThis.localStorage ?? denied; } catch { /* denied 그대로 */ }
const store = createStore(storage, places, Date.now, key);

const sections = Object.fromEntries([...document.querySelectorAll("[data-screen]")].map((s) => [s.dataset.screen, s]));
const notice = document.getElementById("notice");

function verdictOf(place, shot) {
  return place.kind === "discrete"
    ? judgeDiscrete(place, shot.task, shot.spot, shot.time)
    : judgeContinuous(place, shot, sunFor(place, shot));
}

// 저장이 안 되는 것을 숨기지 않는다. 처음부터 막힌 기기(memory)와, 쓰다가 실패한 때(가득 찼다) 둘 다 알린다.
function showNotice() {
  const text = store.status === "memory" ? "이 기기에는 저장이 안 돼. 붙이기가 되지 않을 수 있어."
    : store.unsaved ? "저장이 안 됐어. 기기에 빈 자리가 있는지 봐 줘." : "";
  notice.hidden = !text;
  if (text) notice.textContent = text;
}

// 이번에 수첩에서 나서서 닿아 있는 장소. 수첩으로 돌아가면 비운다. 다시 찍으러 갈 때는 길을 또 보이지 않는다.
let arrivedAt = null;
// 맞게 찍고 "거기서 한 일"을 볼 차례인 사진의 번호.
let thereFor = null;

function show(name) {
  for (const [key, section] of Object.entries(sections)) section.hidden = key !== name;
  scrollTo(0, 0);
}

function go(screen, placeId) {
  store.go(screen, placeId);
  render();
}

// 두 장소의 기억이 다 채워졌고 아직 답하지 않았으면 수첩 대신 마지막 물음으로 간다.
function toJournal() {
  const s = store.state;
  arrivedAt = null;
  go(ids.every((id) => s[id].memory) && s.answer === null ? "ask" : "journal");
}

async function exportLog(box) {
  const text = exportText(store.state, ids);
  try {
    await navigator.clipboard.writeText(text);
    notice.textContent = "로그를 클립보드에 복사했어.";
    notice.hidden = false;
  } catch {
    box.hidden = false;   // 클립보드가 막혀 있으면 손으로 복사하게 띄운다
    box.value = text;
    box.select();
  }
}

function render() {
  if (store.status === "broken") {
    sections.broken.innerHTML = `<h1>저장한 것이 깨졌어</h1><p>원본은 그대로 두었어.</p><button class="main">새로 시작</button>`;
    sections.broken.querySelector("button").onclick = () => { store.startOver(); render(); };
    return show("broken");
  }
  showNotice();

  const { screen, place: placeId } = store.state;
  const place = places[placeId];
  if (screen === "place" && place && !store.state[placeId].storySeen) {
    mountStory(sections.place, { place, onGo: () => { store.seeStory(placeId); render(); } });
    return show("place");
  }
  if (screen === "place" && place?.travel && arrivedAt !== placeId) {
    mountTravel(sections.place, {
      place, short: Boolean(store.state[placeId].traveled),
      onArrive: () => { arrivedAt = placeId; store.arrive(placeId); render(); },
    });
    return show("place");
  }
  if (screen === "place" && place) {
    const mount = place.kind === "discrete" ? mountDiscrete : mountContinuous;
    const onShot = (shot) => {
      // 장소마다 처음 맞게 찍었을 때, 결과를 보기 전에 거기서 먹는다.
      if (place.there && (shot?.matched || shot?.ok) && !store.state[placeId].ate) thereFor = shot.id;
      go("result");
    };
    mount(sections.place, { store, place, onShot, onBack: toJournal });
    return show("place");
  }
  const shot = place ? store.state[placeId].shots.at(-1) : null;
  if (screen === "result" && shot && thereFor === shot.id) {
    mountThere(sections.result, { place, onNext: () => { thereFor = null; store.eat(placeId); render(); } });
    return show("result");
  }
  if (screen === "result" && shot) {
    mountResult(sections.result, {
      store, place, shot, verdict: verdictOf(place, shot),
      onJournal: toJournal,
      onRetry: () => { store.log(placeId, "retry", { afterAll: allDone(store.state.log, place) }); go("place", placeId); },
      onPasted: showNotice,
    });
    return show("result");
  }
  if (screen === "ask") {
    mountAsk(sections.ask, { places, onDone: (answer) => { store.setAnswer(answer); go("journal"); } });
    return show("ask");
  }
  if (screen === "journal") {
    mountJournal(sections.journal, { store, places, onOpen: (id) => go("place", id), onStart: () => go("start") });
    return show("journal");
  }
  mountStart(sections.start, {
    round,
    onOpen: () => go("journal"),
    onExport: exportLog,
    onStartOver: () => {
      if (!confirm("지금까지의 기록과 로그를 지우고 처음부터 시작할까? 로그는 먼저 내보내 두어야 해.")) return;
      store.startOver();
      render();
    },
  });
  show("start");
}

render();
