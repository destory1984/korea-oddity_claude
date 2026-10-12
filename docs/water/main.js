// 수채 견본(명동): 장면 속의 것을 눌러 모으고, 모은 것으로 수첩의 한 쪽을 손수 꾸민다. 본보기는 Dordogne(2023)다.
// 움직임은 Until Then(2024)을 따른다: 유이가 옆모습으로 좌우로 걷고, 누른 곳까지 걸어가서 만진다.
// 셈은 core/page.js, 글은 text.js, 누를 곳의 자리는 scenes.json, 출구의 번호는 docs/trip/data/fares.json 에 있다.
// 저장하지 않는다. 주소에 ?lang=ja 로 말을, ?scene=street 나 ?scene=page 로 시작하는 곳을 고른다.

import * as page from "./core/page.js";
import { LANGS, translate } from "./text.js";
import { pickLang } from "../trip/i18n.js";
import { shutter as shutterSound, click as tick, ding } from "../compare/ui/sound.js";

const scenes = await (await fetch("scenes.json")).json();
const exits = (await (await fetch("../trip/data/fares.json")).json()).myeongdong.exits;
const query = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const screen = $("screen");

let storage = null;
try { storage = globalThis.localStorage; } catch { /* 기기의 말로 */ }
const lang = LANGS.includes(query.get("lang")) ? query.get("lang") : pickLang(storage, navigator.language ?? "");
document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
const t = (key, values) => translate(lang, key, values);
const itemKey = (id) => `item${id[0].toUpperCase()}${id.slice(1)}`;

let state = start();
function start() {
  const s = page.fresh();
  const scene = query.get("scene");
  if (scene === "street" || scene === "page") page.tapExit(s, exits.right, exits);
  if (scene === "page") { for (const id of page.ITEMS) page.collect(s, id); s.scene = "page"; }
  return s;
}

// ── 모은 것 ─────────────────────────────────────────────────────────

function showFound(fresh) {
  $("found").innerHTML = page.ITEMS.map((id) =>
    `<span data-item="${id}" class="${page.has(state, id) ? "on" : ""}${id === fresh ? " new" : ""}" title="${t(itemKey(id))}">${page.has(state, id) ? "✓" : ""}</span>`).join("");
}
function gain(id) {
  if (!page.collect(state, id)) return false;
  ding();
  showFound(id);
  return true;
}

// ── 유이의 말 ───────────────────────────────────────────────────────

function say(key, warn = false) {
  const bubble = screen.querySelector(".yui");
  if (!bubble) return;
  bubble.textContent = t(key);
  bubble.className = warn ? "yui warn" : "yui";
  void bubble.offsetWidth;   // 같은 말을 또 해도 떠오르는 움직임이 다시 돈다
  bubble.classList.add("in");
}
const talk = (key) => `<div class="talk"><img class="face" src="../art/yui/yui-j1-192.png" alt=""><p class="yui in">${t(key)}</p></div>`;

// ── 걷기 ────────────────────────────────────────────────────────────

const SPEED = 38;        // 한 초에 그림 너비의 몇 %를 걷는가
let yuiX = 50, yuiRight = true, walking = 0;

// 유이가 그림 너비의 x% 자리까지 걸어간 뒤 then 을 부른다. 걷는 중에 다른 곳을 누르면 그쪽으로 돌아선다.
function walkTo(x, then) {
  const yui = screen.querySelector(".walker");
  if (!yui) return then();
  const to = Math.min(92, Math.max(8, x));
  const from = yui.getBoundingClientRect().left + yui.offsetWidth / 2;
  const box = yui.parentElement.getBoundingClientRect();
  const now = ((from - box.left) / box.width) * 100;
  const seconds = Math.abs(to - now) / SPEED;
  const turn = (walking += 1);
  if (Math.abs(to - now) > 0.5) yuiRight = to > now;
  yui.classList.toggle("right", yuiRight);   // 옆모습의 그림은 왼쪽을 본다
  yui.style.transition = "none";
  yui.style.left = `${now}%`;
  void yui.offsetWidth;
  yui.style.transition = `left ${seconds}s linear`;
  yui.style.left = `${to}%`;
  yui.classList.toggle("go", seconds > 0.05);
  setTimeout(() => {
    if (turn !== walking || !yui.isConnected) return;
    yui.classList.remove("go");
    yuiX = to;
    then();
  }, seconds * 1000);
}

