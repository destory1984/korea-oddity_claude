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

// 연속 판정(성산일출봉). sun: {alt, az} 도.
export function judgeContinuous(place, dials, sun) {
  const { target, tolerance, seasonDays, lowSun } = place;
  const composition = Math.abs(dials.x - target.x) <= tolerance.x + EPS && Math.abs(dials.d - target.d) <= tolerance.d + EPS;
  const day = dayOfYear(dials.s);
  const season = day >= seasonDays[0] && day <= seasonDays[1];
  const time = sun.alt < lowSun[0] ? "night" : sun.alt > lowSun[1] ? "noon" : sun.az < 180 ? "morning" : "evening";
  const matched = composition && season && time === "morning";
  const sora = !composition ? "composition" : !season ? "season" : matched ? "match" : time;
  return { matched, composition, season, time, sora, line: place.sora[sora] };
}

// 이산 판정(첨성대). 상태의 태그를 과제의 need, forbid 에 대어 본다.
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
