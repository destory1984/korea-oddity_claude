// 2차: 원문, 두 번역(일본어와 중국어), 눈가림 읽기(되돌린 한국어, 짐작한 말하는 이)를 줄마다 나란히 찍는다.
// 쓰는 법: node translation-test/round2/compare.mjs
import { readFileSync } from "node:fs";

const dir = new URL(".", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));

const source = load("source.json");
const out = { A: load("out-A.json"), B: load("out-B.json") };
const read = { ja: load("read-ja.json"), zh: load("read-zh.json") };
const key = load("blind-key.json");   // "ja.x001" → "A.s01"

const WHO = { sora: "child", grandmother: "elder", memo: "note" };
const LIMIT = 25;
const len = (s) => [...s].length;

const back = {};   // "ja.A.s01" → 읽은 결과
for (const [k, src] of Object.entries(key)) {
  const [lang, x] = k.split(".");
  back[`${lang}.${src}`] = read[lang][x];
}

const hit = {}, total = {};
for (const { id, who, ko } of source) {
  console.log(`## ${id} (${who})  ${ko}`);
  for (const lang of ["ja", "zh"]) for (const m of ["A", "B"]) {
    const text = out[m][id][lang], r = back[`${lang}.${m}.${id}`];
    const ok = r.who === WHO[who];
    const tag = `${lang}.${m}`;
    total[tag] = (total[tag] ?? 0) + 1; hit[tag] = (hit[tag] ?? 0) + (ok ? 1 : 0);
    console.log(`${lang}${m}  ${text}${len(text) > LIMIT ? ` [${len(text)}자]` : ""}`);
    console.log(`  →  ${r.ko}  (${r.who}${ok ? "" : " ✗"})${r.odd ? `  어색: ${r.odd}` : ""}`);
  }
  console.log("");
}
console.log("말하는 이를 맞힌 줄:");
for (const tag of Object.keys(total)) console.log(`  ${tag}  ${hit[tag]} / ${total[tag]}`);
