// 원문, 일본어 두 벌, 역번역 두 벌을 줄마다 나란히 찍는다.
// 쓰는 법: node translation-test/compare.mjs
import { readFileSync } from "node:fs";

const dir = new URL(".", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));

const source = load("source.json");
const jaA = load("ja-A.json");
const jaB = load("ja-B.json");
const backA = load("back-A.json");
const backB = load("back-B.json");

const LIMIT = 25; // 메모와 소라 한마디의 글자 수 한도
const len = (s) => [...(s ?? "")].length;
const limited = (id) => id.endsWith(".memo") || id.endsWith(".sora");

for (const { id, ko } of source) {
  const over = (s) => (limited(id) && len(s) > LIMIT ? ` [${len(s)}자]` : "");
  console.log(`## ${id}`);
  console.log(`원문   ${ko}${over(ko)}`);
  console.log(`일A    ${jaA[id]}${over(jaA[id])}`);
  console.log(`역A    ${backA[id]}`);
  console.log(`일B    ${jaB[id]}${over(jaB[id])}`);
  console.log(`역B    ${backB[id]}`);
  console.log("");
}

const ids = new Set(source.map((s) => s.id));
for (const [name, obj] of Object.entries({ jaA, jaB, backA, backB })) {
  const extra = Object.keys(obj).filter((k) => !ids.has(k));
  const missing = [...ids].filter((k) => !(k in obj));
  if (extra.length || missing.length) console.log(`${name}: 남는 id ${extra}, 빠진 id ${missing}`);
}
