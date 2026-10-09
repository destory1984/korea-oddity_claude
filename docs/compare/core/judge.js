// 판정 둘. 화면과 브라우저를 모른다. 성공 조건과 소라의 말은 장소 자료(places/*.json)에서 읽는다.

const EPS = 1e-9;   // 0.4 - 0.3 은 부동소수로 0.1보다 조금 크다. 끝값을 맞는 것으로 친다.
const wrap = (v, size) => ((v % size) + size) % size;

// 계절 다이얼의 값(0 → 1, 범위 밖이면 감아 돈다)을 날 번호(1월 1일이 0)로.
export function dayOfYear(s) {
  return Math.min(364, Math.floor(wrap(s, 1) * 365));
}

// 해 계산이 실패했을 때의 연출. 06:37쯤 뜨고 18시쯤 진다.
export function stagedSun(h) {
  const t = wrap(h, 24);
  return { alt: 48 * Math.sin(Math.PI * (t - 6.62) / 11.37), az: t < 12.3 ? 100 : 260 };
}

// 연속 판정(A안). sun: {alt, az} 도.
// 장소마다 맞출 것이 다르다. 성산은 좌우, 거리, 계절, 시각 넷이고 부석사는 계절과 시각 둘이다(place.rings).
// 맞는 때는 해가 낮게 떠 있는 아침이나 저녁이다(place.target.when. 적지 않으면 아침).
export function judgeContinuous(place, dials, sun) {
  const { target, tolerance, seasonDays, lowSun } = place;
  const rings = place.rings ?? ["x", "d", "s", "h"];
  const when = target.when ?? "morning";
  const offX = rings.includes("x") ? dials.x - target.x : 0, offD = rings.includes("d") ? dials.d - target.d : 0;
  const okX = Math.abs(offX) <= (tolerance?.x ?? 0) + EPS, okD = Math.abs(offD) <= (tolerance?.d ?? 0) + EPS;
  const composition = okX && okD;
  const day = dayOfYear(dials.s);
  const season = day >= seasonDays[0] && day <= seasonDays[1];
  const time = sun.alt < lowSun[0] ? "night" : sun.alt > lowSun[1] ? "noon" : sun.az < 180 ? "morning" : "evening";
  const matched = composition && season && time === when;
  // 눈에 보이는 사실 하나만 짚는다. 좌우 값이 작으면 겹이 덜 밀려 산이 사진보다 오른쪽에 있고, 거리 값이 작으면 가까워서 산이 크다.
  const sora = !okX ? (offX < 0 ? "ridgeRight" : "ridgeLeft") : !okD ? (offD < 0 ? "tooNear" : "tooFar")
    : !season ? "season" : matched ? "match" : time;
  const dial = !okX ? "x" : !okD ? "d" : !season ? "s" : matched ? null : "h";   // 고칠 다이얼
  // 다이얼마다 제 값이 맞았는가. 돌리는 동안 화면이 알려 준다.
  const all = { x: okX, d: okD, s: season, h: time === when };
  const ok = Object.fromEntries(rings.map((key) => [key, all[key]]));
  return { matched, composition, season, time, sora, dial, ok, line: place.sora[sora] };
}

// 이산 판정(B안). 상태의 태그를 과제의 need, forbid 에 대어 본다.
export function judgeDiscrete(place, taskId, spot, time) {
  const tags = place.states[`${spot}-${time}`] ?? [];
  const task = place.tasks.find((t) => t.id === taskId);
  const needs = (task?.need ?? []).map((tag) => ({ tag, label: place.labels[tag] ?? tag, met: tags.includes(tag) }));
  const ok = Boolean(task) && needs.every((n) => n.met) && !task.forbid.some((tag) => tags.includes(tag));
  const rule = place.soraRules.find((r) =>
    (r.ok === undefined ? !ok : r.ok === ok) &&
    (r.task === undefined || r.task === taskId) &&
    (r.has ?? []).every((tag) => tags.includes(tag)) &&
    !(r.lacks ?? []).some((tag) => tags.includes(tag)));
  const sora = tags.length && rule ? rule.say : null;
  return { ok, needs, sora, line: sora ? place.sora[sora] : null };
}
