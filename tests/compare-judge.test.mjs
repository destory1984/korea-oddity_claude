// 쓰는 법: node --test tests/compare-judge.test.mjs
// 비교 시제품의 판정 둘. 성공 조건과 소라의 말은 장소 자료에서 읽어 견준다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { dayOfYear, stagedSun, judgeContinuous, judgeDiscrete } from "../docs/compare/core/judge.js";

const { sunAt, sunTimes } = createRequire(import.meta.url)("../docs/assets/sun.js");
const read = (id) => JSON.parse(fs.readFileSync(new URL(`../docs/compare/places/${id}.json`, import.meta.url), "utf8"));
const seongsan = read("seongsan");
const cheom = read("cheomseongdae");

const [LAT, LON] = seongsan.latlon;
const S = (day) => (day + 0.5) / 365;
const sun = (dials) => sunAt(LAT, LON, dayOfYear(dials.s), dials.h * 60 - 540);
const judge = (dials, sunOf = sun) => judgeContinuous(seongsan, dials, sunOf(dials));
const good = { x: 0.3, d: 0.6, s: S(287), h: 6 + 40 / 60 };

test("dayOfYear: 0 → 364 안에서 감아 돈다", () => {
  assert.equal(dayOfYear(0), 0);
  assert.equal(dayOfYear(0.9999), 364);
  assert.equal(dayOfYear(1), 0);
  assert.equal(dayOfYear(-0.001), 364);
  assert.equal(dayOfYear(1.5), dayOfYear(0.5));
  assert.equal(dayOfYear(S(287)), 287);
});

test("성산: 들어오자마자 찍으면 포개지지 않고 구도를 짚는다", () => {
  const v = judge(seongsan.start);
  assert.equal(v.matched, false);
  assert.equal(v.sora, "ridgeRight");
  assert.equal(v.line, seongsan.sora.ridgeRight);
});

test("성산: 구도가 틀리면 산이 어느 쪽에 있는지, 큰지 작은지를 짚는다", () => {
  // 좌우 값이 작으면 겹이 덜 밀려 산이 사진보다 오른쪽에 보이고, 거리 값이 작으면 가까워서 크게 보인다.
  assert.equal(judge({ ...good, x: 0.1 }).sora, "ridgeRight");
  assert.equal(judge({ ...good, x: 0.5 }).sora, "ridgeLeft");
  assert.equal(judge({ ...good, d: 0.3 }).sora, "tooNear");
  assert.equal(judge({ ...good, d: 0.9 }).sora, "tooFar");
  assert.equal(judge({ ...good, x: 0.1, d: 0.3 }).sora, "ridgeRight");   // 둘 다 틀리면 좌우부터
  for (const key of ["ridgeRight", "ridgeLeft", "tooNear", "tooFar"]) assert.ok(seongsan.sora[key], key);
});

test("성산: 구도가 맞아도 12시면 그림자가 없다고 한다", () => {
  const v = judge({ ...good, h: 12 });
  assert.equal(v.matched, false);
  assert.equal(v.time, "noon");
  assert.equal(v.sora, "noon");
});

test("성산: 10월 15일 06:40에 구도가 맞으면 포개진다", () => {
  const v = judge(good);
  assert.deepEqual([v.matched, v.composition, v.season, v.time, v.sora], [true, true, true, "morning", "match"]);
  assert.equal(v.line, seongsan.sora.match);
});

test("성산: 해 뜨기 전은 밤이고 저녁은 저녁이다", () => {
  assert.deepEqual([judge({ ...good, h: 6.5 }).time, judge({ ...good, h: 6.5 }).sora], ["night", "night"]);
  assert.deepEqual([judge({ ...good, h: 17.5 }).time, judge({ ...good, h: 17.5 }).sora], ["evening", "evening"]);
  assert.equal(judge({ ...good, h: 17.5 }).matched, false);
});

test("성산: 계절만 틀리면 들판 색을 짚는다", () => {
  const v = judge({ ...good, s: S(195) });
  assert.equal(v.season, false);
  assert.equal(v.sora, "season");
});

test("성산: 구도의 끝값은 맞고 그 밖은 틀리다", () => {
  assert.equal(judge({ ...good, x: 0.4, d: 0.5, h: 7 }).matched, true);
  assert.equal(judge({ ...good, x: 0.2, d: 0.7, h: 7 }).matched, true);
  assert.equal(judge({ ...good, x: 0.42 }).composition, false);
  assert.equal(judge({ ...good, d: 0.48 }).composition, false);
});

