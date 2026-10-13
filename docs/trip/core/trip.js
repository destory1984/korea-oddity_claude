// 여행의 셈. 화면과 브라우저를 모른다. 요금은 data/fares.json 에서 받는다.
// 첫 쪽(공항 → 서울역)에서 유이가 고르는 것: 길(일반, 직통), 내는 법(교통카드, 1회용), 충전한 돈, 보증금을 돌려받았는가.
// 둘째 쪽(서울역 → 명동)의 것은 md 아래에 따로 둔다. 공항에서 산 교통카드와 거기 남은 돈은 명동으로 이어진다.

export const fresh = () => ({
  version: 2,
  step: "intro",
  route: null,        // "allstop" | "express"
  pay: null,          // 일반열차일 때: "card" | "single"
  charge: 0,          // 교통카드에 넣은 돈
  ticket: false,      // 표나 카드를 손에 쥐었는가
  gateMisses: 0,      // 다른 개찰구로 간 횟수
  refunded: null,     // 1회용의 보증금: true 돌려받음, false 그냥 감, null 아직
  signMisses: 0,      // 입국장에서 다른 표지판을 따라간 횟수
  spot: "B",          // 서울역에서 사진을 찍은 자리: A 역 건물 코앞, B 광장 한가운데, C 정류장 쪽
  shot: false,
  pasted: false,
  md: freshMd(),
  hd: freshHd(),
});

// 명동 쪽에서 유이가 고르는 것.
export function freshMd() {
  return {
    carried: false,     // 공항에서 산 교통카드를 들고 왔는가
    pay: null,          // "card" | "single"
    charge: 0,          // 명동 쪽에서 새로 산 교통카드에 넣은 돈
    ticket: false,
    dirMisses: 0,       // 반대쪽 열차를 탄 횟수
    exitMisses: 0,      // 다른 출구로 나간 횟수
    refunded: null,
    spot: "A",          // 명동에서 사진을 찍은 자리: A 거리 들머리, B 거리 한가운데, C 옆 골목
    shot: false,
    ate: false,
    pasted: false,
  };
}

// 홍대 쪽에서 유이가 겪는 것. 이 쪽은 표를 사지 않는다(가는 길은 아직 짓지 않았다).
export function freshHd() {
  return {
    exitMisses: 0,      // 소리가 나지 않는 계단으로 간 횟수
    pasted: false,
  };
}

