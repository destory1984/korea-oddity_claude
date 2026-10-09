// 쓰는 법: node --test tests/compare-log.test.mjs
// 비교 시제품의 로그에서 비교의 숫자 넷이 나오는지 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { metrics, exportText, missStreak } from "../docs/compare/core/log.js";
import { createStore } from "../docs/compare/core/store.js";

const read = (id) => JSON.parse(fs.readFileSync(new URL(`../docs/compare/places/${id}.json`, import.meta.url), "utf8"));
const places = { seongsan: read("seongsan"), cheomseongdae: read("cheomseongdae") };
const line = (place, t, kind, value = null) => ({ place, t, kind, value });

const played = [
  line("cheomseongdae", 1000, "enter"),
  line("cheomseongdae", 3000, "shutter", { spot: "A", time: "day", task: 1, ok: false }),
  line("cheomseongdae", 4000, "help", 1),
  line("seongsan", 5000, "enter"),
  line("seongsan", 6000, "shutter", { x: 0, d: 0, s: 0, h: 0, matched: false }),
  line("cheomseongdae", 9000, "shutter", { spot: "B", time: "day", task: 1, ok: true }),
  line("cheomseongdae", 10000, "paste", 2),
  line("cheomseongdae", 12000, "retry", { afterAll: false }),
  line("cheomseongdae", 15000, "shutter", { spot: "B", time: "night", task: 2, ok: true }),
  line("cheomseongdae", 17000, "retry", { afterAll: true }),
];

test("첫 성공까지의 시간, 셔터, 도움, 다시 찍기가 나온다", () => {
  assert.deepEqual(metrics(played, "cheomseongdae"), { firstSuccessMs: 8000, shutters: 3, helps: 1, retried: true, wentOn: true });
});

test("성공이 없으면 시간이 비고, 다른 장소의 줄은 세지 않는다", () => {
  assert.deepEqual(metrics(played, "seongsan"), { firstSuccessMs: null, shutters: 1, helps: 0, retried: false, wentOn: false });
});

test("성공 전의 다시 찍기는 세지 않는다", () => {
  const log = [line("seongsan", 0, "enter"), line("seongsan", 10, "retry", { afterAll: false }), line("seongsan", 50, "shutter", { matched: true })];
  assert.deepEqual(metrics(log, "seongsan"), { firstSuccessMs: 50, shutters: 1, helps: 0, retried: false, wentOn: false });
});

test("내보낸 글은 로그와 숫자와 답이 든 JSON이다", () => {
  const out = JSON.parse(exportText({ log: played, answer: "cheomseongdae" }));
  assert.equal(out.log.length, played.length);
  assert.equal(out.metrics.cheomseongdae.firstSuccessMs, 8000);
  assert.equal(out.metrics.seongsan.shutters, 1);
  assert.equal(out.answer, "cheomseongdae");
});

test("store 가 하는 일이 차례대로 로그에 쌓인다", () => {
  const map = new Map();
  const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
  let t = 0;
  const store = createStore(storage, places, () => (t += 500));
  store.go("place", "seongsan");
  store.setDials({ x: 0.3 });
  const shot = store.addShot("seongsan", { ...store.state.seongsan.dials, matched: false });
  store.paste("seongsan", shot.id);
  store.go("journal");
  const kinds = store.state.log.map((l) => l.kind);
  assert.deepEqual(kinds, ["enter", "dial", "shutter", "paste", "leave"]);
  assert.deepEqual(store.state.log[1].value, { x: 0.3 });
  assert.ok(store.state.log.every((l) => l.place === "seongsan" && typeof l.t === "number"));
});

test("다음 과제로 넘어가려고 누른 다시 찍기는 세지 않고 wentOn 으로 따로 남는다", () => {
  const log = played.slice(0, 8);   // 과제 1을 붙이고 다시 찍기를 누른 데까지
  const m = metrics(log, "cheomseongdae");
  assert.deepEqual([m.retried, m.wentOn], [false, true]);
});

test("missStreak: 마지막 성공 뒤로 잇달아 틀린 셔터를 센다", () => {
  const miss = (t) => line("seongsan", t, "shutter", { matched: false });
  assert.equal(missStreak([], "seongsan"), 0);
  assert.equal(missStreak([miss(1), line("seongsan", 2, "dial", { x: 0 }), miss(3), miss(4)], "seongsan"), 3);
  assert.equal(missStreak([miss(1), miss(2), line("seongsan", 3, "shutter", { matched: true }), miss(4)], "seongsan"), 1);
  assert.equal(missStreak([miss(1), line("cheomseongdae", 2, "shutter", { ok: false, task: 1 })], "seongsan"), 1);
});

test("missStreak: 첨성대는 과제가 바뀌면 다시 센다", () => {
  const shot = (t, task, ok) => line("cheomseongdae", t, "shutter", { task, ok });
  assert.equal(missStreak([shot(1, 1, false), shot(2, 1, false), shot(3, 1, true), shot(4, 2, false)], "cheomseongdae"), 1);
  assert.equal(missStreak([shot(1, 1, false), shot(2, 1, false), shot(3, 1, false)], "cheomseongdae"), 3);
});
