// 쓰는 법: node --test tests/compare-ui.test.mjs
// 화면 쪽 코드 가운데 브라우저 없이 셈만 하는 것: 철의 섞임, 다이얼의 값 맞추기.
import test from "node:test";
import assert from "node:assert/strict";
import { seasonMix } from "../docs/compare/ui/scene.js";
import { settle } from "../docs/compare/ui/dial.js";

const sum = (mix) => Object.values(mix).reduce((a, b) => a + b, 0);

test("seasonMix: 철의 가운데 날에는 그 철만 보인다", () => {
  assert.deepEqual(seasonMix(14), { winter: 1, spring: 0, summer: 0, autumn: 0 });
  assert.deepEqual(seasonMix(104), { winter: 0, spring: 1, summer: 0, autumn: 0 });
  assert.deepEqual(seasonMix(195), { winter: 0, spring: 0, summer: 1, autumn: 0 });
  assert.deepEqual(seasonMix(287), { winter: 0, spring: 0, summer: 0, autumn: 1 });
});

test("seasonMix: 사이의 날은 이웃한 두 철이 섞이고 합은 늘 1이다", () => {
  for (let day = 0; day < 365; day++) {
    const mix = seasonMix(day);
    assert.ok(Math.abs(sum(mix) - 1) < 1e-9, `day ${day}`);
    assert.ok(Object.values(mix).filter((v) => v > 0).length <= 2, `day ${day}`);
  }
  const mid = seasonMix(241);   // 7월 15일과 10월 15일의 한가운데
  assert.ok(Math.abs(mid.summer - 0.5) < 0.01 && Math.abs(mid.autumn - 0.5) < 0.01);
});

test("seasonMix: 해가 바뀌는 곳에서 끊기지 않는다", () => {
  const dec31 = seasonMix(364), jan1 = seasonMix(0);
  assert.ok(Math.abs(dec31.winter - jan1.winter) < 0.02);
  assert.ok(dec31.autumn > 0 && jan1.autumn > 0);
});

const X = { min: -1, max: 1, step: 0.02, wrap: false, snaps: [] };
const S = { min: 0, max: 1, step: 5 / 365, wrap: true, snaps: [14.5 / 365, 104.5 / 365, 195.5 / 365, 287.5 / 365] };
const H = { min: 0, max: 24, step: 1 / 6, wrap: true, snaps: [] };

test("settle: 눈금에 맞추고 부동소수의 밀림을 지운다", () => {
  assert.equal(settle(0.3000000001, X), 0.3);
  assert.equal(settle(0.309, X), 0.3);
  assert.equal(settle(0.311, X), 0.32);
  assert.equal(settle(6.66, H), 6.6667);
});

test("settle: 감아 돌지 않는 다이얼은 끝에서 멈춘다", () => {
  assert.equal(settle(1.4, X), 1);
  assert.equal(settle(-3, X), -1);
});

test("settle: 감아 도는 다이얼은 끝을 넘어 이어진다", () => {
  assert.equal(settle(24.5, H), 0.5);
  assert.equal(settle(-0.5, H), 23.5);
  assert.equal(settle(24, H), 0);
  const s = settle(1.01, S);
  assert.ok(s >= 0 && s < 1, String(s));
});

test("settle: 걸림에서 한 눈금 안이면 그 값으로 끌려간다", () => {
  const oct = 287.5 / 365;
  assert.equal(settle(oct + 4 / 365, S), +oct.toFixed(4));
  assert.equal(settle(oct - 4 / 365, S), +oct.toFixed(4));
  assert.notEqual(settle(oct + 12 / 365, S), +oct.toFixed(4));
});
