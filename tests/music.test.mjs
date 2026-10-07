// 쓰는 법: node --test tests/music.test.mjs
// 배경 음악 스무 곡이 제 꼴을 갖추었는지, 1권의 열한 곡과 겹치지 않는지 본다. 듣기에 좋은지는 귀로 확인해야 한다.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { TUNES, BAR_S, BARS_PER_TUNE, hz, chord, scale, barPlan, tuneOrder, barInOrder, tuneFor } =
  createRequire(import.meta.url)("../docs/assets/music.js");

// 1권(우주 한량)의 열한 곡. 이름, 음계, 화음의 낮은 음 넷.
const VOLUME_1 = [
  ["box", "A4 C5 D5 E5 G5 A5 C6 D6", "A2 F2 C3 G2"],
  ["dawn", "C5 D5 E5 G5 A5 C6 D6 E6", "C3 A2 F2 G2"],
  ["sea", "D5 F5 G5 A5 C6 D6 F6 G6", "D2 G2 C3 A2"],
  ["lullaby", "C5 D5 F5 G5 A5 C6 D6 F6", "F2 D2 Bb2 C3"],
  ["stars", "E5 G5 A5 B5 D6 E6 G6 A6", "E2 C3 G2 D2"],
  ["night", "D4 F4 G4 A4 C5 D5 F5 G5", "D2 A2 Bb2 F2"],
  ["drift", "G4 A4 B4 D5 E5 G5 A5 B5", "G2 E2 C3 D2"],
  ["rain", "D5 E5 F#5 A5 B5 D6 E6 F#6", "B2 G2 D2 A2"],
  ["gayageum", "D4 E4 G4 A4 C5 D5 E5 G5", "G2 C3 G2 D2"],
  ["aurora", "A4 B4 D5 E5 F#5 A5 B5 D6", "D2 B2 G2 A2"],
  ["carousel", "Bb4 C5 D5 F5 G5 Bb5 C6 D6", "Bb2 G2 Eb2 F2"],
];
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
// 음의 이름(0 → 11). 옥타브는 버린다.
const pitchClass = (freq) => ((Math.round(12 * Math.log2(freq / 440)) % 12) + 12) % 12;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

test("곡이 스물이고 이름이 겹치지 않는다", () => {
  assert.equal(TUNES.length, 20);
  assert.equal(new Set(TUNES.map((t) => t.id)).size, 20);
  assert.equal(new Set(TUNES.map((t) => t.name)).size, 20);
});

test("1권의 곡이 남아 있지 않다: 이름, 음계, 화음의 차례가 모두 다르다", () => {
  for (const tune of TUNES) {
    for (const [id, melody, basses] of VOLUME_1) {
      assert.notEqual(tune.id, id);
      assert.ok(!same(tune.melody, scale(melody)), `${tune.id} 의 음계가 1권의 ${id} 와 같다`);
      assert.ok(!same(tune.chords.map((c) => c.bass), basses.split(" ").map(hz)), `${tune.id} 의 화음 차례가 1권의 ${id} 와 같다`);
    }
  }
});

test("스무 곡끼리도 음계와 화음의 차례가 겹치지 않는다", () => {
  const key = (list) => list.join(",");
  assert.equal(new Set(TUNES.map((t) => key(t.melody))).size, 20);
  assert.equal(new Set(TUNES.map((t) => key(t.chords.flatMap((c) => [c.bass, ...c.pad])))).size, 20);
});