// ── 장면: 역과 거리 ─────────────────────────────────────────────────

function showScene() {
  const name = state.scene, scene = scenes[name];
  const seen = (spot) => (spot.gives ? page.has(state, spot.gives) : false);
  $("place").textContent = t(name);
  screen.innerHTML = `
    <div class="frame">
      <img class="on" data-view="main" src="art/${scene.art}.webp" alt="" draggable="false">
      ${scene.wrongArt ? `<img data-view="wrong" src="art/${scene.wrongArt}.webp" alt="" draggable="false">` : ""}
      ${scene.spots.map((spot) => `<button class="spot${seen(spot) ? " seen" : ""}${state.tried.includes(spot.exit) ? " tried" : ""}" data-spot="${spot.id}" aria-label="${spot.exit ? t("itemExit").replace(String(exits.right), spot.exit) : spot.id}"
        style="left:${spot.x}%;top:${spot.y}%;width:${spot.w}%;height:${spot.h}%">${spot.exit ? `<span class="plate">${spot.exit}</span>` : "<i></i>"}</button>`).join("")}
      <div class="walker${yuiRight ? " right" : ""}" style="left:${yuiX}%"></div>
      <div class="flash"></div>
    </div>
    ${talk(name === "station" ? "stationYui" : "streetYui")}
    ${name === "street" ? `<button class="shutter" data-do="shoot" aria-label="${t("itemPhoto")}"></button><button class="main" data-do="open">${t("openPage")}</button>` : ""}`;

  const frame = screen.querySelector(".frame");
  const view = (which) => { for (const image of frame.querySelectorAll("img")) image.classList.toggle("on", image.dataset.view === which); };
  // 그림의 빈 데를 누르면 그리로 걷기만 한다.
  frame.onclick = (event) => {
    if (event.target !== frame) return;
    const box = frame.getBoundingClientRect();
    walkTo(((event.clientX - box.left) / box.width) * 100, () => {});
  };
  for (const button of frame.querySelectorAll(".spot")) button.onclick = () => {
    const spot = scene.spots.find((one) => one.id === button.dataset.spot);
    walkTo(spot.x + spot.w / 2, () => (spot.exit ? leave(spot, button) : touch(spot, button)));
  };

  function touch(spot, button) {
    const fresh = spot.gives ? gain(spot.gives) : false;
    if (!fresh) tick(true);
    if (spot.gives) button.classList.add("seen");
    say(spot.say);
  }

  function leave(spot, button) {
    const result = page.tapExit(state, spot.exit, exits);
    if (result === "tried") return say("exitTried");
    if (result === "right") {
      ding(); showFound("exit");
      yuiX = 12; yuiRight = true;
      return render();
    }
    tick(true);
    button.classList.add("tried");
    say(result === "grandma" ? "exitWrongG" : "exitWrong", true);
    if (result !== "grandma") return;
    // 할머니가 나간 출구: 산 쪽 찻길이 잠깐 보이고 돌아 들어온다.
    frame.classList.add("busy"); view("wrong");
    setTimeout(() => { if (frame.isConnected) { view("main"); frame.classList.remove("busy"); } }, 2600);
  }

  on("shoot", () => {
    const flash = frame.querySelector(".flash");
    flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
    shutterSound();
    say(gain("photo") ? "shot" : "again");
  });
  on("open", () => {
    if (!page.has(state, "photo")) return say("needPhoto", true);
    state.scene = "page";
    render();
  });
}

// ── 수첩의 한 쪽 ────────────────────────────────────────────────────

// 눌러서 놓을 때의 첫 자리. 그 뒤에는 끌어서 옮긴다.
const HOME = { exit: [0.84, 0.1], photo: [0.5, 0.36], word: [0.3, 0.68], egg: [0.8, 0.7], clue: [0.42, 0.88] };