test("성산: 계절은 9월 15일 → 11월 15일이다", () => {
  const dawn = (day) => (sunTimes(LAT, LON, day).rise + 550) / 60;
  for (const day of [257, 318]) {
    const v = judge({ ...good, s: S(day), h: dawn(day) });
    assert.deepEqual([day, v.season, v.matched], [day, true, true]);
  }
  for (const day of [256, 319]) assert.equal(judge({ ...good, s: S(day), h: dawn(day) }).season, false);
});

test("성산: 여럿이 틀리면 구도, 계절, 시각의 차례로 하나만 짚는다", () => {
  assert.equal(judge({ x: 0, d: 0.6, s: S(195), h: 12 }).sora, "ridgeRight");
  assert.equal(judge({ ...good, s: S(195), h: 12 }).sora, "season");
});

test("stagedSun: 해 계산이 없어도 아침, 낮, 밤, 저녁이 갈린다", () => {
  const dawn = stagedSun(6 + 40 / 60);
  assert.ok(dawn.alt > 0 && dawn.alt < 10, String(dawn.alt));
  assert.equal(dawn.az, 100);
  assert.ok(stagedSun(12).alt > 10);
  assert.ok(stagedSun(2).alt < 0);
  assert.equal(stagedSun(17.5).az, 260);
  assert.deepEqual(stagedSun(30), stagedSun(6));
  assert.equal(judge(good, (d) => stagedSun(d.h)).matched, true);
});

test("첨성대: 과제마다 성공하는 상태는 작업서의 표와 같다", () => {
  const ok = (task) => Object.keys(cheom.states).filter((k) => judgeDiscrete(cheom, task, ...k.split("-")).ok).sort();
  assert.deepEqual(ok(1), ["B-day", "B-dusk"]);
  assert.deepEqual(ok(2), ["B-night"]);
});

test("첨성대: 소라는 작업서의 반응표대로 말한다", () => {
  const table = [
    ["A", "day", 1, "topCut"], ["C", "day", 1, "towerHidden"], ["B", "day", 1, "ok1"],
    ["B", "dusk", 2, "noStars"], ["C", "night", 2, "starsNoTower"], ["B", "night", 2, "ok2"],
  ];
  for (const [spot, time, task, key] of table) {
    const v = judgeDiscrete(cheom, task, spot, time);
    assert.equal(v.sora, key, `${spot}-${time} 과제 ${task}`);
    assert.equal(v.line, cheom.sora[key]);
  }
});

test("첨성대: 필요한 것마다 충족 여부가 따로 나온다", () => {
  assert.deepEqual(judgeDiscrete(cheom, 2, "B", "dusk").needs,
    [{ tag: "towerFull", label: "탑", met: true }, { tag: "stars", label: "별", met: false }]);
  assert.deepEqual(judgeDiscrete(cheom, 2, "C", "night").needs.map((n) => n.met), [false, true]);
});

test("첨성대: 닿을 수 없는 조합과 없는 상태에서도 던지지 않는다", () => {
  const odd = judgeDiscrete(cheom, 1, "B", "night");
  assert.deepEqual([odd.ok, odd.sora, odd.line], [false, null, null]);
  const none = judgeDiscrete(cheom, 1, "D", "day");
  assert.equal(none.ok, false);
  assert.ok(none.needs.every((n) => n.met === false));
  assert.equal(judgeDiscrete(cheom, 9, "B", "day").ok, false);
});

test("성산: 틀린 것을 고칠 다이얼이 함께 나온다", () => {
  assert.equal(judge({ ...good, x: 0.1 }).dial, "x");
  assert.equal(judge({ ...good, d: 0.9 }).dial, "d");
  assert.equal(judge({ ...good, s: S(195) }).dial, "s");
  for (const h of [2, 12, 17.5]) assert.equal(judge({ ...good, h }).dial, "h");
  assert.equal(judge(good).dial, null);
});

test("성산: 다이얼마다 제 값이 맞았는지가 따로 나온다", () => {
  assert.deepEqual(judge(good).ok, { x: true, d: true, s: true, h: true });
  assert.deepEqual(judge({ ...good, x: 0.1 }).ok, { x: false, d: true, s: true, h: true });
  assert.deepEqual(judge({ ...good, d: 0.9, h: 12 }).ok, { x: true, d: false, s: true, h: false });
  assert.deepEqual(judge(seongsan.start).ok, { x: false, d: false, s: false, h: false });
  // 시각은 그 계절의 해로 본다. 한여름 06:40은 해가 이미 높다.
  assert.equal(judge({ ...good, s: S(195) }).ok.h, false);
});
