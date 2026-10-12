// 걷기 시험판의 셈. 화면과 브라우저를 모른다. 지도는 maps.json 에서 받는다.
// 한 글자가 한 칸이다. 유이는 칸에서 칸으로 걷고, 닿은 칸의 글자가 일을 일으킨다.

export const BLOCKED = "#scCe";
export const EXITS = "368";

export const tileAt = (map, x, y) => map.rows[y]?.[x] ?? "#";
export const walkable = (map, x, y) => !BLOCKED.includes(tileAt(map, x, y));

const STEPS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// from 에서 to 까지 가는 칸의 줄(from 은 빼고). 네 방향으로만 걷는다.
// to 가 막힌 칸이거나 닿지 못하는 칸이면, 닿을 수 있는 칸 가운데 to 에 가장 가까운 칸으로 간다.
export function path(map, from, to) {
  const key = (x, y) => `${x},${y}`;
  const came = new Map([[key(...from), null]]);
  const queue = [from];
  let best = from, bestGap = Math.hypot(from[0] - to[0], from[1] - to[1]);
  while (queue.length) {
    const [x, y] = queue.shift();
    const gap = Math.hypot(x - to[0], y - to[1]);
    if (gap < bestGap) { best = [x, y]; bestGap = gap; }
    if (gap === 0) break;
    for (const [dx, dy] of STEPS) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(map, nx, ny) || came.has(key(nx, ny))) continue;
      // 출구 계단은 그리로 가려고 누른 때에만 밟는다. 지나가는 길로 삼으면 가려던 곳이 아닌 출구로 나가 버린다.
      const next = tileAt(map, nx, ny);
      if (EXITS.includes(next) && next !== tileAt(map, to[0], to[1])) continue;
      came.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  const way = [];
  for (let at = best; came.get(key(...at)); at = came.get(key(...at))) way.unshift(at);
  return way;
}

// 그 칸에 서면 일어나는 일. 출구 계단이면 그 번호, 개찰구면 gate, 계란빵 수레 곁이면 goal.
export function trigger(map, x, y) {
  const tile = tileAt(map, x, y);
  if (EXITS.includes(tile)) return { exit: Number(tile) };
  if (tile === "g") return { gate: true };
  if (STEPS.some(([dx, dy]) => tileAt(map, x + dx, y + dy) === "C")) return { goal: true };
  return null;
}

// 걸음의 방향. 그림은 앞, 뒤, 옆(오른쪽) 셋이고 왼쪽은 옆을 뒤집는다.
export function facing(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy < 0 ? "up" : "down";
}

// 같은 글자가 모인 덩이의 한가운데(칸의 자리). 출구의 번호판과 수레의 느낌표를 놓는 데 쓴다.
export function centreOf(map, tile) {
  const cells = [];
  map.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === tile) cells.push([x, y]); }));
  if (!cells.length) return null;
  return [cells.reduce((sum, c) => sum + c[0], 0) / cells.length + 0.5, cells.reduce((sum, c) => sum + c[1], 0) / cells.length + 0.5];
}
