// 쓰는 법: node --test tests/water.test.mjs
// 걷는 틀(수채): 모으기, 수첩의 쪽에 놓기, 사진의 자리, 답장에 붙는 줄, 저장을 읽기, 장면의 누를 곳, 글이 네 나라 말에 빠짐없이 있는지 본다.
// 걸음의 차례와 돈의 셈은 tests/trip.test.mjs 가 본다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as page from "../docs/water/core/page.js";
import * as trip from "../docs/trip/core/trip.js";
import { TEXT, LANGS } from "../docs/water/text.js";
import { TEXT as BASE } from "../docs/trip/i18n.js";

const file = (path) => fs.readFileSync(new URL(`../docs/${path}`, import.meta.url), "utf8");
const exits = JSON.parse(file("trip/data/fares.json")).myeongdong.exits;
const scenes = JSON.parse(file("water/scenes.json"));
const main = file("water/main.js");

test("모으기: 그 쪽의 것만, 같은 것은 한 번만 받는다", () => {
  const pg = page.freshPage();
  assert.equal(page.collect(pg, "md", "egg"), true);
  assert.equal(page.collect(pg, "md", "egg"), false);
  assert.equal(page.collect(pg, "md", "ticket"), false);
  assert.equal(page.collect(pg, "nowhere", "egg"), false);
  assert.deepEqual(pg.found, ["egg"]);
});

test("쪽: 모은 것만 놓이고, 자리는 쪽 안으로 당겨지고, 사진을 놓아야 붙고, 붙인 뒤에는 못 옮긴다", () => {
  const pg = page.freshPage();
  assert.equal(page.place(pg, "photo", 0.5, 0.3), false);
  page.collect(pg, "md", "photo"); page.collect(pg, "md", "egg");
  assert.equal(page.place(pg, "egg", 1.4, -0.2), true);
  assert.deepEqual(pg.placed.egg, { x: 1, y: 0 });
  assert.equal(page.canPaste(pg), false);
  page.place(pg, "photo", 0.5, 0.3);
  assert.equal(page.canPaste(pg), true);
  assert.equal(page.canPaste(pg, true), false);
  assert.equal(page.unplace(pg, "egg", true), false);
  assert.equal(page.place(pg, "egg", 0.2, 0.2, true), false);
  assert.equal(page.unplace(pg, "egg"), true);
  assert.ok(!("egg" in pg.placed));
});

test("사진의 자리: 긴 그림의 왼쪽, 가운데, 오른쪽이 걸음의 셈의 자리 셋과 같은 이름이다", () => {
  assert.deepEqual([0, 0.2, 0.34, 0.5, 0.67, 1].map(page.spotOf), ["A", "A", "B", "B", "C", "C"]);
  assert.deepEqual([...new Set([0, 0.5, 1].map(page.spotOf))], trip.SPOTS);
  assert.equal(page.spotOf(0.5), trip.GRANDMA_SPOT);     // 서울역: 광장 한가운데
  assert.equal(page.spotOf(0), trip.MD_GRANDMA_SPOT);    // 명동: 거리 들머리
});

test("답장: 쪽에 놓은 것에 따라 줄이 붙는다", () => {
  const album = page.freshAlbum();
  for (const id of page.ITEMS.icn) page.collect(album.icn, "icn", id);
  assert.deepEqual(page.replyExtras("icn", album.icn), []);
  page.place(album.icn, "coin", 0.5, 0.5); page.place(album.icn, "word", 0.5, 0.5);
  assert.deepEqual(page.replyExtras("icn", album.icn), ["replyWordIcn", "replyCoin"]);
  page.collect(album.md, "md", "word"); page.place(album.md, "word", 0.5, 0.5);
  assert.deepEqual(page.replyExtras("md", album.md), ["replyWord"]);
});

