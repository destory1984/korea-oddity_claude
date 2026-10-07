// 설정의 "Changes" 쪽이 읽을 자료를 만든다: docs/바뀐-것들.md 의 표 + data/changes-i18n.json(일본어, 중국어, 영어) → docs/assets/changes.js
// 쓰는 법: node tools/make-changes.mjs
// 줄은 docs/바뀐-것들.md 에서만 고친다. 1권의 src/core/changes.js 와 같은 쓰임이다(한국어 줄이 열쇠이고, 다른 말은 그 줄의 번역이다).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url);
const changes = [];
for (const line of readFileSync(new URL("docs/바뀐-것들.md", root), "utf8").split(/\r?\n/)) {
  const cells = line.split("|").map((s) => s.trim()).slice(1, -1);
  if (cells.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0])) changes.push({ day: cells[0], text: cells[1] });
}
if (!changes.length) throw new Error("docs/바뀐-것들.md 에서 줄을 하나도 읽지 못했다.");
for (let i = 1; i < changes.length; i++) if (changes[i].day > changes[i - 1].day) throw new Error(`날이 거꾸로다: ${changes[i].day} 가 ${changes[i - 1].day} 아래에 있다. 새 날이 위에 온다.`);

const i18nPath = new URL("data/changes-i18n.json", root);
const i18n = existsSync(i18nPath) ? JSON.parse(readFileSync(i18nPath, "utf8")) : {};
const words = { ja: {}, zh: {}, en: {} };
const missing = [];
for (const { text } of changes) for (const lang of ["ja", "zh", "en"]) {
  if (i18n[text]?.[lang]) words[lang][text] = i18n[text][lang]; else missing.push(`${lang}: ${text.slice(0, 30)}`);
}

writeFileSync(new URL("docs/assets/changes.js", root),
  "// 바뀐 것들. tools/make-changes.mjs 가 docs/바뀐-것들.md 와 data/changes-i18n.json 으로 만든 파일이다. 손으로 고치지 않는다.\n" +
  "// CHANGES: 새 날이 위에 온다. CHANGE_WORDS: 한국어 줄 → 그 말의 줄. 번역이 없는 줄은 한국어로 보인다.\n" +
  `const CHANGES_STARTED = ${JSON.stringify(changes[changes.length - 1].day)};\n` +
  "const CHANGES = " + JSON.stringify(changes, null, 1) + ";\n" +
  "const CHANGE_WORDS = " + JSON.stringify(words, null, 1) + ";\n");
console.log(`줄 ${changes.length}개.` + (missing.length ? ` 번역이 없는 줄 ${missing.length}개:\n  ${missing.join("\n  ")}` : " 번역이 모두 있다."));
