// 기획서 9절의 표에서 자리 칸 100곳을 뽑아 data/squares.json 에 적는다.
// 쓰는 법: node tools/make-squares.mjs
// 칸의 내용은 기획서에서만 고친다. 이 파일은 그것을 옮겨 적을 뿐이다.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const lines = readFileSync(new URL("docs/기획서-수첩-3권.md", root), "utf8").split(/\r?\n/);
const GRANDMA = { "갔다": "went", "봤다": "saw", "못 봤다": "missed" };

const squares = [];
let region = null, inSection = false;
for (const line of lines) {
  if (line.startsWith("## ")) inSection = line.startsWith("## 9.");
  if (!inSection) continue;
  if (line.startsWith("### ")) { region = line.slice(4).trim(); continue; }
  const cells = line.split("|").map((s) => s.trim()).slice(1, -1);
  if (cells.length !== 7 || !/^\d+$/.test(cells[0])) continue;
  const [no, id, name, where, what, best, grandma] = cells;
  if (!GRANDMA[grandma]) throw new Error(`${no}번 칸의 할머니 열을 읽지 못했다: ${grandma}`);
  squares.push({ no: Number(no), id, name, region, where, what, best, grandma: GRANDMA[grandma] });
}

if (squares.length !== 100) throw new Error(`칸이 ${squares.length}개다. 100개여야 한다.`);
squares.forEach((s, i) => { if (s.no !== i + 1) throw new Error(`${i + 1}번 자리에 ${s.no}번 칸이 있다.`); });
if (new Set(squares.map((s) => s.id)).size !== 100) throw new Error("id 가 겹친다.");

writeFileSync(new URL("data/squares.json", root), JSON.stringify(squares, null, 1) + "\n");
const count = (key) => squares.reduce((m, s) => ((m[s[key]] = (m[s[key]] ?? 0) + 1), m), {});
console.log("칸 100개.", count("region"), count("grandma"));
