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

// ── 셋째 판: 성수동 빵집(A안), 홍대 떡볶이 골목(B안) ──────────────────────
const seongsu = read("seongsu");
const hongdae = read("hongdae");

for (const place of [seongsu, hongdae]) {
  test(`${place.id}: 글 분량이 첫 판과 같고, 맞춰 찍을 사진은 손녀가 요즘 보낸 것이다`, () => {
    const lines = [...Object.values(place.sora), ...(place.tasks ?? []).map((t) => t.memo), ...place.story.back, place.story.sora, place.nudge];
    if (place.memoShort) lines.push(place.memoShort);
    for (const line of lines) assert.ok([...line].length <= 25, `${[...line].length}자: ${line}`);
    assert.equal(place.reply.length, 3);
    assert.ok(place.story.back.length >= 2 && place.story.back.length <= 3);
    assert.equal(place.photo.look, "recent");
    assert.ok(place.photo.name && place.photo.by);
  });
}

const scene = (name) => fs.existsSync(new URL(`../docs/assets/scenes/${name}.webp`, import.meta.url));

test("성수: 링은 계절과 시각 둘이고, 처음 값은 계절이 틀린 자리다. 계절의 범위는 해를 넘긴다", () => {
  assert.deepEqual(seongsu.rings, ["s", "h"]);
  const [from, to] = seongsu.seasonDays;
  assert.ok(from > to);
  const day = Math.floor(seongsu.start.s * 365);
  assert.ok(day < from && day > to);
  assert.ok(seongsu.target.day >= from || seongsu.target.day <= to);
});

test("성수: 계절 넉 장과 답장의 옛 사진이 있고, 창의 불빛 자리는 틀 안에 있다", () => {
  for (const season of ["spring", "summer", "autumn", "winter"]) assert.ok(scene(`${seongsu.image}-${season}`), season);
  assert.ok(scene(seongsu.replyImage));
  assert.ok(seongsu.replyCaption);
  assert.ok(seongsu.glows.length > 0);
  for (const [x, y, w, h] of seongsu.glows) assert.ok(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1);
});

test("홍대: 상태 아홉, 소라의 말 여섯, 도움의 테두리와 선, 지점마다의 그림과 간판 자리가 빠짐없이 있다", () => {
  const keys = hongdae.spots.flatMap((s) => hongdae.times.map((t) => `${s}-${t}`));
  assert.deepEqual(Object.keys(hongdae.states).sort(), keys.sort());
  assert.equal(Object.keys(hongdae.sora).length, 6);
  for (const rule of hongdae.soraRules) assert.ok(rule.say in hongdae.sora, rule.say);
  for (const task of hongdae.tasks) for (const tag of task.need) { assert.ok(hongdae.labels[tag], tag); assert.ok(hongdae.helpBoxes[tag], tag); }
  for (const key of Object.keys(hongdae.sora)) if (!key.startsWith("ok")) assert.ok(hongdae.diagrams[key], key);
  for (const spot of hongdae.spots) {
    assert.ok(scene(hongdae.images[spot]), spot);
    const [x, y, w, h] = hongdae.neon[spot];
    assert.ok(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1, spot);
  }
  assert.equal(hongdae.reply2.length, 3);
});

test("홍대: 닿을 수 있는 상태 가운데 과제의 답이 정해져 있고, 틀린 상태마다 소라가 할 말이 있다", async () => {
  const { judgeDiscrete } = await import("../docs/compare/core/judge.js");
  for (const task of hongdae.tasks) {
    // 때가 잠긴 과제에서는 처음의 때에서만 본다.
    const reach = Object.keys(hongdae.states).filter((key) => !task.timesLocked || key.endsWith(task.start.split("-")[1]));
    const right = reach.filter((key) => judgeDiscrete(hongdae, task.id, ...key.split("-")).ok);
    assert.ok(right.includes(task.answer));
    // 과제 2는 가게 코앞의 밤도 맞다. 간판의 불과 가게가 다 보인다.
    assert.deepEqual(right, task.id === 1 ? ["B-dusk"] : ["A-night", "B-night"]);
    for (const key of reach) assert.ok(judgeDiscrete(hongdae, task.id, ...key.split("-")).line, `${task.id} ${key}`);
  }
});

for (const place of [seongsu, hongdae]) {
  test(`${place.id}: 가는 길과 거기서 한 일이 빠짐없이 있고 글은 25자 안이다`, () => {
    const { travel, there } = place;
    assert.equal(travel.stations.length, 3);
    assert.match(travel.color, /^#[0-9a-f]{6}$/);
    assert.ok(travel.line && travel.exit);
    for (const line of [travel.sora, there.sora]) assert.ok([...line].length <= 25, line);
    assert.ok(there.name);
    assert.ok(scene(travel.image), travel.image);
    assert.ok(scene(there.image), there.image);
  });
}
