// 쓰는 법: node --test tests/trip.test.mjs
// 새 기획의 시제품(공항 → 서울역): 돈의 셈, 걸음의 차례, 글이 네 나라 말에 빠짐없이 있는지 본다.
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
  assert.deepEqual(walk({ route: "allstop", pay: "card" }), ["intro", "page", "route", "pay", "store", "gates", "ride", "arrive", "paste"]);
  assert.deepEqual(walk({ route: "allstop", pay: "single" }), ["intro", "page", "route", "pay", "machine", "gates", "ride", "refund", "arrive", "paste"]);
  assert.deepEqual(walk({ route: "express" }), ["intro", "page", "route", "expressTicket", "gates", "ride", "arrive", "paste"]);
  for (const step of walk({ route: "allstop", pay: "single" })) assert.ok(trip.STEPS.includes(step), step);
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

test("글: 공항의 쪽은 지난봄의 길이라고 밝히고, 1988년에는 김포공항이었다고 적는다", () => {
  // 인천공항은 2001년에 열었다. 1988년의 사진과 공항의 쪽이 한 화면에 놓여 1988년에 인천공항에 내린 것처럼 읽혔다.
  const source = read("main.js");
  for (const key of ["gWhen", "gThenText", "grandmaSpring", "photoThen"]) assert.ok(source.includes(`t("${key}")`), key);
  assert.ok(TEXT.ko.gThenText.includes("김포공항") && TEXT.ko.gThenText.includes("1988"));
  assert.ok(TEXT.ja.gThenText.includes("金浦空港"));
  // 공항철도도 그때는 없었다(2007년에 열었고 서울역까지는 2010년이다).
  assert.ok(TEXT.ko.gThenText.includes("공항철도") && TEXT.ja.gThenText.includes("空港鉄道"));
  assert.ok(TEXT.ko.gWhen.includes("지난봄"));
});

test("글: 고른 말이 없으면 기기의 말, 넷이 아니면 영어로 연다", () => {
  const none = { getItem: () => null };
  assert.equal(pickLang(none, "ja-JP"), "ja");
  assert.equal(pickLang(none, "fr-FR"), "en");
  assert.equal(pickLang({ getItem: () => "zh" }, "ko-KR"), "zh");
  assert.equal(translate("ja", "about", { n: 59 }), "約59分");
});

test("그림: 화면이 부르는 그림이 모두 있다", () => {
  const source = read("main.js");
  for (const [, name] of source.matchAll(/img\("([\w-]+)"\)/g)) assert.ok(fs.existsSync(new URL(`../docs/trip/art/${name}.webp`, import.meta.url)), name);
});
