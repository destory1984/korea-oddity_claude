// 수채 견본(명동)의 셈: 무엇을 모았는지, 어느 출구를 가 봤는지, 수첩의 쪽에 무엇을 놓았는지. 화면을 모른다.

// 모으는 것 다섯. exit 는 맞는 출구로 나가면, 나머지는 장면 속의 것을 눌러 얻는다.
export const ITEMS = ["exit", "word", "photo", "egg", "clue"];

export function fresh() {
  return { scene: "station", found: [], tried: [], misses: 0, placed: {}, pasted: false };
}

export const has = (state, id) => state.found.includes(id);

// 처음 얻었으면 true.
export function collect(state, id) {
  if (!ITEMS.includes(id) || has(state, id)) return false;
  state.found.push(id);
  return true;
}

// 출구를 누른다. "right" 맞는 출구, "grandma" 할머니가 나간 출구, "wrong" 그 밖의 틀린 출구, "tried" 이미 가 본 틀린 출구.
export function tapExit(state, n, exits) {
  if (n === exits.right) {
    collect(state, "exit");
    state.scene = "street";
    return "right";
  }
  if (state.tried.includes(n)) return "tried";
  state.tried.push(n);
  state.misses += 1;
  return n === exits.grandma ? "grandma" : "wrong";
}

// 수첩의 쪽에 놓는다. x, y 는 쪽의 너비와 높이에 대한 비(0 → 1)이고 놓인 것의 가운데다.
const clamp = (v) => Math.min(1, Math.max(0, v));
export function place(state, id, x, y) {
  if (state.pasted || !has(state, id)) return false;
  state.placed[id] = { x: clamp(x), y: clamp(y) };
  return true;
}
export function unplace(state, id) {
  if (state.pasted) return false;
  delete state.placed[id];
  return true;
}

// 사진을 놓아야 붙일 수 있다.
export const canPaste = (state) => !state.pasted && "photo" in state.placed;
export function paste(state) {
  if (!canPaste(state)) return false;
  state.pasted = true;
  return true;
}

// 할머니의 답장. 쪽에 놓은 것에 따라 줄이 붙는다.
export function replyKeys(state) {
  const keys = [state.misses ? "replyLost" : "replyExit", "replyRound"];
  if ("clue" in state.placed) keys.push("replyClue");
  if ("egg" in state.placed) keys.push("replyEgg");
  if ("word" in state.placed) keys.push("replyWord");
  return keys;
}
