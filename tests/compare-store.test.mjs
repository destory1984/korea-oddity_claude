// 쓰는 법: node --test tests/compare-store.test.mjs
// 비교 시제품의 저장. 가짜 storage 와 손으로 올리는 시계로 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { KEY, createStore } from "../docs/compare/core/store.js";

const read = (id) => JSON.parse(fs.readFileSync(new URL(`../docs/compare/places/${id}.json`, import.meta.url), "utf8"));
const places = { seongsan: read("seongsan"), cheomseongdae: read("cheomseongdae") };

function fakeStorage({ throwOnRead = false } = {}) {
  const map = new Map();
  return {
    map, failWrites: false,
    getItem(k) { if (throwOnRead) throw new Error("denied"); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { if (this.failWrites || throwOnRead) throw new Error("full"); map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}
function setup(storage = fakeStorage()) {
  const clock = { t: 1000 };
  const open = () => createStore(storage, places, () => clock.t);
  return { storage, clock, open, store: open() };
}
const shoot = (ctx, placeId, shot) => { ctx.clock.t += 200; return ctx.store.addShot(placeId, shot); };

test("처음 열면 성산은 처음 값, 첨성대는 A-낮의 과제 1이다", () => {
  const { store } = setup();
  assert.equal(store.status, "fresh");
  assert.deepEqual(store.state.seongsan.dials, places.seongsan.start);
  const c = store.state.cheomseongdae;
  assert.deepEqual([c.spot, c.time, c.task, c.help], ["A", "day", 1, 0]);
});

test("지점과 때를 바꾸고 나갔다 들어오면 그대로다", () => {
  const ctx = setup();
  ctx.store.go("place", "cheomseongdae");
  ctx.store.setSpot("C");
  ctx.store.setTime("night");
  const again = ctx.open();
  assert.equal(again.status, "ok");
  const c = again.state.cheomseongdae;
  assert.deepEqual([c.spot, c.time, again.state.screen, again.state.place, c.visited], ["C", "night", "place", "cheomseongdae", true]);
});

test("다이얼은 바꾼 것만 바뀌고 다시 열어도 남는다", () => {
  const ctx = setup();
  ctx.store.setDials({ x: 0.3 });
  assert.deepEqual(ctx.open().state.seongsan.dials, { ...places.seongsan.start, x: 0.3 });
});

test("포개진 사진을 두 번 붙여도 기억은 하나다", () => {
  const ctx = setup();
  const shot = shoot(ctx, "seongsan", { x: 0.3, d: 0.6, s: 0.79, h: 6.67, matched: true });
  const first = ctx.store.paste("seongsan", shot.id);
  const second = ctx.store.paste("seongsan", shot.id);
  assert.deepEqual([first.saved, first.memoryNew, second.saved, second.memoryNew], [true, true, true, false]);
  assert.equal(ctx.store.state.seongsan.memory, true);
});

test("포개지지 않은 사진도 붙지만 기억은 채워지지 않는다", () => {
  const ctx = setup();
  const shot = shoot(ctx, "seongsan", { x: 0, d: 0.2, s: 0.5, h: 12, matched: false });
  const r = ctx.store.paste("seongsan", shot.id);
  assert.deepEqual([r.saved, r.memoryNew], [true, false]);
  assert.equal(ctx.store.state.seongsan.pasted.id, shot.id);
  assert.equal(ctx.store.state.seongsan.memory, false);
});

test("첨성대: 과제 1을 채운 사진을 붙이면 과제 2로 넘어간다", () => {
  const ctx = setup();
  ctx.store.bumpHelp();
  const shot = shoot(ctx, "cheomseongdae", { spot: "B", time: "day", task: 1, ok: true });
  const r = ctx.store.paste("cheomseongdae", shot.id);
  const c = ctx.store.state.cheomseongdae;
  assert.deepEqual([r.memoryNew, c.memory, c.task, c.help], [true, true, 2, 0]);
});

test("첨성대: 과제 2를 채운 사진을 붙이면 두 장이 나란히 남는다", () => {
  const ctx = setup();
  ctx.store.paste("cheomseongdae", shoot(ctx, "cheomseongdae", { spot: "B", time: "day", task: 1, ok: true }).id);
  const r = ctx.store.paste("cheomseongdae", shoot(ctx, "cheomseongdae", { spot: "B", time: "night", task: 2, ok: true }).id);
  const c = ctx.store.state.cheomseongdae;
  assert.deepEqual([r.otherViewNew, c.otherView, c.pasted["1"].time, c.pasted["2"].time], [true, true, "day", "night"]);
});

test("첨성대: 과제를 채우지 못한 사진은 사진 칸만 채운다", () => {
  const ctx = setup();
  const r = ctx.store.paste("cheomseongdae", shoot(ctx, "cheomseongdae", { spot: "A", time: "day", task: 1, ok: false }).id);
  const c = ctx.store.state.cheomseongdae;
  assert.deepEqual([r.saved, r.memoryNew, c.pasted.photo.spot, c.pasted["1"], c.task], [true, false, "A", null, 1]);
});

test("쓰기가 실패하면 붙지 않고, 다시 하면 붙는다", () => {
  const ctx = setup();
  const shot = shoot(ctx, "cheomseongdae", { spot: "B", time: "day", task: 1, ok: true });
  ctx.storage.failWrites = true;
  const failed = ctx.store.paste("cheomseongdae", shot.id);
  assert.deepEqual([failed.saved, failed.memoryNew], [false, false]);
  assert.deepEqual([ctx.store.state.cheomseongdae.memory, ctx.store.state.cheomseongdae.task], [false, 1]);
  ctx.storage.failWrites = false;
  const retried = ctx.store.paste("cheomseongdae", shot.id);
  assert.deepEqual([retried.saved, retried.memoryNew], [true, true]);
});

test("깨진 저장은 지우지 않고 따로 옮겨 둔다", () => {
  for (const raw of ["{깨짐", '{"version": 99}', "null", "[]"]) {
    const storage = fakeStorage();
    storage.map.set(KEY, raw);
    const { store } = setup(storage);
    assert.equal(store.status, "broken", raw);
    assert.equal(store.state, null);
    assert.equal(storage.map.get(KEY), raw);
    assert.equal(storage.map.get(KEY + ".broken"), raw);
    store.startOver();
    assert.equal(store.status, "fresh");
    assert.equal(JSON.parse(storage.map.get(KEY)).version, 1);
    assert.equal(storage.map.get(KEY + ".broken"), raw);
  }
});

test("storage 가 던져도 놀이는 이어지고 붙이기만 실패한다", () => {
  const ctx = setup(fakeStorage({ throwOnRead: true }));
  assert.equal(ctx.store.status, "memory");
  ctx.store.go("place", "seongsan");
  ctx.store.setDials({ h: 7 });
  const shot = shoot(ctx, "seongsan", { ...ctx.store.state.seongsan.dials, matched: true });
  assert.ok(shot);
  assert.equal(ctx.store.paste("seongsan", shot.id).saved, false);
});

test("임시 사진은 장소마다 최근 3장이다", () => {
  const ctx = setup();
  const ids = [1, 2, 3, 4].map(() => shoot(ctx, "seongsan", { x: 0, d: 0, s: 0, h: 0, matched: false }).id);
  assert.deepEqual(ctx.store.state.seongsan.shots.map((s) => s.id), ids.slice(1));
  assert.equal(new Set(ids).size, 4);
});

test("연달아 누른 셔터는 한 장이다", () => {
  const ctx = setup();
  assert.ok(shoot(ctx, "seongsan", { x: 0, d: 0, s: 0, h: 0, matched: false }));
  assert.equal(ctx.store.addShot("seongsan", { x: 0, d: 0, s: 0, h: 0, matched: false }), null);
  assert.equal(ctx.store.state.seongsan.shots.length, 1);
});

test("밀려난 사진과 없는 사진은 붙지 않는다", () => {
  const ctx = setup();
  const first = shoot(ctx, "seongsan", { x: 0, d: 0, s: 0, h: 0, matched: true });
  for (let i = 0; i < 3; i++) shoot(ctx, "seongsan", { x: 0, d: 0, s: 0, h: 0, matched: false });
  assert.deepEqual(ctx.store.paste("seongsan", first.id), { saved: false, memoryNew: false, otherViewNew: false });
  assert.equal(ctx.store.paste("seongsan", 999).saved, false);
  assert.equal(ctx.store.state.seongsan.memory, false);
});

test("붙인 사진은 임시 사진이 밀려나도 남는다", () => {
  const ctx = setup();
  const first = shoot(ctx, "seongsan", { x: 0.3, d: 0.6, s: 0.79, h: 6.67, matched: true });
  ctx.store.paste("seongsan", first.id);
  for (let i = 0; i < 4; i++) shoot(ctx, "seongsan", { x: 0, d: 0, s: 0, h: 0, matched: false });
  assert.equal(ctx.open().state.seongsan.pasted.id, first.id);
});

test("도움은 3단계에서 멈춘다", () => {
  const { store } = setup();
  assert.deepEqual([store.bumpHelp(), store.bumpHelp(), store.bumpHelp(), store.bumpHelp()], [1, 2, 3, 3]);
});

test("마지막 물음의 답이 남는다", () => {
  const ctx = setup();
  ctx.store.setAnswer("both");
  assert.equal(ctx.open().state.answer, "both");
});
