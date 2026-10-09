// 로그에서 비교의 숫자를 뽑는다. 한 줄은 {place, t, kind, value} 다.

const succeeded = (line) => line.kind === "shutter" && Boolean(line.value?.matched || line.value?.ok);

// 장소 하나의 숫자 넷: 첫 진입에서 첫 성공까지(ms), 셔터 횟수, 도움 횟수, 성공 뒤 다시 찍기를 눌렀는가.
export function metrics(log, placeId) {
  const lines = log.filter((l) => l.place === placeId);
  const enter = lines.find((l) => l.kind === "enter");
  const success = lines.find(succeeded);
  return {
    firstSuccessMs: enter && success ? success.t - enter.t : null,
    shutters: lines.filter((l) => l.kind === "shutter").length,
    helps: lines.filter((l) => l.kind === "help").length,
    retried: Boolean(success) && lines.some((l) => l.kind === "retry" && l.t >= success.t),
  };
}

// "로그 내보내기"가 클립보드에 넣는 글.
export function exportText(state) {
  const log = state.log ?? [];
  return JSON.stringify({
    answer: state.answer ?? null,
    metrics: { seongsan: metrics(log, "seongsan"), cheomseongdae: metrics(log, "cheomseongdae") },
    log,
  }, null, 2);
}
