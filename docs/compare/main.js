// 화면 옮기기. 자료를 읽고, 저장과 로그를 화면에 잇는다.

import { createStore } from "./core/store.js";
import { exportText } from "./core/log.js";
import { judgeContinuous, judgeDiscrete } from "./core/judge.js";
import { sunFor } from "./ui/scene.js";
import { mountStart, mountJournal } from "./ui/journal.js";
import { mountResult, mountAsk } from "./ui/result.js";
import { mountCheomseongdae } from "./ui/cheomseongdae.js";
import { mountSeongsan } from "./ui/seongsan.js";

const load = async (id) => (await fetch(`places/${id}.json`)).json();
const places = { seongsan: await load("seongsan"), cheomseongdae: await load("cheomseongdae") };

// localStorage 에 손대는 것조차 막힌 브라우저가 있다. 그때는 던지는 storage 를 넘겨 저장 없이 논다.
const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
let storage = denied;
try { storage = globalThis.localStorage ?? denied; } catch { /* denied 그대로 */ }
const store = createStore(storage, places);

const sections = Object.fromEntries([...document.querySelectorAll("[data-screen]")].map((s) => [s.dataset.screen, s]));
const notice = document.getElementById("notice");

function verdictOf(place, shot) {
  return place.kind === "discrete"
    ? judgeDiscrete(place, shot.task, shot.spot, shot.time)
    : judgeContinuous(place, shot, sunFor(place, shot));
}

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
  go(s.seongsan.memory && s.cheomseongdae.memory && s.answer === null ? "ask" : "journal");
}

async function exportLog(box) {
  const text = exportText(store.state);
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
  notice.hidden = store.status !== "memory";
  if (store.status === "memory") notice.textContent = "이 기기에는 저장이 안 돼. 붙이기가 되지 않을 수 있어.";

  const { screen, place: placeId } = store.state;
  const place = places[placeId];
  if (screen === "place" && place) {
    const mount = place.kind === "discrete" ? mountCheomseongdae : mountSeongsan;
    mount(sections.place, { store, place, onShot: () => go("result"), onBack: toJournal });
    return show("place");
  }
  const shot = place ? store.state[placeId].shots.at(-1) : null;
  if (screen === "result" && shot) {
    mountResult(sections.result, {
      store, place, shot, verdict: verdictOf(place, shot),
      onJournal: toJournal,
      onRetry: () => { store.log(placeId, "retry"); go("place", placeId); },
    });
    return show("result");
  }
  if (screen === "ask") {
    mountAsk(sections.ask, { onDone: (answer) => { store.setAnswer(answer); go("journal"); } });
    return show("ask");
  }
  if (screen === "journal") {
    mountJournal(sections.journal, { store, places, onOpen: (id) => go("place", id), onStart: () => go("start") });
    return show("journal");
  }
  mountStart(sections.start, {
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
