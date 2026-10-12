// 쓰는 법: node --test tests/walk.test.mjs
// 걷기 시험판(명동역): 지도의 꼴, 길 찾기, 칸이 일으키는 일, 글이 네 나라 말에 빠짐없이 있는지 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as walk from "../docs/walk/core/walk.js";
import { TEXT, LANGS } from "../docs/walk/text.js";

const read = (path) => fs.readFileSync(new URL(`../docs/${path}`, import.meta.url), "utf8");
const maps = JSON.parse(read("walk/maps.json"));
const fares = JSON.parse(read("trip/data/fares.json"));
const { station, street } = maps;

test("지도: 둘 다 12칸 x 18칸이고, 모르는 글자가 없고, 가장자리가 막혀 있다", () => {
  for (const map of [station, street]) {
    assert.equal(map.rows.length, 18);
    for (const row of map.rows) {
      assert.equal(row.length, 12);
      for (const ch of row) assert.ok(ch in maps.legend, ch);
    }
    assert.ok(walk.walkable(map, ...map.start));
    for (let x = 0; x < 12; x += 1) assert.ok(!walk.walkable(map, x, 0) && !walk.walkable(map, x, 17));
    for (let y = 0; y < 18; y += 1) assert.ok(!walk.walkable(map, 0, y) && !walk.walkable(map, 11, y));
  }
});

test("지도: 역에는 자료에 적힌 출구가 모두 있고, 지도 밖은 벽이다", () => {
  const all = station.rows.join("");
  for (const n of fares.myeongdong.exits.choices) assert.ok(all.includes(String(n)), `${n}번 출구`);
  assert.equal(walk.tileAt(station, -1, 5), "#");
  assert.equal(walk.tileAt(station, 3, 99), "#");
});

test("길: 시작한 자리에서 세 출구에 모두 닿고, 개찰구를 지나야만 나간다", () => {
  for (const n of fares.myeongdong.exits.choices) {
    const [cx, cy] = walk.centreOf(station, String(n)).map(Math.floor);
    const way = walk.path(station, station.start, [cx, cy]);
    assert.deepEqual(way.at(-1), [cx, cy], `${n}번`);
    assert.ok(way.some(([x, y]) => walk.tileAt(station, x, y) === "g"), `${n}번으로 가는 길이 개찰구를 지난다`);
    for (const [x, y] of way) assert.ok(walk.walkable(station, x, y));
    for (let i = 1; i < way.length; i += 1) assert.equal(Math.abs(way[i][0] - way[i - 1][0]) + Math.abs(way[i][1] - way[i - 1][1]), 1);
  }
});

test("길: 막힌 칸을 누르면 닿을 수 있는 가장 가까운 칸으로 가고, 제자리를 누르면 걷지 않는다", () => {
  const way = walk.path(station, station.start, [1, 4]);   // 가게의 칸
  assert.ok(way.length > 0);
  const [x, y] = way.at(-1);
  assert.ok(walk.walkable(station, x, y));
  assert.ok(Math.hypot(x - 1, y - 4) <= 1);
  assert.deepEqual(walk.path(station, station.start, station.start), []);
});

test("길: 다른 출구의 계단을 지나가는 길로 삼지 않는다", () => {
  // 3번 출구 앞에서 6번 출구로 갈 때 왼쪽 통로를 따라 올라가면 8번 출구의 계단 곁을 지난다.
  const way = walk.path(station, [1, 14], [9, 2]);
  assert.deepEqual(way.at(-1), [9, 2]);
  for (const [x, y] of way) assert.ok(!"38".includes(walk.tileAt(station, x, y)), `${x},${y}`);
  for (const [x, y] of walk.path(station, station.start, [5, 3])) assert.ok(!walk.EXITS.includes(walk.tileAt(station, x, y)));
});

test("칸: 출구 계단은 번호를, 개찰구는 gate 를, 계란빵 수레 곁은 goal 을 일으킨다", () => {
  assert.deepEqual(walk.trigger(station, 9, 2), { exit: 6 });
  assert.deepEqual(walk.trigger(station, 1, 15), { exit: 3 });
  assert.deepEqual(walk.trigger(station, 2, 1), { exit: 8 });
  assert.deepEqual(walk.trigger(station, 5, 6), { gate: true });
  assert.equal(walk.trigger(station, 5, 3), null);
  assert.deepEqual(walk.trigger(street, 4, 6), { goal: true });
  assert.deepEqual(walk.trigger(street, 3, 4), { goal: true });
  assert.equal(walk.trigger(street, ...street.start), null);
  const way = walk.path(street, street.start, [4, 6]);
  assert.deepEqual(way.at(-1), [4, 6]);
});

test("방향: 가는 쪽을 본다", () => {
  assert.equal(walk.facing([3, 3], [3, 2]), "up");
  assert.equal(walk.facing([3, 3], [3, 4]), "down");
  assert.equal(walk.facing([3, 3], [4, 3]), "right");
  assert.equal(walk.facing([3, 3], [2, 3]), "left");
});

test("글: 네 나라 말에 같은 열쇠와 같은 채울 자리가 있고, 화면이 쓰는 열쇠가 모두 있다", () => {
  const slots = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  assert.deepEqual(LANGS, ["ko", "en", "ja", "zh"]);
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(TEXT[lang]).sort(), Object.keys(TEXT.ko).sort(), lang);
    for (const key of Object.keys(TEXT.ko)) assert.deepEqual(slots(TEXT[lang][key]), slots(TEXT.ko[key]), `${lang}.${key}`);
  }
  const source = read("walk/main.js");
  for (const [, key] of source.matchAll(/(?:\bt|say)\("(\w+)"/g)) assert.ok(key in TEXT.ko, key);
  for (const key of ["exitWrongG", "exitWrong", "start"]) assert.ok(key in TEXT.ko, key);
});
