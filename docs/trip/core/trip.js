// 여행의 셈. 화면과 브라우저를 모른다. 요금은 data/fares.json 에서 받는다.
// 한 쪽(공항 → 서울역)에서 유이가 고르는 것: 길(일반, 직통), 내는 법(교통카드, 1회용), 충전한 돈, 보증금을 돌려받았는가.

export const fresh = () => ({
  version: 1,
  step: "intro",
  route: null,        // "allstop" | "express"
  pay: null,          // 일반열차일 때: "card" | "single"
  charge: 0,          // 교통카드에 넣은 돈
  ticket: false,      // 표나 카드를 손에 쥐었는가
  gateMisses: 0,      // 다른 개찰구로 간 횟수
  refunded: null,     // 1회용의 보증금: true 돌려받음, false 그냥 감, null 아직
  shot: false,
  pasted: false,
});

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
  const rode = ["refund", "arrive", "paste", "done"].includes(state.step);
  const balance = onCard ? state.charge - (rode ? fares.allstop.card : 0) : 0;
  const out = onCard ? fares.card.price + state.charge : total;
  return { out, balance };
}

// 할머니가 지난봄에 쓴 돈. 직통열차를 탔다.
export const grandmaTotal = (fares) => fares.express.adult;

// 할머니보다 얼마나 아꼈는가(더 썼으면 음수).
export const saved = (state, fares) => grandmaTotal(fares) - spending(state, fares).total;

// 표와 개찰구가 맞는가. 직통 표는 주황, 일반(카드와 1회용)은 파랑.
export const gateOpens = (state, gate) => (state.route === "express" ? "orange" : "blue") === gate;

// 다음 걸음. 걸음의 차례를 한곳에 둔다.
export function nextStep(state) {
  switch (state.step) {
    case "intro": return "page";
    case "page": return "route";
    case "route": return state.route === "express" ? "expressTicket" : "pay";
    case "pay": return state.pay === "card" ? "store" : "machine";
    case "store": case "machine": case "expressTicket": return "gates";
    case "gates": return "ride";
    case "ride": return state.route === "allstop" && state.pay === "single" ? "refund" : "arrive";
    case "refund": return "arrive";
    case "arrive": return "paste";   // 서울역에서 한 장 찍고 수첩에 붙이러 간다
    default: return "done";
  }
}

export const STEPS = ["intro", "page", "route", "pay", "store", "machine", "expressTicket", "gates", "ride", "refund", "arrive", "paste", "done"];

// 돈을 그 말의 꼴로. 원은 그대로 원이다(기획서 15절: 지갑은 원으로 보인다).
export function won(amount, lang) {
  const n = Math.abs(amount).toLocaleString("en-US");
  const sign = amount < 0 ? "-" : "";
  return sign + ({ ko: `${n}원`, ja: `${n}ウォン`, zh: `${n}韩元`, en: `₩${n}` }[lang] ?? `${n}원`);
}

// 저장. localStorage 의 한 키 아래 JSON 하나. 깨졌으면 새로 시작한다(시제품이라 옮겨 두지 않는다).
export const KEY = "koreaoddity.trip.v1";
export function load(storage) {
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    if (saved && saved.version === 1 && STEPS.includes(saved.step)) return { ...fresh(), ...saved };
  } catch { /* 아래에서 새로 */ }
  return fresh();
}
export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
