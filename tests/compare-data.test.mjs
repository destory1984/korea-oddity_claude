// 쓰는 법: node --test tests/compare-data.test.mjs
// 비교 시제품의 장소 자료 둘이 작업서의 글 분량과 상태표를 지키는지 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (id) => JSON.parse(fs.readFileSync(new URL(`../docs/compare/places/${id}.json`, import.meta.url), "utf8"));
const seongsan = read("seongsan");
const cheom = read("cheomseongdae");

for (const place of [seongsan, cheom]) {
  test(`${place.id}: 메모와 소라의 말은 25자 안이다`, () => {
    const lines = [...Object.values(place.sora), ...(place.tasks ?? []).map((t) => t.memo)];
    if (place.kind === "continuous") lines.push(place.memoShort);
    for (const line of lines) assert.ok([...line].length <= 25, `${[...line].length}자: ${line}`);
  });

  test(`${place.id}: 답장은 세 줄이다`, () => {
    assert.equal(place.reply.length, 3);
  });
}

test("첨성대: 상태는 지점 셋 × 때 셋의 아홉이다", () => {
  const keys = cheom.spots.flatMap((s) => cheom.times.map((t) => `${s}-${t}`));
  assert.deepEqual(Object.keys(cheom.states).sort(), keys.sort());
});

test("첨성대: 소라의 차례가 가리키는 말이 모두 있다", () => {
  for (const rule of cheom.soraRules) assert.ok(rule.say in cheom.sora, rule.say);
});

test("첨성대: 필요한 것마다 화면에 보일 이름이 있다", () => {
  for (const task of cheom.tasks) for (const tag of task.need) assert.ok(cheom.labels[tag], tag);
});

test("성산: 목표값이 다이얼의 범위 안에 있고 처음 값은 구도가 틀린 자리다", () => {
  const { target, tolerance, start, dials } = seongsan;
  for (const k of ["x", "d"]) assert.ok(target[k] >= dials[k][0] && target[k] <= dials[k][1]);
  assert.ok(Math.abs(start.x - target.x) > tolerance.x);
  assert.ok(Math.abs(start.d - target.d) > tolerance.d);
});

test("소라의 말: 첨성대는 여섯 줄, 성산은 구도를 네 갈래로 짚어 아홉 줄이다", () => {
  assert.equal(Object.keys(cheom.sora).length, 6);
  assert.deepEqual(Object.keys(seongsan.sora).sort(),
    ["evening", "match", "night", "noon", "ridgeLeft", "ridgeRight", "season", "tooFar", "tooNear"]);
});

for (const place of [seongsan, cheom]) {
  test(`${place.id}: 들어갈 때의 장면이 있다(사진 뒷면의 글과 소라의 한마디)`, () => {
    assert.ok(place.story.back.length >= 2 && place.story.back.length <= 3);
    assert.ok([...place.story.sora].length <= 25, place.story.sora);
    for (const line of place.story.back) assert.ok([...line].length <= 25, line);
  });
}

test("성산: 그림자는 포개지기 전에 글로 미리 말하지 않는다", () => {
  const before = [seongsan.memo, seongsan.memoShort, ...seongsan.story.back, seongsan.story.sora,
    ...Object.entries(seongsan.sora).filter(([key]) => key !== "match").map(([, line]) => line)];
  for (const line of before) assert.ok(!line.includes("그림자"), line);
  assert.ok(seongsan.sora.match.includes("그림자"));
});

test("첨성대: 과제 2에도 답장 세 줄이 있다", () => {
  assert.equal(cheom.reply2.length, 3);
});

// ── 둘째 판: 부석사(A안), 소백산 천문대(B안) ─────────────────────────────
const buseoksa = read("buseoksa");
const sobaek = read("sobaeksan");

for (const place of [buseoksa, sobaek]) {
  test(`${place.id}: 글 분량이 첫 판과 같다`, () => {
    const lines = [...Object.values(place.sora), ...(place.tasks ?? []).map((t) => t.memo), ...place.story.back, place.story.sora, place.nudge];
    if (place.memoShort) lines.push(place.memoShort);
    for (const line of lines) assert.ok([...line].length <= 25, `${[...line].length}자: ${line}`);
    assert.equal(place.reply.length, 3);
  });
}

test("부석사: 링은 계절과 시각 둘이고, 처음 값은 계절과 시각이 모두 틀린 자리다", () => {
  assert.deepEqual(buseoksa.rings, ["s", "h"]);
  assert.deepEqual(Object.keys(buseoksa.start).sort(), ["h", "s"]);
  const day = Math.floor(buseoksa.start.s * 365);
  assert.ok(day < buseoksa.seasonDays[0] || day > buseoksa.seasonDays[1]);
});

test("소백산: 상태 아홉, 소라의 말 여섯, 도움의 테두리와 선이 빠짐없이 있다", () => {
  const keys = sobaek.spots.flatMap((s) => sobaek.times.map((t) => `${s}-${t}`));
  assert.deepEqual(Object.keys(sobaek.states).sort(), keys.sort());
  assert.equal(Object.keys(sobaek.sora).length, 6);
  for (const rule of sobaek.soraRules) assert.ok(rule.say in sobaek.sora, rule.say);
  for (const task of sobaek.tasks) for (const tag of task.need) { assert.ok(sobaek.labels[tag], tag); assert.ok(sobaek.helpBoxes[tag], tag); }
  for (const key of Object.keys(sobaek.sora)) if (!key.startsWith("ok")) assert.ok(sobaek.diagrams[key], key);
  for (const spot of sobaek.spots) assert.ok(sobaek.images[spot], spot);
  assert.equal(sobaek.reply2.length, 3);
});

test("첨성대: 도움의 테두리와 선이 장소 자료에 있다", () => {
  for (const task of cheom.tasks) for (const tag of task.need) assert.ok(cheom.helpBoxes[tag], tag);
  for (const key of Object.keys(cheom.sora)) if (!key.startsWith("ok")) assert.ok(cheom.diagrams[key], key);
});
