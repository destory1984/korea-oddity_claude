// 로그에서 비교의 숫자를 뽑는다. 한 줄은 {place, t, kind, value} 다.

const succeeded = (line) => line.kind === "shutter" && Boolean(line.value?.matched || line.value?.ok);

// 마지막 성공 뒤로 잇달아 틀린 셔터의 수. 셋이 되면 화면이 도움을 권한다. 첨성대는 과제가 바뀌면 다시 센다.
export function missStreak(log, placeId) {
  const shots = log.filter((l) => l.place === placeId && l.kind === "shutter");
  const task = shots.at(-1)?.value?.task;
  let n = 0;
  for (let i = shots.length - 1; i >= 0 && !succeeded(shots[i]) && shots[i].value?.task === task; i--) n++;
  return n;
}

// 그 장소에서 더 할 과제가 없는가. "한 번 더 찍기"를 누를 때 main.js 가 이 값을 retry 줄에 적는다.
// 성산은 한 번 포개면, 첨성대는 마지막 과제를 채우면 참이다.
export function allDone(log, place) {
  const last = place.tasks?.at(-1).id;
  return log.some((l) => l.place === place.id && l.kind === "shutter" && (l.value?.matched || (l.value?.ok && l.value.task === last)));
}

// 장소 하나의 숫자: 첫 진입(가는 길이 있으면 처음 닿은 때)에서 첫 성공까지(ms), 셔터 횟수, 도움 횟수,
// retried(더 할 과제가 없는데도 다시 찍기를 눌렀는가), wentOn(첫 성공 뒤 다음 과제를 하러 다시 찍기를 눌렀는가).
// 두 장소의 retried 가 같은 뜻이 되게 둘을 가른다. 첨성대에서 과제 2로 넘어가는 길도 같은 단추라서다.
export function metrics(log, placeId) {
  const lines = log.filter((l) => l.place === placeId);
  // 가는 길이 있는 판에서는 그 자리에 닿은 때(arrive)부터 잰다. 지하철과 걷는 장면의 시간이 섞이지 않는다.
  const enter = lines.find((l) => l.kind === "arrive") ?? lines.find((l) => l.kind === "enter");
  const success = lines.find(succeeded);
  return {
    firstSuccessMs: enter && success ? success.t - enter.t : null,
    shutters: lines.filter((l) => l.kind === "shutter").length,
    helps: lines.filter((l) => l.kind === "help").length,
    retried: lines.some((l) => l.kind === "retry" && l.value?.afterAll === true),
    wentOn: Boolean(success) && lines.some((l) => l.kind === "retry" && l.value?.afterAll === false && l.t >= success.t),
  };
}

// "로그 내보내기"가 클립보드에 넣는 글.
export function exportText(state, placeIds) {
  const log = state.log ?? [];
  return JSON.stringify({
    answer: state.answer ?? null,
    metrics: Object.fromEntries(placeIds.map((id) => [id, metrics(log, id)])),
    log,
  }, null, 2);
}
