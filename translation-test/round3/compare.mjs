// 3차: 원문(이름을 채운 것), 두 번역, 되돌려 읽은 한국어를 줄마다 나란히 찍는다.
// 쓰는 법: node translation-test/round3/compare.mjs
import { readFileSync } from "node:fs";

const dir = new URL(".", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));
const source = load("source.json"), key = load("blind-key.json");
const filled = { A: load("filled-A.json"), B: load("filled-B.json") };
const read = { ja: load("read-ja.json"), zh: load("read-zh.json") };

for (const { id, ko } of source) {
  console.log(`## ${id}  ${ko.replace(/[{}]/g, "")}`);
  for (const lang of ["ja", "zh"]) {
    const a = filled.A[id][lang], b = filled.B[id][lang];
    for (const [m, text] of a === b ? [["AB", a]] : [["A", a], ["B", b]]) {
      const r = read[lang][key[`${lang}|${text}`]];
      console.log(`${lang}${m.padEnd(2)} ${text}\n     → ${r.ko}${r.odd ? `   어색: ${r.odd}` : ""}`);
    }
  }
  console.log("");
}
