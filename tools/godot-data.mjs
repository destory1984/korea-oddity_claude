// Godot 판이 읽을 자료를 뽑는다: node tools/godot-data.mjs
// 글, 장면의 자리, 요금은 웹의 것(docs/trip, docs/water)이 한 벌이다. 여기서 Godot 이 읽는 JSON 으로 옮기고
// 그림을 godot/art/ 로 베낀다. 웹의 글이나 장면을 고친 뒤에는 다시 돌린다. 그 뒤에 tools/godot-fonts.py 도 돌린다.
import fs from "node:fs";
import { TEXT as BASE, LANGS } from "../docs/trip/i18n.js";
import { TEXT as EXTRA } from "../docs/water/text.js";

const at = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(at(path), "utf8"));
const write = (path, value) => fs.writeFileSync(at(path), `${JSON.stringify(value, null, 1)}\n`);

// Godot 판이 쓰는 그림. 장면을 옮길 때마다 여기에 더한다.
const ART = ["hd-station", "hd-street", "hd-door", "hd-idol", "hd-studio", "hd-jam", "hd-evening", "hd-show", "hd-eat",
  "md-exit", "md-wrong", "md-street-b", "photo-2004"];

fs.mkdirSync(at("godot/data"), { recursive: true });
const text = Object.fromEntries(LANGS.map((lang) => [lang, { ...BASE[lang], ...EXTRA[lang] }]));
write("godot/data/text.json", text);
write("godot/data/scenes.json", read("docs/water/scenes.json"));
write("godot/data/fares.json", read("docs/trip/data/fares.json"));
for (const name of ART) fs.copyFileSync(at(`docs/water/art/${name}.webp`), at(`godot/art/${name}.webp`));
console.log(`글 ${Object.keys(text.ko).length}개 × ${LANGS.length}, 그림 ${ART.length}장`);