// 이 쪽에서 쓴 돈의 줄. 카드에 넣어 두고 남은 돈은 쓴 돈이 아니다.
export function spending(state, fares) {
  const items = [];
  if (state.route === "express" && state.ticket) items.push({ key: "itemExpress", amount: fares.express.adult });
  if (state.route === "allstop" && state.pay === "card" && state.ticket) {
    items.push({ key: "itemCard", amount: fares.card.price });
    items.push({ key: "itemFare", amount: fares.allstop.card });
  }
  if (state.route === "allstop" && state.pay === "single" && state.ticket) {
    items.push({ key: "itemSingle", amount: fares.allstop.card + fares.allstop.singleExtra });
    if (state.refunded !== true) items.push({ key: "itemDeposit", amount: fares.allstop.deposit });
  }
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

// 지갑에서 나간 돈(카드에 넣은 돈까지)과 카드에 남은 돈.
export function wallet(state, fares) {
  const { total } = spending(state, fares);
  const onCard = state.route === "allstop" && state.pay === "card" && state.ticket;
  const rode = STEPS.indexOf(state.step) >= STEPS.indexOf("refund");
  const balance = onCard ? state.charge - (rode ? fares.allstop.card : 0) : 0;
  const out = onCard ? fares.card.price + state.charge : total;
  return { out, balance };
}

// 할머니가 지난봄에 쓴 돈. 직통열차를 탔다.
export const grandmaTotal = (fares) => fares.express.adult;

// 할머니보다 얼마나 아꼈는가(더 썼으면 음수).
export const saved = (state, fares) => grandmaTotal(fares) - spending(state, fares).total;

// 서울역의 자리 셋. 할머니가 지난봄에 찍은 자리는 광장 한가운데다. 같은 자리에서 찍으면 답장에 한 줄이 붙는다.
export const SPOTS = ["A", "B", "C"];
export const GRANDMA_SPOT = "B";
export const sameSpot = (state) => state.spot === GRANDMA_SPOT;

// 표와 개찰구가 맞는가. 직통 표는 주황, 일반(카드와 1회용)은 파랑.
export const gateOpens = (state, gate) => (state.route === "express" ? "orange" : "blue") === gate;

// 다음 걸음. 걸음의 차례를 한곳에 둔다.
export function nextStep(state) {
  switch (state.step) {
    case "intro": return "page";
    case "page": return "route";
    case "route": return "signs";   // 길을 정했으면 표지판을 따라 지하 1층으로 내려간다
    case "signs": return state.route === "express" ? "expressTicket" : "pay";
    case "pay": return state.pay === "card" ? "store" : "machine";
    case "store": case "machine": case "expressTicket": return "gates";
    case "gates": return "platform";
    case "platform": return "ride";
    case "ride": return state.route === "allstop" && state.pay === "single" ? "refund" : "arrive";
    case "refund": return "arrive";
    case "arrive": return "paste";   // 서울역에서 한 장 찍고 수첩에 붙이러 간다
    case "mdPage": return state.md.carried ? "mdDirection" : "mdPay";
    case "mdPay": return state.md.pay === "card" ? "mdStore" : "mdMachine";
    case "mdStore": case "mdMachine": return "mdDirection";
    case "mdDirection": return "mdRide";
    case "mdRide": return state.md.pay === "single" ? "mdRefund" : "mdExit";   // 환급기는 개찰구를 나와 출구로 가는 길에 있다
    case "mdRefund": return "mdExit";
    case "mdExit": return "mdShoot";
    case "mdShoot": return "mdEat";
    case "mdEat": return "mdPaste";
    case "mdPaste": case "mdDone": return "mdDone";
    case "hdPage": return "hdExit";
    case "hdExit": return "hdStreet";
    case "hdStreet": return "hdDoor";
    case "hdDoor": case "hdSoon": return "hdSoon";   // 연습실의 문 앞까지 지었다
    default: return "done";
  }
}

// 차례대로 적는다. 열차를 탔는지를 이 차례로 가린다(wallet, totals).
export const STEPS = ["intro", "page", "route", "signs", "platform", "pay", "store", "machine", "expressTicket", "gates", "ride", "refund", "arrive", "paste", "done",
  "mdPage", "mdPay", "mdStore", "mdMachine", "mdDirection", "mdRide", "mdRefund", "mdExit", "mdShoot", "mdEat", "mdPaste", "mdDone",
  "hdPage", "hdExit", "hdStreet", "hdDoor", "hdSoon"];

// ── 둘째 쪽: 서울역 → 명동 ──────────────────────────────────────────

// 공항에서 교통카드를 사서 탔으면 그 카드를 들고 있다.
export const hasAirportCard = (state) => state.route === "allstop" && state.pay === "card" && state.ticket;

// 서울역의 쪽을 붙이고 명동 쪽을 편다. 카드를 들고 왔으면 표는 이미 손에 있다.
export function enterMyeongdong(state) {
  const carried = hasAirportCard(state);
  return { ...state, step: "mdPage", md: { ...freshMd(), carried, pay: carried ? "card" : null, ticket: carried } };
}

// 명동 쪽에서 쓴 돈의 줄. 들고 온 카드는 카드값을 다시 내지 않는다.
export function mdSpending(state, fares) {
  const m = state.md, s = fares.subway, items = [];
  if (m.ticket && m.pay === "card") {
    if (!m.carried) items.push({ key: "itemCard", amount: fares.card.price });
    items.push({ key: "itemSubway", amount: s.card });
  }
  if (m.ticket && m.pay === "single") {
    items.push({ key: "itemSingle", amount: s.single });
    if (m.refunded !== true) items.push({ key: "itemDeposit", amount: s.deposit });
  }
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

// 할머니가 지난봄에 명동까지 쓴 돈. 1회용을 샀고 보증금을 돌려받지 않았다.
export const mdGrandmaTotal = (fares) => fares.subway.single + fares.subway.deposit;
export const mdSaved = (state, fares) => mdGrandmaTotal(fares) - mdSpending(state, fares).total;

// 두 쪽에서 쓴 돈과 교통카드에 남은 돈. 화면 구석의 지갑이 읽는다.
export function totals(state, fares) {
  const m = state.md;
  const rode = STEPS.indexOf(state.step) >= STEPS.indexOf("mdRefund");
  const fare = rode ? fares.subway.card : 0;
  const bought = m.pay === "card" && m.ticket && !m.carried;
  const hasCard = hasAirportCard(state) || bought;
  const balance = bought ? m.charge - fare : hasAirportCard(state) ? wallet(state, fares).balance - (m.carried ? fare : 0) : 0;
  return { spent: spending(state, fares).total + mdSpending(state, fares).total, balance, hasCard };
}

// 서울역에서 명동은 진접, 불암산 쪽(up)이다. 반대쪽(down)을 타면 숙대입구에 내려 돌아온다.
export const directionRight = (direction) => direction === "up";
export const exitRight = (exit, fares) => Number(exit) === fares.myeongdong.exits.right;
export const MD_GRANDMA_SPOT = "A";
export const mdSameSpot = (state) => state.md.spot === MD_GRANDMA_SPOT;

// ── 홍대: 노는 쪽 ───────────────────────────────────────────────────

// 명동의 쪽을 붙이고 홍대 쪽을 편다.
export const enterHongdae = (state) => ({ ...state, step: "hdPage", hd: freshHd() });
// 홍대입구역의 계단 가운데 기타 소리가 나는 쪽. 역 안의 배치는 지어낸 것이라 번호가 아니라 자리의 이름으로 가린다.
export const HD_SOUND = "stairsC";
export const hdExitRight = (id) => id === HD_SOUND;

// 돈을 그 말의 꼴로. 원은 그대로 원이다(기획서 15절: 지갑은 원으로 보인다).
export function won(amount, lang) {
  const n = Math.abs(amount).toLocaleString("en-US");
  const sign = amount < 0 ? "-" : "";
  return sign + ({ ko: `${n}원`, ja: `${n}ウォン`, zh: `${n}韩元`, en: `₩${n}` }[lang] ?? `${n}원`);
}

// 저장. localStorage 의 한 키 아래 JSON 하나. 깨졌으면 새로 시작한다(시제품이라 옮겨 두지 않는다).
// 쪽이 하나이던 때의 저장(v1)이 있으면 공항 쪽의 기록을 그대로 이어받는다.
export const KEY = "koreaoddity.trip.v2";
export const OLD_KEY = "koreaoddity.trip.v1";
export function load(storage) {
  for (const [key, version] of [[KEY, 2], [OLD_KEY, 1]]) {
    try {
      const saved = JSON.parse(storage.getItem(key));
      if (saved && saved.version === version && STEPS.includes(saved.step)) return { ...fresh(), ...saved, version: 2, md: { ...freshMd(), ...saved.md }, hd: { ...freshHd(), ...saved.hd } };
    } catch { /* 다음 열쇠로, 없으면 새로 */ }
  }
  return fresh();
}
export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
