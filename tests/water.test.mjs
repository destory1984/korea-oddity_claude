// 쓰는 법: node --test tests/water.test.mjs
// 수채 견본(명동): 출구 고르기, 모으기, 수첩의 쪽에 놓기, 답장, 글이 네 나라 말에 빠짐없이 있는지 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as page from "../docs/water/core/page.js";
import { TEXT, LANGS } from "../docs/water/text.js";

const read = (path) => JSON.parse(fs.readFileSync(new URL(`../docs/${path}`, import.meta.url), "utf8"));
const exits = read("trip/data/fares.json").myeongdong.exits;
const scenes = read("water/scenes.json");

test("출구: 맞는 출구로 나가면 거리로 가고 출구 딱지를 얻는다", () => {
  const s = page.fresh();
  assert.equal(page.tapExit(s, exits.right, exits), "right");
  assert.equal(s.scene, "street");
  assert.ok(page.has(s, "exit"));
  assert.equal(s.misses, 0);
});

test("출구: 틀린 출구는 한 번만 세고, 할머니의 출구는 따로 알린다", () => {
  const s = page.fresh();
  const other = exits.choices.find((n) => n !== exits.right && n !== exits.grandma);
  assert.equal(page.tapExit(s, exits.grandma, exits), "grandma");
  assert.equal(page.tapExit(s, exits.grandma, exits), "tried");
  assert.equal(page.tapExit(s, other, exits), "wrong");
  assert.equal(s.misses, 2);
  assert.equal(s.scene, "station");
});

test("모으기: 같은 것은 한 번만, 모르는 것은 받지 않는다", () => {
  const s = page.fresh();
  assert.equal(page.collect(s, "egg"), true);
  assert.equal(page.collect(s, "egg"), false);
  assert.equal(page.collect(s, "pizza"), false);
  assert.deepEqual(s.found, ["egg"]);
});

test("쪽: 모은 것만 놓이고, 자리는 쪽 안으로 당겨지고, 사진을 놓아야 붙는다", () => {
  const s = page.fresh();
  assert.equal(page.place(s, "photo", 0.5, 0.3), false);
  page.collect(s, "photo"); page.collect(s, "egg");
  assert.equal(page.place(s, "egg", 1.4, -0.2), true);
  assert.deepEqual(s.placed.egg, { x: 1, y: 0 });
  assert.equal(page.canPaste(s), false);
  page.place(s, "photo", 0.5, 0.3);
  assert.equal(page.paste(s), true);
  assert.equal(page.unplace(s, "egg"), false);
  assert.equal(page.place(s, "egg", 0.2, 0.2), false);
});

test("답장: 헤맸는지와 쪽에 놓은 것에 따라 줄이 달라진다", () => {
  const s = page.fresh();
  for (const id of page.ITEMS) page.collect(s, id);
  page.place(s, "photo", 0.5, 0.3);
  assert.deepEqual(page.replyKeys(s), ["replyExit", "replyRound"]);
  page.tapExit(s, exits.grandma, exits);
  page.place(s, "egg", 0.2, 0.8); page.place(s, "clue", 0.7, 0.8);
  assert.deepEqual(page.replyKeys(s), ["replyLost", "replyRound", "replyClue", "replyEgg"]);
});

test("장면: 누를 곳이 그림 안에 있고, 역의 출구는 자료의 출구와 같다", () => {
  for (const scene of Object.values(scenes)) {
    for (const spot of scene.spots) {
      assert.ok(spot.x >= 0 && spot.y >= 0 && spot.x + spot.w <= 100 && spot.y + spot.h <= 100, spot.id);
    }
  }
  const shown = scenes.station.spots.filter((spot) => spot.exit).map((spot) => spot.exit).sort();
  assert.deepEqual(shown, [...exits.choices].sort());
  for (const id of ["word", "egg", "clue"]) {
    assert.ok(Object.values(scenes).some((scene) => scene.spots.some((spot) => spot.gives === id)), id);
  }
});

test("글: 네 나라 말에 같은 열쇠가 있고, 답장과 모으는 것의 글이 있다", () => {
  const keys = Object.keys(TEXT.ko).sort();
  for (const lang of LANGS) assert.deepEqual(Object.keys(TEXT[lang]).sort(), keys, lang);
  const s = page.fresh();
  s.misses = 1;
  for (const id of page.ITEMS) { page.collect(s, id); page.place(s, id, 0.5, 0.5); }
  for (const key of [...page.replyKeys(s), "replyExit"]) assert.ok(key in TEXT.ko, key);
  for (const id of page.ITEMS) assert.ok(`item${id[0].toUpperCase()}${id.slice(1)}` in TEXT.ko, id);
});