const PIECE = {
  exit: () => String(exits.right),
  photo: () => `<img src="art/${scenes.street.art}.webp" alt="" draggable="false">`,
  word: () => `<b>${t("itemWord")}</b><small>${t("itemWordSub")}</small>`,
  egg: () => t("itemEgg"),
  clue: () => t("clueNote"),
};

function showPage(fresh) {
  $("place").textContent = t("page");
  const placed = Object.entries(state.placed);
  const waiting = state.found.filter((id) => !(id in state.placed));
  screen.innerHTML = `
    <div class="sheet${state.pasted ? " done" : ""}">
      <p class="head hand">${t("pageHead")}</p><p class="date hand">${t("pageDate")}</p>
      ${placed.map(([id, at]) => `<div class="piece piece-${id}${id === "clue" ? " hand" : ""}${id === fresh ? " in" : ""}" data-id="${id}" style="left:${at.x * 100}%;top:${at.y * 100}%">${PIECE[id]()}</div>`).join("")}
    </div>
    ${state.pasted ? "" : `<div class="tray">${waiting.map((id) => `<button data-item="${id}">${t(itemKey(id))}</button>`).join("")}</div>
      ${talk(page.canPaste(state) ? "pageYui" : "pasteNeed")}
      <button class="main" data-do="paste" ${page.canPaste(state) ? "" : "disabled"}>${t("paste")}</button>`}
    ${state.pasted ? `<div class="reply hand"><h2>${t("replyHead")}</h2>${page.replyKeys(state).map((key) => `<p>${t(key)}</p>`).join("")}<p class="sign">${t("sign")}</p></div>` : ""}
    <button class="plain" data-do="again">${t("restart")}</button>`;

  const sheet = screen.querySelector(".sheet");
  for (const button of screen.querySelectorAll(".tray button")) button.onclick = () => {
    const id = button.dataset.item;
    if (page.place(state, id, ...HOME[id])) { tick(true); showPage(id); }
  };
  if (!state.pasted) for (const piece of sheet.querySelectorAll(".piece")) drag(piece, sheet);
  on("paste", () => { if (page.paste(state)) { ding(); showPage(); } });
  on("again", () => { query.delete("scene"); state = page.fresh(); yuiX = 50; yuiRight = true; render(); scrollTo(0, 0); });
}

// 놓인 것을 끌어 옮긴다. 쪽의 아래로 끌어내면 도로 내려놓는다.
function drag(piece, sheet) {
  const id = piece.dataset.id;
  let grab = null;
  const spot = (event) => {
    const box = sheet.getBoundingClientRect();
    return [(event.clientX - box.left) / box.width - grab[0], (event.clientY - box.top) / box.height - grab[1]];
  };
  piece.onpointerdown = (event) => {
    const box = sheet.getBoundingClientRect(), at = state.placed[id];
    grab = [(event.clientX - box.left) / box.width - at.x, (event.clientY - box.top) / box.height - at.y];
    piece.setPointerCapture(event.pointerId);
    piece.classList.add("drag");
  };
  piece.onpointermove = (event) => {
    if (!grab) return;
    const [x, y] = spot(event);
    piece.style.left = `${x * 100}%`; piece.style.top = `${y * 100}%`;
  };
  piece.onpointerup = piece.onpointercancel = (event) => {
    if (!grab) return;
    const [x, y] = spot(event);
    grab = null;
    piece.classList.remove("drag");
    // 쪽 안에 놓였으면 그 조각만 옮긴다. 화면을 다시 그리면 사진이 깜빡인다.
    if (y > 1.03) { page.unplace(state, id); return showPage(); }
    page.place(state, id, x, y);
    const at = state.placed[id];
    piece.style.left = `${at.x * 100}%`; piece.style.top = `${at.y * 100}%`;
  };
}

// ── 틀 ──────────────────────────────────────────────────────────────

function on(name, handler) {
  const button = screen.querySelector(`[data-do=${name}]`);
  if (button) button.onclick = handler;
}

function render() {
  showFound();
  $("note").textContent = t("note");
  document.title = `Korea Oddity — ${t("title")}`;
  if (state.scene === "page") showPage(); else showScene();
}

render();
