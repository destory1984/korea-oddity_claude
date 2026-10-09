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
  ctx.store.setSpot("cheomseongdae", "C");
  ctx.store.setTime("cheomseongdae", "night");
  const again = ctx.open();
  assert.equal(again.status, "ok");
  const c = again.state.cheomseongdae;
  assert.deepEqual([c.spot, c.time, again.state.screen, again.state.place, c.visited], ["C", "night", "place", "cheomseongdae", true]);
});

test("다이얼은 바꾼 것만 바뀌고 다시 열어도 남는다", () => {
  const ctx = setup();
  ctx.store.setDials("seongsan", { x: 0.3 });
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
  ctx.store.bumpHelp("cheomseongdae");
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
  ctx.store.setDials("seongsan", { h: 7 });
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
  assert.deepEqual([store.bumpHelp("cheomseongdae"), store.bumpHelp("cheomseongdae"), store.bumpHelp("cheomseongdae"), store.bumpHelp("cheomseongdae")], [1, 2, 3, 3]);
});

test("마지막 물음의 답이 남는다", () => {
  const ctx = setup();
  ctx.store.setAnswer("both");
  assert.equal(ctx.open().state.answer, "both");
});

test("storage 가 던질 때 새로 시작해도 저장이 안 되는 것을 숨기지 않는다", () => {
  const ctx = setup(fakeStorage({ throwOnRead: true }));
  ctx.store.go("place", "seongsan");
  ctx.store.startOver();
  assert.equal(ctx.store.status, "memory");
  assert.equal(ctx.store.state.screen, "start");
});

test("쓰기가 실패하면 저장이 안 된 것을 알 수 있고, 다시 되면 풀린다", () => {
  const ctx = setup();
  assert.equal(ctx.store.unsaved, false);
  ctx.storage.failWrites = true;
  ctx.store.setSpot("cheomseongdae", "B");
  assert.equal(ctx.store.unsaved, true);
  ctx.storage.failWrites = false;
  ctx.store.setSpot("cheomseongdae", "C");
  assert.equal(ctx.store.unsaved, false);
});

test("도움이 3단계에 닿은 뒤에 눌러도 로그에 더 쌓이지 않는다", () => {
  const { store } = setup();
  for (let i = 0; i < 6; i++) store.bumpHelp("cheomseongdae");
  assert.equal(store.state.log.filter((l) => l.kind === "help").length, 3);
});

test("들어갈 때의 장면은 장소마다 한 번 본 것으로 남는다", () => {
  const ctx = setup();
  assert.equal(Boolean(ctx.store.state.seongsan.storySeen), false);
  ctx.store.seeStory("seongsan");
  const again = ctx.open();
  assert.equal(again.state.seongsan.storySeen, true);
  assert.equal(Boolean(again.state.cheomseongdae.storySeen), false);
});

test("장소가 달라도 같은 꼴로 저장한다(둘째 판의 두 장소)", () => {
  const two = { buseoksa: read("buseoksa"), sobaeksan: read("sobaeksan") };
  const storage = fakeStorage();
  const store = createStore(storage, two, () => 1000, "paldo.compare.v2");
  assert.deepEqual(store.state.buseoksa.dials, two.buseoksa.start);
  const [spot, time] = two.sobaeksan.tasks[0].start.split("-");
  assert.deepEqual([store.state.sobaeksan.spot, store.state.sobaeksan.time, store.state.sobaeksan.task], [spot, time, 1]);
  store.setDials("buseoksa", { h: 17 });
  store.setSpot("sobaeksan", "B");
  assert.equal(JSON.parse(storage.map.get("paldo.compare.v2")).buseoksa.dials.h, 17);
  assert.equal(storage.map.has(KEY), false);
});

test("장소의 칸이 빠진 저장은 깨진 것으로 친다", () => {
  const storage = fakeStorage();
  storage.map.set(KEY, '{"version": 1, "log": []}');
  assert.equal(setup(storage).store.status, "broken");
});
