// 수첩 지도의 바닷가 선을 만든다: Natural Earth 의 육지(ne_10m_land.geojson)에서 한반도 둘레만 잘라 docs/assets/coast.js 에 쓴다.
// 쓰는 법: node tools/make-coast.mjs <ne_10m_land.geojson 의 경로>
// 자료: https://github.com/nvkelso/natural-earth-vector 의 geojson/ne_10m_land.geojson (저작권 없음, THIRD-PARTY.md)
// 원본(10MB)은 저장소에 넣지 않는다. 잘라서 성기게 만든 것만 넣는다.
import { readFileSync, writeFileSync } from "node:fs";

const from = process.argv[2];
if (!from) { console.error("ne_10m_land.geojson 의 경로를 넣는다."); process.exit(1); }
const BOX = { lon0: 120, lon1: 135, lat0: 30, lat1: 42 };   // 지도에 보이는 곳(124.4 → 131.1, 33.0 → 38.8)보다 넉넉히 자른다
const TOLERANCE = 0.012;   // 도. 1km 남짓보다 작은 굴곡은 편다
const MIN_SPAN = 0.03;     // 도. 이보다 작은 섬은 뺀다(3km 남짓)

const inBox = ([lon, lat]) => lon >= BOX.lon0 && lon <= BOX.lon1 && lat >= BOX.lat0 && lat <= BOX.lat1;

// 고리에서 상자 안에 든 점이 이어지는 토막들. 고리가 통째로 안에 있으면 그 고리 하나다.
function runs(ring) {
  if (ring.every(inBox)) return [ring];
  const start = ring.findIndex((p) => !inBox(p));
  const out = []; let cur = [];
  for (let i = 1; i <= ring.length; i++) {
    const p = ring[(start + i) % ring.length];
    if (inBox(p)) cur.push(p); else if (cur.length) { out.push(cur); cur = []; }
  }
  return out;
}

// 더글러스-포이커: 선에서 TOLERANCE 보다 덜 벗어난 점을 뺀다
function simplify(points) {
  if (points.length < 3) return points;
  const first = points[0], last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    // 닫힌 고리(섬)는 처음과 끝이 같은 점이라 선을 그을 수 없다. 처음에서 가장 먼 점에서 둘로 갈라 따로 편다.
    let far = 1, most = 0;
    points.forEach((p, i) => { const d = Math.hypot(p[0] - first[0], p[1] - first[1]); if (d > most) { most = d; far = i; } });
    return [...simplify(points.slice(0, far + 1)), ...simplify(points.slice(far)).slice(1)];
  }
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let far = -1, most = TOLERANCE;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (d > most) { most = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const land = JSON.parse(readFileSync(from, "utf8"));
const shapes = [];
for (const feature of land.features) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const run of runs(polygon[0])) {   // 바깥 고리만 쓴다
    const lons = run.map((p) => p[0]), lats = run.map((p) => p[1]);
    if (run.length < 4 || Math.max(Math.max(...lons) - Math.min(...lons), Math.max(...lats) - Math.min(...lats)) < MIN_SPAN) continue;
    shapes.push(simplify(run).flatMap(([lon, lat]) => [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000]));
  }
}
shapes.sort((a, b) => b.length - a.length);

writeFileSync(new URL("../docs/assets/coast.js", import.meta.url),
  "// 한반도 둘레의 육지. tools/make-coast.mjs 가 Natural Earth(ne_10m_land, 저작권 없음)에서 잘라 만든 파일이다. 손으로 고치지 않는다.\n" +
  "// 한 줄이 땅 한 덩이다: [경도, 위도, 경도, 위도, …]. 큰 덩이는 상자(동경 120 → 135, 북위 30 → 42)에서 잘려 있다.\n" +
  "const COAST = [\n" + shapes.map((s) => " [" + s.join(",") + "]").join(",\n") + "\n];\n");
console.log(`땅 ${shapes.length}덩이, 점 ${shapes.reduce((n, s) => n + s.length / 2, 0)}개.`);
