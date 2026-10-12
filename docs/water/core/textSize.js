// 글자 크기: 다섯 단계. 설정 창 머리의 두 단추(가−, 가+)로 고르고 다음에 열 때에도 남는다. 1이 처음 지은 크기다.
// 우주 한량(1권)의 src/core/textSize.js 를 옮긴 것이다.
export const TEXT_SIZES = [0.85, 1, 1.15, 1.3, 1.5];
export const TEXT_SIZE_DEFAULT = 1;

// 저장된 값. 다섯 가운데 하나가 아니면 처음의 크기다.
export function textSizeFrom(raw) {
  const n = Number(raw);
  return TEXT_SIZES.includes(n) ? n : TEXT_SIZE_DEFAULT;
}

// 한 단계 크게(way = 1) 또는 작게(way = -1). 끝에서는 그대로다.
export function nextTextSize(size, way) {
  const i = TEXT_SIZES.indexOf(textSizeFrom(size));
  return TEXT_SIZES[Math.max(0, Math.min(TEXT_SIZES.length - 1, i + Math.sign(way)))];
}

// 그쪽으로 더 갈 단계가 있는가(없으면 단추가 흐려진다).
export function canResize(size, way) {
  return nextTextSize(size, way) !== textSizeFrom(size);
}