test("곡마다 화음 넷(낮은 음 하나와 석 음), 음계 여덟 음, 마디 안의 박을 갖추었다", () => {
  for (const tune of TUNES) {
    assert.equal(tune.chords.length, 4, tune.id);
    for (const c of tune.chords) {
      assert.equal(c.pad.length, 3, tune.id);
      assert.ok(c.bass >= 60 && c.bass <= 160, `${tune.id} 의 낮은 음 ${c.bass}Hz`);
      for (const f of c.pad) assert.ok(f >= 150 && f <= 450, `${tune.id} 의 화음 ${f}Hz`);
    }
    assert.equal(tune.melody.length, 8, tune.id);
    assert.ok(same(tune.melody, [...tune.melody].sort((a, b) => a - b)), `${tune.id} 의 음계가 낮은 음부터가 아니다`);
    assert.equal(new Set(tune.melody.map(pitchClass)).size <= 5, true, `${tune.id} 의 음계가 다섯 음을 넘는다`);
    assert.ok(tune.melody[0] >= 180 && tune.melody[7] <= 2300, `${tune.id} 의 음계가 너무 낮거나 높다`);
    assert.ok(tune.slots.length >= 2, tune.id);
    assert.ok(same(tune.slots, [...tune.slots].sort((a, b) => a - b)), tune.id);
    assert.ok(tune.slots[0] >= 0 && tune.slots.at(-1) < BAR_S, tune.id);
    assert.ok(tune.busy > 0 && tune.busy <= 1, tune.id);
    assert.ok(tune.bell.length >= 0.5 && tune.bell.length <= 3.5, tune.id);
    assert.ok(["sine", "triangle", undefined].includes(tune.bell.wave), tune.id);
    for (const i of tune.motif ?? []) assert.ok(Number.isInteger(i) && i >= 0 && i < 8, `${tune.id} 의 가락이 음계 밖을 가리킨다`);
  }
});

test("곡마다 화음과 음계가 한 조 안에 있다(조 밖의 음이 없다)", () => {
  for (const tune of TUNES) {
    const used = new Set([...tune.melody, ...tune.chords.flatMap((c) => [c.bass, ...c.pad])].map(pitchClass));
    const fits = Array.from({ length: 12 }, (_, root) => root).some((root) => [...used].every((pc) => MAJOR.includes((pc - root + 12) % 12)));
    assert.ok(fits, `${tune.id} 에 조 밖의 음이 있다`);
  }
});

test("곡마다 열여섯 마디에 음이 울린다. 한 마디에 열 음을 넘지 않는다", () => {
  TUNES.forEach((tune, n) => {
    let total = 0;
    for (let i = 0; i < BARS_PER_TUNE; i++) {
      const plan = barPlan(n * BARS_PER_TUNE + i, "near");
      assert.equal(plan.pad.length, 3);
      assert.ok(plan.notes.length <= 10, `${tune.id} 의 ${i}째 마디에 음이 ${plan.notes.length}개`);
      for (const note of plan.notes) {
        assert.ok(tune.melody.includes(note.freq), tune.id);
        assert.ok(note.at >= 0 && note.at <= BAR_S - 0.6, tune.id);
      }
      total += plan.notes.length;
    }
    assert.ok(total >= 16 && total <= 110, `${tune.id} 의 열여섯 마디에 음이 ${total}개`);
  });
});

test("스무 곡이 한 바퀴에 한 번씩 돈다. 첫 곡을 고를 수 있다", () => {
  const order = tuneOrder(() => 0.5);
  assert.equal(new Set(order).size, 20);
  const heard = new Set();
  for (let turn = 0; turn < 20; turn++) heard.add(tuneFor(barInOrder(turn * BARS_PER_TUNE, order)).id);
  assert.equal(heard.size, 20);
  const picked = tuneOrder(() => 0.5, "sansa");
  assert.equal(TUNES[picked[0]].id, "sansa");
  assert.equal(new Set(picked).size, 20);
  assert.equal(new Set(tuneOrder(() => 0.5, "없는 곡")).size, 20);
});

test("음 이름을 Hz로 바꾼다", () => {
  assert.equal(hz("A4"), 440);
  assert.equal(hz("Bb2"), 116.54);
  assert.equal(chord("A2", "A3", "C4", "E4").pad.length, 3);
});
