// 이미 긁어 둔 이름 자료에 영어 이름을 더한다. 한국어 위키백과 문서의 언어 사이 연결에서 영어 문서 제목을 읽는다.
// 쓰는 법: node tools/add-en-names.mjs  →  data/places.json 과 data/names.json 의 줄마다 en 을 적는다.
// 일본어, 중국어 이름과 좌표는 건드리지 않는다(make-names.mjs 를 다시 돌리면 그것들이 바뀔 수 있어 따로 두었다).
// 위키백과는 원 자료가 아니다. 여기서 나온 것은 "바탕"이고, 게임에 넣기 전에 공식 자료와 맞춘다.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const UA = "korea-oddity-name-table/0.1 (https://github.com/destory1984/korea-oddity_claude)";

async function enTitles(titles) {
  const found = {};
  for (let i = 0; i < titles.length; i += 40) {
    const url = "https://ko.wikipedia.org/w/api.php?" + new URLSearchParams({
      format: "json", formatversion: "2", action: "query", titles: titles.slice(i, i + 40).join("|"), redirects: "1", prop: "langlinks", lllang: "en", lllimit: "500",
    });
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`한국어 위키백과 ${res.status}`);
    const { query } = await res.json();
    const moved = Object.fromEntries((query.redirects ?? []).concat(query.normalized ?? []).map((r) => [r.to, r.from]));
    for (const page of query.pages) {
      const en = page.langlinks?.[0]?.title ?? null;
      found[page.title] = en;
      if (moved[page.title]) found[moved[page.title]] = en;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return found;
}

for (const file of ["data/places.json", "data/names.json"]) {
  const rows = JSON.parse(readFileSync(new URL(file, root), "utf8"));
  const found = await enTitles([...new Set(rows.map((r) => r.koWiki).filter(Boolean))]);
  for (const row of rows) row.en = found[row.koWiki] ?? null;
  writeFileSync(new URL(file, root), JSON.stringify(rows, null, 1) + "\n");
  const none = rows.filter((r) => !r.en);
  console.log(`${file}: ${rows.length}개 가운데 영어 이름 ${rows.length - none.length}개.` + (none.length ? ` 없는 것: ${none.map((r) => r.ko).join(", ")}` : ""));
}
