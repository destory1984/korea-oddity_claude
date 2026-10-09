// 저장. localStorage 의 한 키 아래 JSON 하나다. 깨진 저장은 지우지 않는다.
// storage 는 밖에서 받는다(브라우저의 localStorage, 시험의 가짜).

export const KEY = "paldo.compare.v1";
const VERSION = 1;
const KEEP_SHOTS = 3;      // 임시 사진은 장소마다 최근 3장
const DOUBLE_TAP_MS = 150; // 이 안에 다시 누른 셔터는 같은 한 장으로 친다
const MAX_HELP = 3;

function fresh(places) {
  const [spot, time] = places.cheomseongdae.tasks[0].start.split("-");
  return {
    version: VERSION, screen: "start", place: null, nextShotId: 1,
    seongsan: { visited: false, dials: { ...places.seongsan.start }, overlay: false, shots: [], pasted: null, memory: false },
    cheomseongdae: { visited: false, spot, time, task: 1, help: 0, shots: [], pasted: { photo: null, 1: null, 2: null }, memory: false, otherView: false },
    answer: null,
    log: [],
  };
}

export function createStore(storage, places, now = Date.now) {
  const store = { status: "fresh", state: null };

  let raw = null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    store.status = "memory";
  }
  if (raw !== null) {
    let saved = null;
    try { saved = JSON.parse(raw); } catch { /* 아래에서 깨진 것으로 친다 */ }
    if (saved && !Array.isArray(saved) && saved.version === VERSION) {
      store.state = saved;
      store.status = "ok";
    } else {
      store.status = "broken";
      try { storage.setItem(KEY + ".broken", raw); } catch { /* 옮기지 못해도 원본은 그대로 있다 */ }
    }
  }
  if (store.status === "fresh" || store.status === "memory") store.state = fresh(places);

  const write = (state) => {
    if (store.status === "memory" || store.status === "broken") return false;
    try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
  };

  store.save = () => write(store.state);

  store.startOver = () => {
    store.state = fresh(places);
    if (store.status !== "memory") store.status = "fresh";
    store.save();
  };

  store.log = (place, kind, value = null) => { store.state.log.push({ place, t: now(), kind, value }); };

  // 결과 화면은 그 장소 안으로 친다. 수첩이나 다른 장소로 갈 때에만 leave, 밖에서 들어올 때에만 enter 를 쓴다.
  store.go = (screen, placeId = null) => {
    const s = store.state;
    const inside = (scr) => scr === "place" || scr === "result";
    const from = inside(s.screen) ? s.place : null;
    const to = inside(screen) ? (placeId ?? s.place) : null;
    if (from && from !== to) store.log(from, "leave");
    if (to && to !== from) {
      s[to].visited = true;
      store.log(to, "enter");
    }
    s.screen = screen;
    s.place = to;
    store.save();
  };

  store.setDials = (patch) => {
    Object.assign(store.state.seongsan.dials, patch);
    store.log("seongsan", "dial", patch);
    store.save();
  };
  store.setOverlay = (on) => { store.state.seongsan.overlay = Boolean(on); store.save(); };

  const setState = (patch) => {
    const c = store.state.cheomseongdae;
    Object.assign(c, patch);
    store.log("cheomseongdae", "state", { spot: c.spot, time: c.time });
    store.save();
  };
  store.setSpot = (spot) => setState({ spot });
  store.setTime = (time) => setState({ time });

  store.bumpHelp = () => {
    const c = store.state.cheomseongdae;
    c.help = Math.min(MAX_HELP, c.help + 1);
    store.log("cheomseongdae", "help", c.help);
    store.save();
    return c.help;
  };

  store.addShot = (placeId, shot) => {
    const p = store.state[placeId];
    const t = now();
    const last = p.shots[p.shots.length - 1];
    if (last && t - last.t < DOUBLE_TAP_MS) return null;
    const kept = { ...shot, id: store.state.nextShotId++, t };
    p.shots = [...p.shots, kept].slice(-KEEP_SHOTS);
    store.log(placeId, "shutter", kept);
    store.save();
    return kept;
  };

  // 사진과 기억 기록을 한 번에 쓴다. 쓰지 못하면 아무것도 바뀌지 않는다.
  store.paste = (placeId, shotId) => {
    const result = { saved: false, memoryNew: false, otherViewNew: false };
    const shot = store.state[placeId].shots.find((s) => s.id === shotId);
    if (!shot) return result;
    const next = structuredClone(store.state);
    const p = next[placeId];
    if (placeId === "seongsan") {
      p.pasted = shot;
      if (shot.matched && !p.memory) { p.memory = true; result.memoryNew = true; }
    } else {
      p.pasted.photo = shot;
      if (shot.ok && shot.task === 1) {
        p.pasted[1] = shot;
        if (!p.memory) { p.memory = true; result.memoryNew = true; p.task = 2; p.help = 0; }
      } else if (shot.ok && shot.task === 2) {
        p.pasted[2] = shot;
        if (!p.otherView) { p.otherView = true; result.otherViewNew = true; }
      }
    }
    next.log.push({ place: placeId, t: now(), kind: "paste", value: shotId });
    if (!write(next)) return { saved: false, memoryNew: false, otherViewNew: false };
    store.state = next;
    result.saved = true;
    return result;
  };

  store.setAnswer = (answer) => {
    store.state.answer = answer;
    store.log(null, "answer", answer);
    store.save();
  };

  return store;
}
