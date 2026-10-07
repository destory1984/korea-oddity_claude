// 3차: 번역에 남은 {이름} 자리를 docs/이름표.md 에서 채우고, 누구의 번역인지 가린 읽기용 파일을 만든다.
// 쓰는 법: node translation-test/round3/fill.mjs
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL(".", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));
const save = (name, obj) => writeFileSync(new URL(name, dir), JSON.stringify(obj, null, 1) + "\n");

// 이름표의 표에서 한글 → 일본어, 중국어를 읽는다. 일본어의 읽는 소리 괄호는 뗀다.
const names = {};
for (const line of readFileSync(new URL("../../docs/이름표.md", dir), "utf8").split(/\r?\n/)) {
  const cells = line.split("|").map((s) => s.trim()).slice(1, -1);
  if (/^\d+$/.test(cells[0] ?? "")) cells.shift();          // "칸" 열
  if (cells.length !== 5 || cells[0] === "한글" || /^-+$/.test(cells[0])) continue;
  names[cells[0]] = { ja: cells[2].replace(/（.*?）/g, ""), zh: cells[3] };
}

const source = load("source.json");
const out = { A: load("out-A.json"), B: load("out-B.json") };
const tokens = (s) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort().join(",");

const filled = { A: {}, B: {} }, problems = [];
for (const { id, ko } of source) for (const m of ["A", "B"]) {
  filled[m][id] = {};
  for (const lang of ["ja", "zh"]) {
    const text = out[m][id][lang];
    if (tokens(text) !== tokens(ko)) problems.push(`${m}.${id}.${lang}: 이름 자리가 원문과 다르다: ${text}`);
    filled[m][id][lang] = text.replace(/\{([^}]+)\}/g, (all, n) => names[n]?.[lang] ?? all);
  }
}
save("filled-A.json", filled.A); save("filled-B.json", filled.B);

// 같은 글은 한 번만 읽힌다. 차례는 섞는다(씨앗을 박아 두어 다시 돌려도 같다).
let seed = 20261007;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const key = {};
for (const lang of ["ja", "zh"]) {
  const texts = [...new Set(["A", "B"].flatMap((m) => source.map(({ id }) => filled[m][id][lang])))];
  for (let i = texts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]]; }
  const blind = {};
  texts.forEach((t, i) => { const k = "x" + String(i + 1).padStart(3, "0"); blind[k] = t; key[`${lang}|${t}`] = k; });
  save(`blind-${lang}.json`, blind);
  console.log(`${lang}: 읽을 글 ${texts.length}개 (두 모델이 글자까지 같은 줄 ${source.filter(({ id }) => filled.A[id][lang] === filled.B[id][lang]).length} / ${source.length})`);
}
save("blind-key.json", key);
console.log(problems.length ? problems.join("\n") : "이름 자리는 모든 줄에서 원문과 같다.");
