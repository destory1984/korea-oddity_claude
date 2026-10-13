// 쓰는 법: node --test tests/trip.test.mjs
// 새 기획의 시제품(공항 → 서울역 → 명동): 돈의 셈, 걸음의 차례, 글이 네 나라 말에 빠짐없이 있는지 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as trip from "../docs/trip/core/trip.js";
import { TEXT, LANGS, pickLang, translate } from "../docs/trip/i18n.js";

const read = (path) => fs.readFileSync(new URL(`../docs/trip/${path}`, import.meta.url), "utf8");
const fares = JSON.parse(read("data/fares.json"));
const at = (patch) => ({ ...trip.fresh(), ...patch });

test("요금: 공항철도 누리집에서 본 값이고 본 날이 적혀 있다", () => {
  assert.match(fares.checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(fares.allstop.card, 4750);
  assert.equal(fares.allstop.singleExtra, 100);
  assert.equal(fares.allstop.deposit, 500);
  assert.equal(fares.express.adult, 13000);
  assert.equal(fares.express.minutes, 43);
  assert.equal(fares.allstop.to.seoul, fares.allstop.card);
  for (const part of [fares.allstop, fares.express, fares.card, fares.stations]) assert.match(part.source, /^https:\/\/www\.airportrailroad\.com\//);
});

test("요금: 확인하지 못한 값에는 까닭이 적혀 있다", () => {
  for (const part of [fares.allstop, fares.card, fares.machine, fares.gates]) {
    if (Object.values(part.verified).includes(false)) assert.ok(part.unverifiedNote.length > 20);
    else assert.ok(part.note.length > 20, "확인한 값에는 어디서 보았는지 적는다");
  }
});

test("쓴 돈: 교통카드로 일반열차를 타면 카드값과 운임이고, 충전한 돈은 쓴 돈이 아니다", () => {
  const state = at({ route: "allstop", pay: "card", charge: 10000, ticket: true, step: "arrive" });
  assert.equal(trip.spending(state, fares).total, 3000 + 4750);
  assert.deepEqual(trip.wallet(state, fares), { out: 13000, balance: 10000 - 4750 });
  assert.equal(trip.saved(state, fares), 13000 - 7750);
});

test("쓴 돈: 타기 전에는 카드에 충전한 돈이 그대로 남아 있다", () => {
  const state = at({ route: "allstop", pay: "card", charge: 20000, ticket: true, step: "gates" });
  assert.equal(trip.wallet(state, fares).balance, 20000);
});

test("쓴 돈: 1회용은 100원을 더 내고, 보증금은 돌려받아야 빠진다", () => {
  const rode = { route: "allstop", pay: "single", ticket: true, step: "arrive" };
  assert.equal(trip.spending(at({ ...rode, refunded: true }), fares).total, 4850);
  assert.equal(trip.spending(at({ ...rode, refunded: false }), fares).total, 5350);
  assert.equal(trip.spending(at({ ...rode, refunded: null }), fares).total, 5350);
});

test("쓴 돈: 직통열차는 할머니와 같고, 표를 사기 전에는 0이다", () => {
  assert.equal(trip.saved(at({ route: "express", ticket: true }), fares), 0);
  assert.equal(trip.spending(at({ route: "express" }), fares).total, 0);
  assert.equal(trip.spending(trip.fresh(), fares).total, 0);
});

test("개찰구: 직통 표는 주황, 교통카드와 1회용은 파랑에서 열린다", () => {
  assert.equal(trip.gateOpens(at({ route: "express" }), "orange"), true);
  assert.equal(trip.gateOpens(at({ route: "express" }), "blue"), false);
  assert.equal(trip.gateOpens(at({ route: "allstop", pay: "card" }), "blue"), true);
  assert.equal(trip.gateOpens(at({ route: "allstop", pay: "single" }), "orange"), false);
});

test("걸음: 고른 길과 내는 법에 따라 차례가 갈리고, 어느 길이든 붙이기에 닿는다", () => {
  const walk = (choices) => {
    let state = trip.fresh();
    const seen = [state.step];
    while (state.step !== "paste" && seen.length < 20) {
      if (state.step === "route") state.route = choices.route;
      if (state.step === "pay") state.pay = choices.pay;
      state = { ...state, step: trip.nextStep(state) };
      seen.push(state.step);
    }
    return seen;
  };
  assert.deepEqual(walk({ route: "allstop", pay: "card" }), ["intro", "page", "route", "signs", "pay", "store", "gates", "platform", "ride", "arrive", "paste"]);
  assert.deepEqual(walk({ route: "allstop", pay: "single" }), ["intro", "page", "route", "signs", "pay", "machine", "gates", "platform", "ride", "refund", "arrive", "paste"]);
  assert.deepEqual(walk({ route: "express" }), ["intro", "page", "route", "signs", "expressTicket", "gates", "platform", "ride", "arrive", "paste"]);
  for (const step of walk({ route: "allstop", pay: "single" })) assert.ok(trip.STEPS.includes(step), step);
});

test("자리: 서울역의 자리는 셋이고, 할머니와 같은 자리는 광장 한가운데다", () => {
  assert.deepEqual(trip.SPOTS, ["A", "B", "C"]);
  assert.equal(trip.sameSpot(at({ spot: "B" })), true);
  assert.equal(trip.sameSpot(at({ spot: "A" })), false);
  assert.equal(trip.fresh().spot, "B");
  for (const spot of trip.SPOTS) for (const lang of LANGS) assert.ok(TEXT[lang][`spot${spot}`], `${lang} spot${spot}`);
});

test("저장: 쓴 것을 다시 읽고, 깨졌거나 모르는 걸음이면 새로 시작한다", () => {
  const storage = { map: new Map(), getItem(k) { return this.map.get(k) ?? null; }, setItem(k, v) { this.map.set(k, v); } };
  trip.save(storage, at({ step: "gates", route: "express", ticket: true }));
  assert.equal(trip.load(storage).step, "gates");
  storage.map.set(trip.KEY, "{not json");
  assert.equal(trip.load(storage).step, "intro");
  storage.map.set(trip.KEY, JSON.stringify({ version: 1, step: "moon" }));
  assert.equal(trip.load(storage).step, "intro");
});

test("돈의 꼴: 말마다 다르고 음수는 앞에 표시가 붙는다", () => {
  assert.equal(trip.won(4750, "ko"), "4,750원");
  assert.equal(trip.won(4750, "ja"), "4,750ウォン");
  assert.equal(trip.won(4750, "zh"), "4,750韩元");
  assert.equal(trip.won(13000, "en"), "₩13,000");
  assert.equal(trip.won(-500, "ko"), "-500원");
});

test("글: 네 나라 말에 같은 열쇠가 빠짐없이 있고 빈 글이 없다", () => {
  assert.deepEqual(LANGS, ["ko", "en", "ja", "zh"]);
  const keys = Object.keys(TEXT.ko).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(TEXT[lang]).sort(), keys, lang);
    for (const [key, text] of Object.entries(TEXT[lang])) assert.ok(text.trim().length > 0, `${lang}.${key}`);
  }
});

