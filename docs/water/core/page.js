// 수첩의 쪽마다 모은 것과 놓은 것의 셈. 화면을 모른다. 걸음과 돈의 셈은 docs/trip/core/trip.js 가 한다.
// 쪽은 둘이다: icn(공항 → 서울역), md(서울역 → 명동).

// 쪽마다 모으는 것 다섯. 장면 속의 것을 누르거나, 표를 사거나, 사진을 찍어 얻는다.
export const ITEMS = {
  icn: ["ticket", "word", "note", "coin", "photo"],
  md: ["exit", "word", "photo", "egg", "clue"],
};

// found 모은 것, placed 쪽에 놓은 것과 자리, shotAt 사진을 찍을 때 화면이 긴 그림의 어디쯤이었나(0 왼쪽 끝 → 1 오른쪽 끝), tried 가 본 틀린 곳.
export const freshPage = () => ({ found: [], placed: {}, shotAt: 0.5, tried: [] });
export const freshAlbum = () => ({ icn: freshPage(), md: freshPage() });

export const has = (pg, id) => pg.found.includes(id);

// 처음 얻었으면 true.
export function collect(pg, kind, id) {
  if (!ITEMS[kind]?.includes(id) || has(pg, id)) return false;
  pg.found.push(id);
  return true;
}

// 쪽에 놓는다. x, y 는 쪽의 너비와 높이에 대한 비(0 → 1)이고 놓인 것의 가운데다. 붙인 뒤(locked)에는 못 옮긴다.
const clamp = (v) => Math.min(1, Math.max(0, v));
export function place(pg, id, x, y, locked = false) {
  if (locked || !has(pg, id)) return false;
  pg.placed[id] = { x: clamp(x), y: clamp(y) };
  return true;
}
export function unplace(pg, id, locked = false) {
  if (locked) return false;
  delete pg.placed[id];
  return true;
}

// 사진을 놓아야 붙일 수 있다.
export const canPaste = (pg, locked = false) => !locked && "photo" in pg.placed;

// 사진을 찍은 자리. 긴 그림을 셋으로 나눈다. 왼쪽부터 A, B, C 이고 docs/trip/core/trip.js 의 자리 셋과 같은 이름이다.
export const spotOf = (shotAt) => (shotAt < 1 / 3 ? "A" : shotAt < 2 / 3 ? "B" : "C");

// 쪽에 놓은 것에 따라 할머니의 답장에 더 붙는 줄.
const EXTRA = {
  icn: [["word", "replyWordIcn"], ["note", "replyNote"], ["coin", "replyCoin"]],
  md: [["word", "replyWord"]],
};
export const replyExtras = (kind, pg) => EXTRA[kind].filter(([id]) => id in pg.placed).map(([, key]) => key);

// 저장에서 읽은 것을 믿을 수 있는 꼴로 고친다. 모르는 것은 버린다.
export function restore(saved) {
  const album = freshAlbum();
  for (const kind of Object.keys(ITEMS)) {
    const from = saved?.[kind];
    if (!from) continue;
    const pg = album[kind];
    for (const id of Array.isArray(from.found) ? from.found : []) collect(pg, kind, id);
    for (const [id, at] of Object.entries(from.placed ?? {})) if (Number.isFinite(at?.x) && Number.isFinite(at?.y)) place(pg, id, at.x, at.y);
    if (Number.isFinite(from.shotAt)) pg.shotAt = clamp(from.shotAt);
    if (Array.isArray(from.tried)) pg.tried = from.tried.filter((v) => typeof v === "number" || typeof v === "string");
  }
  return album;
}
