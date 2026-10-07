// 쓰는 법: node --test tests/sun.test.mjs
// 해 뜨고 지는 시각을 알려진 값과 견준다. 기준 값은 한국천문연구원의 생활천문관에서 보던 값을 기억으로 적은 것이라,
// 여유를 4분 두었다. 원 자료로 다시 확인해야 한다.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { sunTimes, sunAt, clockText } = createRequire(import.meta.url)("../docs/assets/sun.js");

const day = (month, date) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + date - 1;
const kst = (utc) => utc + 540;
const near = (got, hour, minute, slack = 4) =>
  assert.ok(Math.abs(got - (hour * 60 + minute)) <= slack, `${clockText(got, 0)} 가 ${hour}:${String(minute).padStart(2, "0")} 에서 ${slack}분 넘게 벗어났다`);

const SEOUL = [37.5665, 126.978];

test("서울의 하지: 5시 11분에 뜨고 19시 57분에 진다", () => {
  const t = sunTimes(...SEOUL, day(6, 21));
  near(kst(t.rise), 5, 11); near(kst(t.set), 19, 57);
});

test("서울의 동지: 7시 43분에 뜨고 17시 17분에 진다", () => {
  const t = sunTimes(...SEOUL, day(12, 22));
  near(kst(t.rise), 7, 43); near(kst(t.set), 17, 17);
});

test("춘분과 추분 무렵에는 낮이 12시간 남짓이다", () => {
  for (const d of [day(3, 20), day(9, 23)]) {
    const t = sunTimes(...SEOUL, d);
    assert.ok(Math.abs(t.set - t.rise - 728) < 8, `낮이 ${Math.round(t.set - t.rise)}분이다`);
  }
});

test("정동진의 1월 1일 해돋이는 7시 39분 무렵이다", () => {
  near(kst(sunTimes(37.6911, 129.0343, day(1, 1)).rise), 7, 39);
});

test("해는 남중할 때 남쪽에 있고, 높이는 90 - 위도 + 적위다", () => {
  const d = day(6, 21), t = sunTimes(...SEOUL, d), p = sunAt(...SEOUL, d, t.noon);
  assert.ok(Math.abs(p.az - 180) < 1, `방위 ${p.az}`);
  assert.ok(Math.abs(p.alt - (90 - 37.5665 + 23.44)) < 0.2, `높이 ${p.alt}`);
});

test("질 때 해의 높이는 0도 가까이이고, 여름에는 북서쪽, 겨울에는 남서쪽으로 진다", () => {
  const summer = sunAt(...SEOUL, day(6, 21), sunTimes(...SEOUL, day(6, 21)).set);
  const winter = sunAt(...SEOUL, day(12, 22), sunTimes(...SEOUL, day(12, 22)).set);
  assert.ok(Math.abs(summer.alt + 0.833) < 0.1 && Math.abs(winter.alt + 0.833) < 0.1);
  assert.ok(summer.az > 295 && summer.az < 305, `여름 ${summer.az}`);
  assert.ok(winter.az > 237 && winter.az < 245, `겨울 ${winter.az}`);
});

test("시각을 글로 적는다", () => {
  assert.equal(clockText(8 * 60 + 28), "17:28");
  assert.equal(clockText(20 * 60), "5:00");
});
