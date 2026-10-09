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

  test(`${place.id}: 답장은 세 줄이고 소라의 말은 여섯 줄이다`, () => {
    assert.equal(place.reply.length, 3);
    assert.equal(Object.keys(place.sora).length, 6);
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
