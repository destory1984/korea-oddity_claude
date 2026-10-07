// 이름표의 바탕을 위키백과에서 긁어 온다. 기억으로 이름을 짓지 않으려는 것이다.
// 한국어 위키백과 문서 → 일본어, 중국어 문서 제목(언어 사이 연결) → 중국어 간체와 번체 제목, 일본어 읽는 소리.
// 쓰는 법: node tools/make-names.mjs  →  data/names.json 을 쓴다.
// 위키백과는 원 자료가 아니다. 여기서 나온 것은 "바탕"이고, 게임에 넣기 전에 공식 자료와 맞춘다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("..", import.meta.url);
const wanted = JSON.parse(readFileSync(new URL("data/names-wanted.json", root), "utf8"));
const UA = "korea-oddity-name-table/0.1 (https://github.com/destory1984/korea-oddity_claude)";

async function api(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${lang} 위키백과 ${res.status}`);
  return res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 일본어 문서 첫머리에서 가타카나로 적은 읽는 소리를 찾는다. 예: 瞻星台（せんせいだい、チョムソンデ）
function kana(extract) {
  const head = (extract ?? "").slice(0, 300);
  const found = [...head.matchAll(/[ァ-ヴー]{2,}(?:・[ァ-ヴー]+)*/g)].map((m) => m[0]);
  const inParen = /[（(]([^）)]{0,80})[）)]/.exec(head)?.[1] ?? "";
  return found.find((k) => inParen.includes(k)) ?? null;
}
// 한국어 문서 첫머리에서 한자를 찾는다. 예: 첨성대(瞻星臺)
const hanja = (extract) => /[（(][^）)]*?([一-鿿][一-鿿·\s]*)/.exec((extract ?? "").slice(0, 300))?.[1].trim() ?? null;

const out = [];
for (const { ko, wiki } of wanted) {
  const row = { ko, koWiki: wiki, hanja: null, ja: null, jaKana: null, zhHans: null, zhHant: null, missing: [] };
  const q = await api("ko", { action: "query", titles: wiki, redirects: "1", prop: "langlinks|extracts", lllimit: "500", exintro: "1", explaintext: "1" });
  const page = q.query.pages[0];
  if (page.missing) { row.missing.push("ko"); out.push(row); console.log(`✗ ${ko}: 한국어 문서 "${wiki}" 없음`); continue; }
  row.koWiki = page.title;
  row.hanja = hanja(page.extract);
  const links = Object.fromEntries((page.langlinks ?? []).map((l) => [l.lang, l.title]));
  if (links.ja) {
    row.ja = links.ja;
    const j = await api("ja", { action: "query", titles: links.ja, redirects: "1", prop: "extracts", exintro: "1", explaintext: "1" });
    row.jaKana = kana(j.query.pages[0].extract);
  } else row.missing.push("ja");
  if (links.zh) {
    const z = await api("zh", { action: "query", titles: links.zh, redirects: "1", prop: "info", inprop: "varianttitles" });
    const v = z.query.pages[0].varianttitles ?? {};
    row.zhHans = v["zh-cn"] ?? v["zh-hans"] ?? links.zh;
    row.zhHant = v["zh-tw"] ?? v["zh-hant"] ?? null;
  } else row.missing.push("zh");
  out.push(row);
  console.log(`${row.missing.length ? "△" : "○"} ${ko} | ${row.hanja} | ${row.ja}（${row.jaKana}） | ${row.zhHans} | ${row.zhHant}`);
  await sleep(150);
}
mkdirSync(new URL("data/", root), { recursive: true });
writeFileSync(new URL("data/names.json", root), JSON.stringify(out, null, 1) + "\n");
console.log(`\n${out.length}개 가운데 빠진 데가 있는 것 ${out.filter((r) => r.missing.length).length}개`);
