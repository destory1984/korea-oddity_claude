// 저장. localStorage 의 한 키 아래 JSON 하나다. 깨진 저장은 지우지 않는다.
// storage 는 밖에서 받는다(브라우저의 localStorage, 시험의 가짜).

export const KEY = "paldo.compare.v1";
const VERSION = 1;
const KEEP_SHOTS = 3;      // 임시 사진은 장소마다 최근 3장
const DOUBLE_TAP_MS = 150; // 이 안에 다시 누른 셔터는 같은 한 장으로 친다
const MAX_HELP = 3;

// 장소 하나의 처음 꼴. 연속(A안)은 다이얼 값, 이산(B안)은 지점과 때와 과제를 가진다.
function freshPlace(place) {
  if (place.kind === "discrete") {
    const [spot, time] = place.tasks[0].start.split("-");
    return { visited: false, spot, time, task: 1, help: 0, shots: [], pasted: { photo: null, 1: null, 2: null }, memory: false, otherView: false };
  }
  return { visited: false, dials: { ...place.start }, overlay: false, shots: [], pasted: null, memory: false };
}

function fresh(places) {
  const state = { version: VERSION, screen: "start", place: null, nextShotId: 1, answer: null, log: [] };
  for (const place of Object.values(places)) state[place.id] = freshPlace(place);
  return state;
}

// key: 판마다 다른 저장 열쇠. 첫 판(성산, 첨성대)은 KEY, 둘째 판(부석사, 소백산)은 끝이 v2 다.
export function createStore(storage, places, now = Date.now, key = KEY) {
  const store = { status: "fresh", state: null, unsaved: false };   // unsaved: 마지막 쓰기가 실패했는가

  let raw = null;
  try {
    raw = storage.getItem(key);
  } catch {
    store.status = "memory";
  }
  if (raw !== null) {
    let saved = null;
    try { saved = JSON.parse(raw); } catch { /* 아래에서 깨진 것으로 친다 */ }
    // 판 번호가 같아도 장소의 칸이 빠졌으면 깨진 것으로 친다.
    const whole = saved && !Array.isArray(saved) && saved.version === VERSION && Array.isArray(saved.log) && Object.keys(places).every((id) => saved[id]);
    if (whole) {
      store.state = saved;
      store.status = "ok";
    } else {
      store.status = "broken";
      try { storage.setItem(key + ".broken", raw); } catch { /* 옮기지 못해도 원본은 그대로 있다 */ }
    }
  }
  if (store.status === "fresh" || store.status === "memory") store.state = fresh(places);

  const write = (state) => {
    if (store.status === "memory" || store.status === "broken") return false;
    try {
      storage.setItem(key, JSON.stringify(state));
      store.unsaved = false;
      return true;
    } catch {
      store.unsaved = true;   // 가득 찼거나 막혔다. 화면이 알린다.
      return false;
    }
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

  // 장소에 들어갈 때의 장면(사진 뒷면의 글)은 장소마다 한 번만 보인다.
  store.seeStory = (placeId) => { store.state[placeId].storySeen = true; store.save(); };

  // 가는 길을 다 보고 그 자리에 닿았다. 첫 성공까지의 시간은 여기서부터 잰다(core/log.js).
  store.arrive = (placeId) => {
    store.state[placeId].traveled = true;
    store.log(placeId, "arrive");
    store.save();
  };

  // 거기서 먹었다. 수첩의 칸에 딱지가 붙는다.
  store.eat = (placeId) => {
    store.state[placeId].ate = true;
    store.log(placeId, "eat");
    store.save();
  };

  store.setDials = (placeId, patch) => {
    Object.assign(store.state[placeId].dials, patch);
    store.log(placeId, "dial", patch);
    store.save();
  };
  store.setOverlay = (placeId, on) => { store.state[placeId].overlay = Boolean(on); store.save(); };

  const setState = (placeId, patch) => {
    const c = store.state[placeId];
    Object.assign(c, patch);
    store.log(placeId, "state", { spot: c.spot, time: c.time });
    store.save();
  };
  store.setSpot = (placeId, spot) => setState(placeId, { spot });
  store.setTime = (placeId, time) => setState(placeId, { time });

  store.bumpHelp = (placeId) => {
    const c = store.state[placeId];
    if (c.help >= MAX_HELP) return c.help;   // 더 오를 단계가 없으면 로그에도 쌓지 않는다
    c.help += 1;
    store.log(placeId, "help", c.help);
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
    if (places[placeId].kind !== "discrete") {
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
