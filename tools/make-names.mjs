// 이름표의 바탕을 위키백과에서 긁어 온다. 기억으로 이름을 짓지 않으려는 것이다.
// 한국어 위키백과 문서 → 일본어, 중국어 문서 제목(언어 사이 연결) → 중국어 간체와 번체 제목, 일본어 읽는 소리.
// 쓰는 법: node tools/make-names.mjs  →  data/names-wanted.json 을 읽어 data/names.json 을 쓴다.
//         node tools/make-names.mjs data/squares-wiki.json data/places.json  →  다른 목록을 읽어 다른 파일에 쓴다.
// 목록의 한 줄은 { ko, wiki } 다. 문서에 좌표가 있으면 위도와 경도도 적는다.
// 위키백과는 원 자료가 아니다. 여기서 나온 것은 "바탕"이고, 게임에 넣기 전에 공식 자료와 맞춘다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("..", import.meta.url);
const [input = "data/names-wanted.json", output = "data/names.json"] = process.argv.slice(2);
const wanted = JSON.parse(readFileSync(new URL(input, root), "utf8"));
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
for (const { ko, wiki, ...rest } of wanted) {
  const row = { ...rest, ko, koWiki: wiki, lat: null, lon: null, hanja: null, ja: null, jaKana: null, zhHans: null, zhHant: null, missing: [] };
  const q = await api("ko", { action: "query", titles: wiki, redirects: "1", prop: "langlinks|extracts|coordinates|pageprops", ppprop: "wikibase_item", lllimit: "500", exintro: "1", explaintext: "1" });
  const page = q.query.pages[0];
  if (page.missing) { row.missing.push("ko"); out.push(row); console.log(`✗ ${ko}: 한국어 문서 "${wiki}" 없음`); continue; }
  row.koWiki = page.title;
  if (page.coordinates?.[0]) { row.lat = page.coordinates[0].lat; row.lon = page.coordinates[0].lon; } else row.missing.push("좌표");
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
  // 위키백과에 없는 것은 위키데이터에서 채운다(좌표 P625, 일본어와 중국어 이름표). 채운 것은 fromWikidata 에 적는다.
  const qid = page.pageprops?.wikibase_item;
  if (qid && row.missing.length) {
    const res = await fetch(`https://www.wikidata.org/w/api.php?` + new URLSearchParams({ format: "json", action: "wbgetentities", ids: qid, props: "labels|claims", languages: "ja|zh|zh-hans|zh-cn|zh-hant|zh-tw" }), { headers: { "User-Agent": UA } });
    const e = (await res.json()).entities?.[qid] ?? {};
    const label = (...langs) => langs.map((l) => e.labels?.[l]?.value).find(Boolean) ?? null;
    const at = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    const got = [];
    if (row.lat === null && at) { row.lat = at.latitude; row.lon = at.longitude; got.push("좌표"); }
    if (!row.ja && label("ja")) { row.ja = label("ja"); got.push("ja"); }
    if (!row.zhHans && label("zh-hans", "zh-cn", "zh")) { row.zhHans = label("zh-hans", "zh-cn", "zh"); row.zhHant = label("zh-hant", "zh-tw"); got.push("zh"); }
    row.wikidata = qid;
    if (got.length) { row.fromWikidata = got; row.missing = row.missing.filter((m) => !got.includes(m)); }
  }
  out.push(row);
  console.log(`${row.missing.length ? "△" : "○"} ${ko} | ${row.lat}, ${row.lon} | ${row.hanja} | ${row.ja}（${row.jaKana}） | ${row.zhHans}${row.missing.length ? "  빠짐: " + row.missing : ""}`);
  await sleep(150);
}
mkdirSync(new URL("data/", root), { recursive: true });
writeFileSync(new URL(output, root), JSON.stringify(out, null, 1) + "\n");
console.log(`\n${out.length}개 가운데 빠진 데가 있는 것 ${out.filter((r) => r.missing.length).length}개`);