test("글: 채워 넣는 자리의 이름이 네 나라 말에서 같다", () => {
  const slots = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(TEXT.ko)) for (const lang of LANGS) assert.deepEqual(slots(TEXT[lang][key]), slots(TEXT.ko[key]), `${lang}.${key}`);
});

test("글: 화면이 쓰는 열쇠가 모두 사전에 있다", () => {
  const source = read("main.js");
  const used = new Set([...source.matchAll(/\b[tm]\("(\w+)"/g)].map((m) => m[1]));
  for (const key of ["replyA1", "replyA2", "replyA3", "replyE1", "replyE2", "replyE3", "replyLost", "itemExpress", "itemCard", "itemFare", "itemSingle", "itemDeposit", "yuiExpress", "yuiAllstopCard", "yuiAllstopSingle"]) used.add(key);
  for (const key of used) assert.ok(key in TEXT.ko, key);
  for (const id of fares.stations.allstop) for (const lang of LANGS) assert.ok(TEXT[lang][`st_${id}`], `${lang} st_${id}`);
});

test("글: 공항의 쪽은 지난봄의 길이라고 밝히고, 첫 여행은 2004년 가을이며 그때 없던 것을 그때의 일로 적지 않는다", () => {
  // 처음에는 첫 여행이 1988년이었다. 인천공항(2001), 교통카드(2004.7), 공항철도(2007, 서울역까지 2010)가 그때 없어
  // 쪽마다 "그때는 없었지"를 달아야 했다. 사용자가 첫 여행을 2004년 가을(일본의 한류 붐)로 당겼다. 그때 없던 것은 공항철도뿐이다.
  const source = read("main.js");
  for (const key of ["gWhen", "gThenText", "grandmaSpring", "photoThen"]) assert.ok(source.includes(`t("${key}")`), key);
  assert.ok(source.includes("典子, 2004.10") && !source.includes("1988"));
  assert.ok(TEXT.ko.gWhen.includes("지난봄"));
  for (const lang of LANGS) {
    for (const [key, text] of Object.entries(TEXT[lang])) assert.ok(!text.includes("1988"), `${lang}.${key}`);
    for (const key of ["letter2", "gThenText", "photoThen", "clueTitle"]) assert.ok(TEXT[lang][key].includes("2004"), `${lang}.${key}`);
  }
  assert.ok(TEXT.ko.gThenText.includes("공항철도") && TEXT.ja.gThenText.includes("空港鉄道"));
  assert.ok(!TEXT.ko.gThenText.includes("김포") && !TEXT.ko.gThenText.includes("교통카드"));
});

test("글: 드라마의 제목은 지어낸 것이고 실제 드라마의 제목을 쓰지 않는다", () => {
  assert.ok(TEXT.ko.letter2.includes("가을연가"));
  for (const lang of LANGS) for (const text of Object.values(TEXT[lang])) assert.ok(!/겨울연가|冬のソナタ|冬季恋歌|Winter Sonata/.test(text));
});

test("글: 고른 말이 없으면 기기의 말, 넷이 아니면 영어로 연다", () => {
  const none = { getItem: () => null };
  assert.equal(pickLang(none, "ja-JP"), "ja");
  assert.equal(pickLang(none, "fr-FR"), "en");
  assert.equal(pickLang({ getItem: () => "zh" }, "ko-KR"), "zh");
  assert.equal(translate("ja", "about", { n: 59 }), "約59分");
});

test("그림: 화면이 부르는 그림이 모두 있다", () => {
  // 유이는 말풍선 곁에 얼굴이 보이게 선다. 그림은 style.css 가 부른다.
  const sprite = read("style.css").match(/url\("\.\.\/(art\/yui\/[\w-]+\.png)"\)/)[1];
  assert.ok(fs.existsSync(new URL(`../docs/${sprite}`, import.meta.url)), sprite);
  const source = read("main.js");
  for (const name of ["seoul-a", "seoul-station", "seoul-c"]) assert.ok(fs.existsSync(new URL(`../docs/trip/art/${name}.webp`, import.meta.url)), name);
  for (const [, name] of source.matchAll(/img\("([\w-]+)"\)/g)) assert.ok(fs.existsSync(new URL(`../docs/trip/art/${name}.webp`, import.meta.url)), name);
});

// ── 둘째 쪽: 서울역 → 명동 ──────────────────────────────────────────

const pastedAirport = (patch) => at({ step: "paste", ticket: true, shot: true, pasted: true, ...patch });

test("명동: 지하철 요금은 서울교통공사 누리집에서 본 값이고, 출구에는 본 곳이 적혀 있다", () => {
  const s = fares.subway;
  assert.deepEqual([s.card, s.single, s.deposit, s.minutes], [1550, 1650, 500, 4]);
  assert.deepEqual(s.stops, ["seoul", "hoehyeon", "myeongdong"]);
  assert.match(s.source, /seoulmetro\.co\.kr/);
  assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(fares.myeongdong.verified.exits, true);
  assert.ok(fares.myeongdong.note.length > 20 && fares.myeongdong.sources.length > 0);
  assert.ok(fares.myeongdong.exits.choices.includes(fares.myeongdong.exits.right) && fares.myeongdong.exits.choices.includes(fares.myeongdong.exits.grandma));
  for (const id of [...s.stops, ...s.toward, ...s.opposite, s.oppositeNext, ...s.machineDests]) for (const lang of LANGS) assert.ok(TEXT[lang][`st_${id}`], `${lang} st_${id}`);
  assert.ok(s.machineDests.includes(s.stops.at(-1)));
});

test("명동: 공항에서 산 교통카드는 이어지고, 카드값을 다시 내지 않는다", () => {
  const state = trip.enterMyeongdong(pastedAirport({ route: "allstop", pay: "card", charge: 10000 }));
  assert.equal(state.step, "mdPage");
  assert.deepEqual([state.md.carried, state.md.pay, state.md.ticket], [true, "card", true]);
  assert.equal(trip.nextStep(state), "mdDirection");
  assert.equal(trip.mdSpending(state, fares).total, 1550);
  assert.equal(trip.mdSaved(state, fares), 2150 - 1550);
  assert.deepEqual(trip.totals(state, fares), { spent: 7750 + 1550, balance: 10000 - 4750, hasCard: true });
  assert.equal(trip.totals({ ...state, step: "mdExit" }, fares).balance, 10000 - 4750 - 1550);
});

test("명동: 직통이나 1회용으로 왔으면 표를 사야 하고, 1회용은 보증금을 돌려받아야 할머니보다 싸다", () => {
  const state = trip.enterMyeongdong(pastedAirport({ route: "express" }));
  assert.deepEqual([state.md.carried, state.md.ticket], [false, false]);
  assert.equal(trip.nextStep(state), "mdPay");
  assert.equal(trip.mdSpending(state, fares).total, 0);
  const single = (refunded) => ({ ...state, step: "mdPaste", md: { ...state.md, pay: "single", ticket: true, refunded } });
  assert.equal(trip.mdSaved(single(true), fares), 500);
  assert.equal(trip.mdSaved(single(false), fares), 0);
  assert.deepEqual(trip.totals(single(true), fares), { spent: 13000 + 1650, balance: 0, hasCard: false });
  const bought = { ...state, step: "mdDirection", md: { ...state.md, pay: "card", ticket: true, charge: 10000 } };
  assert.equal(trip.mdSpending(bought, fares).total, 3000 + 1550);
  assert.equal(trip.totals(bought, fares).balance, 10000);
  assert.equal(trip.totals({ ...bought, step: "mdShoot" }, fares).balance, 10000 - 1550);
});

test("명동: 걸음의 차례가 내는 법에 따라 갈리고 붙이기에 닿는다", () => {
  const walk = (airport, pay) => {
    let state = trip.enterMyeongdong(pastedAirport(airport));
    const seen = [state.step];
    while (state.step !== "mdPaste" && seen.length < 20) {
      if (state.step === "mdPay") state.md.pay = pay;
      state = { ...state, step: trip.nextStep(state) };
      seen.push(state.step);
    }
    return seen;
  };
  assert.deepEqual(walk({ route: "allstop", pay: "card", charge: 10000 }), ["mdPage", "mdDirection", "mdRide", "mdExit", "mdShoot", "mdEat", "mdPaste"]);
  assert.deepEqual(walk({ route: "express" }, "card"), ["mdPage", "mdPay", "mdStore", "mdDirection", "mdRide", "mdExit", "mdShoot", "mdEat", "mdPaste"]);
  assert.deepEqual(walk({ route: "allstop", pay: "single" }, "single"), ["mdPage", "mdPay", "mdMachine", "mdDirection", "mdRide", "mdRefund", "mdExit", "mdShoot", "mdEat", "mdPaste"]);
  for (const step of walk({ route: "express" }, "single")) assert.ok(trip.STEPS.includes(step), step);
  assert.equal(trip.nextStep(at({ step: "mdPaste" })), "mdDone");
});

test("명동: 방면은 진접과 불암산 쪽, 출구는 자료에 적힌 번호, 할머니의 자리는 거리 들머리다", () => {
  assert.equal(trip.directionRight("up"), true);
  assert.equal(trip.directionRight("down"), false);
  assert.equal(trip.exitRight("6", fares), true);
  assert.equal(trip.exitRight(3, fares), false);
  assert.equal(trip.freshMd().spot, trip.MD_GRANDMA_SPOT);
  assert.equal(trip.mdSameSpot(at({})), true);
});

test("명동: 쪽이 하나이던 때의 저장을 이어받고, 명동의 걸음도 저장된다", () => {
  const storage = { map: new Map(), getItem(k) { return this.map.get(k) ?? null; }, setItem(k, v) { this.map.set(k, v); } };
  storage.map.set(trip.OLD_KEY, JSON.stringify({ version: 1, step: "paste", route: "allstop", pay: "card", charge: 20000, ticket: true, pasted: true }));
  const old = trip.load(storage);
  assert.deepEqual([old.version, old.step, old.charge, old.md.spot], [2, "paste", 20000, "A"]);
  const state = trip.enterMyeongdong(old);
  state.md.exitMisses = 2; state.step = "mdExit";
  trip.save(storage, state);
  assert.deepEqual([trip.load(storage).step, trip.load(storage).md.exitMisses, trip.load(storage).md.carried], ["mdExit", 2, true]);
});

test("명동: 화면이 쓰는 글과 그림이 모두 있고, 걸음마다 화면이 있다", () => {
  const source = read("main.js");
  for (const step of trip.STEPS.filter((name) => name.startsWith("md"))) assert.ok(source.includes(`  ${step}(`) || source.includes(`SCREENS.${step} =`), step);
  for (const key of ["mdYuiCarried", "mdYuiNoCard", "mdYuiSingle", "mdYuiCard", "mdYuiNewCard", "mdReplyLost", "mdReply1", "mdReply2", "mdReply3", "exitWrongG", "exitWrong",
    "mdWrongDest", "mdToPlatform", "mdShootTitle", "mdShootYui", "mdSpotA", "mdSpotB", "mdSpotC", "mdRideYui", "eatDone", "eatYui", "toPaste", "eatDo", "itemSubway"]) assert.ok(key in TEXT.ko, key);
  for (const name of ["line4-platform", "md-exit", "md-wrong", "md-a", "md-b", "md-c", "md-eat"]) assert.ok(fs.existsSync(new URL(`../docs/trip/art/${name}.webp`, import.meta.url)), name);
  for (const lang of LANGS) assert.ok(TEXT[lang].mdTipText.includes("{exit}") && TEXT[lang].mdLostText.includes("{exit}"), lang);
});