test("저장을 읽기: 믿을 수 있는 것만 남기고, 깨진 것은 새 쪽이 된다", () => {
  const album = page.restore({
    icn: { found: ["ticket", "pizza", "photo"], placed: { photo: { x: 0.4, y: 2 }, egg: { x: 0.1, y: 0.1 }, ticket: { x: "a", y: 0 } }, shotAt: 7, tried: [3, {}, "down"] },
    md: "깨진 것",
  });
  assert.deepEqual(album.icn.found, ["ticket", "photo"]);
  assert.deepEqual(album.icn.placed, { photo: { x: 0.4, y: 1 } });
  assert.equal(album.icn.shotAt, 1);
  assert.deepEqual(album.icn.tried, [3, "down"]);
  assert.deepEqual(album.md, page.freshPage());
  assert.deepEqual(page.restore(null), page.freshAlbum());
});

test("장면: 누를 곳이 그림 안에 있고, 유이가 서는 자리가 있고, 그림 파일이 있다", () => {
  for (const [name, scene] of Object.entries(scenes)) {
    assert.ok(scene.wide > 1.5, name);
    assert.ok(scene.start >= 4 && scene.start <= 96, name);
    for (const art of [scene.art, scene.wrongArt].filter(Boolean)) assert.ok(fs.existsSync(new URL(`../docs/water/art/${art}.webp`, import.meta.url)), art);
    const ids = scene.spots.map((spot) => spot.id);
    assert.equal(new Set(ids).size, ids.length, name);
    for (const spot of scene.spots) {
      assert.ok(spot.x >= 0 && spot.y >= 0 && spot.x + spot.w <= 100 && spot.y + spot.h <= 100, `${name}.${spot.id}`);
    }
  }
});

test("장면: 역의 출구는 자료의 출구와 같고, 화면이 찾는 누를 곳이 장면에 있다", () => {
  const shown = scenes.station.spots.filter((spot) => spot.exit).map((spot) => spot.exit).sort();
  assert.deepEqual(shown, [...exits.choices].sort());
  const need = {
    arrivals: ["bus", "taxi", "train"], b1: ["store", "machine", "counter", "gateBlue", "gateOrange"], platform: ["door"],
    subway: ["store", "machine", "gate"], stairs: ["down", "up"], station: ["board"], street: ["tower", "cart"],
  };
  for (const [name, ids] of Object.entries(need)) for (const id of ids) assert.ok(scenes[name].spots.some((spot) => spot.id === id), `${name}.${id}`);
  // 화면의 코드가 부르는 장면이 모두 있다.
  for (const [, name] of main.matchAll(/showScene\("(\w+)", \{/g)) assert.ok(name in scenes, name);
  for (const [, name] of main.matchAll(/still\("(\w+)"/g)) assert.ok(name in scenes, name);
});

test("걸음: 걸음마다 화면이 있다", () => {
  const made = new Set([...main.matchAll(/^ {2}(\w+)\(/gm)].map(([, name]) => name));
  for (const [, name] of main.matchAll(/^SCREENS\.(\w+) = /gm)) made.add(name);
  for (const step of trip.STEPS) assert.ok(made.has(step), step);
});

test("글: 네 나라 말에 같은 열쇠가 있고, 화면이 쓰는 열쇠가 사전에 있다", () => {
  const keys = Object.keys(TEXT.ko).sort();
  for (const lang of LANGS) assert.deepEqual(Object.keys(TEXT[lang]).sort(), keys, lang);
  const known = (key) => key in TEXT.ko || key in BASE.ko;
  for (const [, key] of main.matchAll(/\bt\("(\w+)"/g)) assert.ok(known(key), key);
  for (const [, key] of main.matchAll(/\bsay\("(\w+)"/g)) assert.ok(known(key), key);
  for (const [, key] of main.matchAll(/\btalk\("(\w+)"/g)) assert.ok(known(key), key);
  for (const kind of Object.keys(page.ITEMS)) for (const id of page.ITEMS[kind]) assert.ok(known(`item${id[0].toUpperCase()}${id.slice(1)}`), id);
  for (const scene of Object.values(scenes)) for (const spot of scene.spots) if (spot.say) assert.ok(known(spot.say), spot.say);
  for (const kind of Object.keys(page.ITEMS)) {
    const pg = page.freshPage();
    for (const id of page.ITEMS[kind]) { page.collect(pg, kind, id); page.place(pg, id, 0.5, 0.5); }
    for (const key of page.replyExtras(kind, pg)) assert.ok(known(key), key);
  }
});
