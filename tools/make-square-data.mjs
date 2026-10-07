// 시험판이 읽을 칸 자료를 만든다: data/squares.json(기획서의 100칸) + data/places.json(위키백과와 위키데이터에서 긁은
// 좌표와 이름) + data/places-manual.json(손으로 적은 어림 좌표) → docs/assets/squares.js
// 쓰는 법: node tools/make-square-data.mjs
// 시험판은 파일로도 열려야 해서 JSON 이 아니라 보통 스크립트(전역 SQUARES)로 쓴다.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const load = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const squares = load("data/squares.json"), places = load("data/places.json"), manual = load("data/places-manual.json");
const byId = Object.fromEntries(places.map((p) => [p.id, p]));
// 위키백과 제목 뒤의 갈래 괄호를 뗀다. 牛島 (済州市) → 牛島
const clean = (s) => (s ? s.replace(/\s*[（(][^）)]*[）)]\s*$/, "") : null);
const round = (v) => Math.round(v * 10000) / 10000;

const out = squares.map((s) => {
  const p = byId[s.id] ?? {};
  const hand = manual.coords[s.id];
  const [lat, lon] = hand ?? [p.lat, p.lon];
  if (lat == null) throw new Error(`${s.no}번 ${s.name}: 좌표가 없다.`);
  if (lat < 33 || lat > 38.7 || lon < 124.5 || lon > 131) throw new Error(`${s.no}번 ${s.name}: 좌표가 한국 밖이다(${lat}, ${lon}).`);
  return {
    no: s.no, id: s.id, ko: s.name, region: s.region, where: s.where, what: s.what, best: s.best, grandma: s.grandma,
    lat: round(lat), lon: round(lon),
    // rough: 좌표가 어림이다(손으로 적었거나, 그 자리가 아니라 시와 군의 좌표다)
    rough: Boolean(hand) || manual.areaOnly.includes(s.id),
    ja: clean(p.ja), jaKana: p.jaKana ?? null, zh: clean(p.zhHans),
  };
});

writeFileSync(new URL("docs/assets/squares.js", root),
  "// 자리 칸 100곳. tools/make-square-data.mjs 가 만든 파일이다. 손으로 고치지 않는다.\n" +
  "// 좌표와 일본어, 중국어 이름은 위키백과와 위키데이터에서 긁은 바탕이다. 공식 자료와 맞추지 않았다.\n" +
  "const SQUARES = " + JSON.stringify(out, null, 1) + ";\n");
const n = (f) => out.filter(f).length;
console.log(`칸 ${out.length}개. 일본어 이름 ${n((s) => s.ja)}개, 중국어 이름 ${n((s) => s.zh)}개, 어림 좌표 ${n((s) => s.rough)}개.`);
