// 할머니의 수첩, 걷는 틀: 공항 → 서울역 → 명동. 본보기는 Dordogne(2023)다: 엷은 수채의 장면 속의 것을 직접 누르고,
// 모은 것으로 수첩의 한 쪽을 손수 꾸민다. 움직임은 Until Then(2024)을 따른다: 장면은 옆에서 본 긴 그림이고,
// 유이가 옆모습으로 좌우로 걸으면 화면이 따라간다. 누른 곳까지 걸어가서 만진다.
// 걸음의 차례와 돈의 셈은 docs/trip/core/trip.js, 요금은 docs/trip/data/fares.json, 글은 docs/trip/i18n.js 와 text.js,
// 모은 것의 셈은 core/page.js, 누를 곳의 자리는 scenes.json 에 있다. 여기는 화면만 놓는다.
// 주소에 ?lang=ja 로 말을, ?step=gates(&route=express, &pay=single)로 시작하는 걸음을 고른다.

import * as trip from "../trip/core/trip.js";
import * as page from "./core/page.js";
import { LANGS, LANG_KEY, pickLang, translate as baseText } from "../trip/i18n.js";
import { TEXT as EXTRA } from "./text.js";
import { textSizeFrom, nextTextSize, canResize } from "./core/textSize.js";
import { shutter as shutterSound, click as tick, ding } from "../compare/ui/sound.js";

const scenes = await (await fetch("scenes.json")).json();
const fares = await (await fetch("../trip/data/fares.json")).json();
const query = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const screen = $("screen");

// localStorage 에 손대는 것조차 막힌 브라우저가 있다. 그때는 저장 없이 논다.
let storage = null;
try { storage = globalThis.localStorage; } catch { /* 저장 없이 */ }

let lang = pickLang(storage, navigator.language ?? "");
const fill = (text, values = {}) => text.replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole));
const t = (key, values, to = lang) => (EXTRA[to]?.[key] !== undefined ? fill(EXTRA[to][key], values) : baseText(to, key, values));
const W = (amount, to = lang) => trip.won(amount, to);
const station = (id, to = lang) => t(`st_${id}`, undefined, to);
const date = fares.checked.replaceAll("-", ".");
const mdDate = fares.subway.checked.replaceAll("-", ".");
const star = (ok) => (ok ? "" : ' <span class="star">＊</span>');

const SOUND_KEY = "koreaoddity.trip.sound";
const TEXT_KEY = "koreaoddity.textSize";
let soundOn = true;
try { soundOn = storage?.getItem(SOUND_KEY) !== "off"; } catch { /* 켜 둔다 */ }
const play = (fn, ...args) => { if (soundOn) fn(...args); };

// ── 저장 ────────────────────────────────────────────────────────────

// 걸음(trip)과 모은 것(album)을 한 열쇠 아래에 둔다. 걸음의 꼴은 docs/trip 의 저장과 같아 그쪽의 load 로 읽는다.
const KEY = "koreaoddity.water.v1";
let state, album;
function load() {
  try {
    const saved = JSON.parse(storage?.getItem(KEY));
    if (saved?.version === 1) {
      state = trip.load({ getItem: (key) => (key === trip.KEY ? JSON.stringify(saved.trip) : null) });
      album = page.restore(saved.album);
      return;
    }
  } catch { /* 새로 시작한다 */ }
  state = trip.fresh();
  album = page.freshAlbum();
}
function keep() {
  if (jumped) return;   // ?step= 으로 열어 본 것은 저장하지 않는다. 하던 놀이의 기록을 덮지 않는다.
  try { storage?.setItem(KEY, JSON.stringify({ version: 1, trip: state, album })); } catch { /* 이번에만 */ }
}

// 주소의 ?step= 으로 어느 걸음부터든 열어 본다. 그 걸음에 닿으려면 있어야 할 것(길, 표, 모은 것)을 채워 준다.
function jump(step) {
  let s = trip.fresh();
  const a = page.freshAlbum();
  s.route = query.get("route") === "express" ? "express" : "allstop";
  s.pay = s.route === "allstop" ? (query.get("pay") === "single" ? "single" : "card") : null;
  const md = step.startsWith("md");
  if (md || ["gates", "platform", "ride", "refund", "arrive", "paste"].includes(step)) {
    s.ticket = true;
    s.charge = fares.card.charges[0];
    page.collect(a.icn, "icn", "ticket");
  }
  if (step === "paste" || md) { for (const id of page.ITEMS.icn) page.collect(a.icn, "icn", id); s.shot = true; }
  if (md) {
    s.pasted = true;
    s = trip.enterMyeongdong(s);
    if (!s.md.carried && !["mdPage", "mdPay", "mdStore", "mdMachine"].includes(step)) { s.md.pay = "single"; s.md.ticket = true; }
    if (step === "mdStore") s.md.pay = "card";
    if (step === "mdMachine") s.md.pay = "single";
    if (["mdShoot", "mdEat", "mdPaste"].includes(step)) page.collect(a.md, "md", "exit");
    if (step === "mdPaste") { for (const id of page.ITEMS.md) page.collect(a.md, "md", id); s.md.shot = s.md.ate = true; }
  }
  s.step = step;
  state = s; album = a;
}
const jumped = trip.STEPS.includes(query.get("step"));
if (jumped) jump(query.get("step")); else load();

const kind = () => (state.step.startsWith("md") ? "md" : "icn");
const pg = () => album[kind()];

function go(step = trip.nextStep(state)) {
  state.step = step;
  closeup = false;
  keep();
  render();
  scrollTo(0, 0);
}

// 화면을 다시 그린 뒤에는 앞 화면이 걸어 둔 시계가 아무 일도 하지 않는다.
let drawn = 0;
function later(ms, fn) {
  const mine = drawn;
  setTimeout(() => { if (mine === drawn) fn(); }, ms);
}

// ── 지갑과 모은 것 ──────────────────────────────────────────────────

function showWallet() {
  const { spent, balance, hasCard } = trip.totals(state, fares);
  $("wallet").innerHTML = `${t("spent")} <b>${W(spent)}</b>${hasCard ? `<br>${t("cardLeft")} ${W(balance)}` : ""}`;
}

const itemKey = (id) => `item${id[0].toUpperCase()}${id.slice(1)}`;
function showFound(fresh) {
  const on = (id) => page.has(pg(), id);
  $("found").innerHTML = page.ITEMS[kind()].map((id) =>
    `<span data-item="${id}" class="${on(id) ? "on" : ""}${id === fresh ? " new" : ""}" title="${t(itemKey(id))}">${on(id) ? "✓" : ""}</span>`).join("");
}
function gain(id) {
  if (!page.collect(pg(), kind(), id)) return false;
  keep();
  play(ding);
  showFound(id);
  return true;
}

// ── 유이의 말 ───────────────────────────────────────────────────────

function say(key, warn = false, values) {
  const bubble = screen.querySelector(".yui");
  if (!bubble) return;
  bubble.textContent = t(key, values);
  bubble.className = warn ? "yui warn" : "yui";
  void bubble.offsetWidth;   // 같은 말을 또 해도 떠오르는 움직임이 다시 돈다
  bubble.classList.add("in");
}
const talk = (key, values) => `<div class="talk"><img class="face" src="art/yui-stand.png" alt=""><p class="yui in">${t(key, values)}</p></div>`;

// ── 걷기 ────────────────────────────────────────────────────────────

const SPEED = 55;        // 한 초에 틀 너비의 몇 %를 걷는가
const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
let yuiX = 50, yuiRight = true, walking = 0, lastScene = null;   // yuiX 는 긴 그림 너비의 %

// 화면이 유이를 따라간다. 유이를 틀의 가운데에 두되 긴 그림의 끝에서는 멈춘다. 돌려주는 값은 화면이 어디쯤인가(0 왼쪽 끝 → 1 오른쪽 끝)다.
function follow() {
  const yui = screen.querySelector(".walker");
  if (!yui) return 0.5;
  const world = yui.parentElement, frame = world.parentElement;
  const wide = world.offsetWidth, room = wide - frame.clientWidth;
  const at = clamp((yuiX / 100) * wide - frame.clientWidth / 2, 0, Math.max(0, room));
  yui.style.left = `${yuiX}%`;
  world.style.transform = `translateX(${-at}px)`;
  frame.classList.toggle("more-left", at > 2);
  frame.classList.toggle("more-right", at < room - 2);
  const where = room > 0 ? at / room : 0.5;
  for (const layer of frame.querySelectorAll("[data-depth]")) layer.style.left = `${-(layer.dataset.wide - 100) * where}%`;
  return where;
}

// 유이가 긴 그림 너비의 x% 자리까지 걸어간 뒤 then 을 부른다. 걷는 중에 다른 곳을 누르면 그쪽으로 돌아선다.
function walkTo(x, then) {
  const yui = screen.querySelector(".walker");
  if (!yui) return then();
  const world = yui.parentElement, frame = world.parentElement;
  const to = clamp(x, 4, 96), turn = (walking += 1);
  if (Math.abs(to - yuiX) > 0.5) yuiRight = to > yuiX;
  yui.classList.toggle("right", yuiRight);   // 옆모습의 그림은 왼쪽을 본다
  yui.classList.add("go");
  let last = performance.now();
  const step = (now) => {
    if (turn !== walking || !yui.isConnected) return;
    const move = ((SPEED * frame.clientWidth) / world.offsetWidth) * ((now - last) / 1000), gap = to - yuiX;
    last = now;
    if (Math.abs(gap) <= move) {
      yuiX = to; follow();
      yui.classList.remove("go");
      return then();
    }
    yuiX += Math.sign(gap) * move; follow();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── 장면 ────────────────────────────────────────────────────────────

// 겹(시차). 장면에 먼 겹 far 와 앞의 겹 near 가 있으면 가운데의 긴 그림과 다른 빠르기로 밀린다.
// tall 은 틀 높이의 몇 배로 놓는가, ratio 는 그림의 가로 / 세로, rise 는 틀의 위로 얼마나 올리는가(%), drop 은 틀의 아래로 얼마나 내리는가(%)다.
// 틀보다 넓은 만큼만 밀리므로 좁은 겹(먼 산)은 천천히, 넓은 겹(앞의 나무)은 빨리 지나간다.
const DEPTH = { far: { tall: 1.25, ratio: 1.5, rise: 22 }, near: { tall: 1.2, ratio: 3, drop: 20 } };
const flat = query.has("flat");   // ?flat 이면 겹을 쓰지 않는 앞의 그림으로 연다(견주어 보기)
const sceneName = (name) => (!flat && scenes[`${name}3`] ? `${name}3` : name);
// 겹 하나를 놓는 자리. at 은 화면이 긴 그림의 어디쯤인가(0 → 1), box 는 틀의 가로 / 세로다.
function layerBox(depth, at, box = 1) {
  const d = DEPTH[depth] ?? { tall: 1, ratio: 3 };
  const wide = (d.tall * d.ratio * 100) / box;
  const edge = d.drop ? `top:auto;bottom:${-d.drop}%` : `top:${-(d.rise ?? 0)}%;bottom:auto`;
  return { wide, style: `position:absolute;right:auto;${edge};left:${-(wide - 100) * at}%;width:${wide}%;height:${d.tall * 100}%;object-fit:fill` };
}
// 사진과 작은 그림: 긴 그림의 at 자리를 겹까지 포개어 보인다.
function sceneView(scene, at, box = 1) {
  const one = (depth, art) => (art ? `<img src="art/${art}.webp" alt="" draggable="false" style="${layerBox(depth, at, box).style}">` : "");
  return `<div class="view" style="aspect-ratio:${box}">${one("far", scene.far)}${one("mid", scene.art)}${one("near", scene.near)}</div>`;
}

// 긴 그림 하나를 놓고 유이를 세운다. acts 는 누를 곳마다 걸어가서 할 일, marks 는 누를 곳 위에 붙일 것이다
// ({ plate 번호판, label 과 sub 안내판의 글, seen 얻을 것을 다 얻었다, off 가 본 틀린 곳 }). bare 면 누를 곳을 놓지 않는다.
function showScene(name, { title, first, values, acts = {}, marks = {}, bare = false, below = "" }) {
  name = sceneName(name);
  const scene = scenes[name];
  if (lastScene !== name) { yuiX = scene.start; yuiRight = scene.start < 50; lastScene = name; }
  $("place").textContent = t(title);
  const mark = (spot) => {
    const m = marks[spot.id] ?? {};
    const inner = m.plate !== undefined ? `<span class="plate">${m.plate}</span>`
      : m.label ? `<span class="sign">${m.label}${m.sub ? `<small>${m.sub}</small>` : ""}</span>` : "<i></i>";
    return `<button class="spot${m.seen ? " seen" : ""}${m.off ? " tried" : ""}" data-spot="${spot.id}" aria-label="${m.name ?? spot.id}"
      style="left:${spot.x}%;top:${spot.y}%;width:${spot.w}%;height:${spot.h}%">${inner}</button>`;
  };
  // 겹의 그림과, 그 겹에 붙은 누를 곳을 담는 판. 판은 걷는 바닥보다 위에 놓여야 눌린다.
  const layer = (depth) => { const box = layerBox(depth, 0); return `<img class="on" data-view="main" data-depth="${depth}" data-wide="${box.wide}" src="art/${scene[depth]}.webp" alt="" draggable="false" style="${box.style}">`; };
  const hot = (depth) => { const box = layerBox(depth, 0); return `<div class="hot" data-depth="${depth}" data-wide="${box.wide}" style="${box.style}">${scene.spots.filter((spot) => spot.layer === depth).map(mark).join("")}</div>`; };
  screen.innerHTML = `
    <div class="frame walk">
      ${scene.far ? layer("far") : ""}
      <div class="world" style="aspect-ratio:${scene.wide} / 1">
        <img class="on" data-view="main" src="art/${scene.art}.webp" alt="" draggable="false">
        ${bare ? "" : scene.spots.filter((spot) => !spot.layer).map(mark).join("")}
        <div class="walker${yuiRight ? " right" : ""}" style="left:${yuiX}%"></div>
      </div>
      ${scene.far && !bare ? hot("far") : ""}${scene.near ? layer("near") : ""}${scene.near && !bare ? hot("near") : ""}
      ${scene.wrongArt ? `<img data-view="wrong" src="art/${scene.wrongArt}.webp" alt="" draggable="false">` : ""}
      <div class="flash"></div>
    </div>
    ${talk(first, values)}${below}`;

  const frame = screen.querySelector(".frame"), world = frame.querySelector(".world");
  follow();
  const view = (which) => { for (const image of frame.querySelectorAll("img")) image.classList.toggle("on", image.dataset.view === which); };
  const shake = () => { frame.classList.remove("shake"); void frame.offsetWidth; frame.classList.add("shake"); };

  // 누르고 있으면 화면이 밀려도 손가락 쪽으로 계속 걷는다. 긴 그림의 끝까지 한 번에 간다.
  let held = null, timer = 0;
  const toward = () => {
    const box = world.getBoundingClientRect();
    walkTo(((held - box.left) / box.width) * 100, () => {});
  };
  const release = () => { held = null; clearInterval(timer); };
  world.onpointerdown = (event) => {
    if (event.target !== world) return;
    held = event.clientX;
    toward();
    clearInterval(timer);
    timer = setInterval(() => (world.isConnected && held !== null ? toward() : release()), 200);
  };
  world.onpointermove = (event) => { if (held !== null) held = event.clientX; };
  world.onpointerup = world.onpointercancel = world.onpointerleave = release;

  for (const button of frame.querySelectorAll(".spot")) button.onclick = () => {
    const spot = scene.spots.find((one) => one.id === button.dataset.spot);
    const box = world.getBoundingClientRect(), hit = button.getBoundingClientRect();
    walkTo(((hit.left + hit.width / 2 - box.left) / box.width) * 100, () => {
      const act = acts[spot.id];
      if (act) return act({ spot, button, frame, view, shake });
      if (spot.say) { play(tick, true); say(spot.say); }
    });
  };
  return { frame, view, shake };
}

// 긴 그림에서 누를 곳 하나만 잘라 보인다. 편의점이나 기계 앞에 선 화면의 머리에 쓴다.
function still(name, id) {
  const scene = scenes[name], spot = scene.spots.find((one) => one.id === id);
  const centre = spot ? spot.x + spot.w / 2 : 50, part = 150 / scene.wide;   // 틀(3:2)에 들어오는 너비의 %
  const at = clamp((centre - part / 2) / (100 - part), 0, 1) * 100;
  return `<div class="frame"><img class="on" src="art/${scene.art}.webp" alt="" draggable="false" style="object-position:${at}% 50%"></div>`;
}
const picture = (name) => `<div class="frame"><img class="on" src="art/${name}.webp" alt="" draggable="false"></div>`;

// 사진기 단추와 수첩 펴기. 찍으면 지금 화면에 보이는 데가 사진에 담긴다. 다시 찍으면 사진이 바뀐다.
const cameraTools = () => `<button class="shutter" data-do="shoot" aria-label="${t("shutter")}"></button><button class="main" data-do="open">${t("openPage")}</button>`;
function camera(onShot, onOpen) {
  on("shoot", () => {
    const flash = screen.querySelector(".flash");
    flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
    play(shutterSound);
    pg().shotAt = follow();
    onShot(page.spotOf(pg().shotAt));
    if (!gain("photo")) keep();
    say("shot");
  });
  on("open", () => (page.has(pg(), "photo") ? onOpen() : say("needPhoto", true)));
}

// ── 걸음마다의 화면 ──────────────────────────────────────────────────

let closeup = false;   // 직통 표의 창구 앞에 섰는가. 저장하지 않는다.

const SCREENS = {
  // ── 첫 쪽: 공항 → 서울역 ──────────────────────────────────────────

  intro() {
    showScene("arrivals", { title: "introPlace", first: "yuiIntro", bare: true, below: `
      <div class="paper letter hand">
        <figure class="old"><img src="art/photo-2004.webp" alt="" draggable="false"><figcaption class="hand">典子, 2004.10</figcaption></figure>
        <p class="then">${t("photoThen")}</p>
        <p>${t("letter1")}</p><p>${t("letter2")}</p><p>${t("letter3")}</p><p>${t("letter4")}</p>
        <p class="sign">${t("sign")}</p>
      </div>
      <button class="main" data-do="next">${t("openFirst")}</button>` });
    on("next", () => go());
  },

  page() {
    $("place").textContent = t("pageTitle");
    screen.innerHTML = `${grandmaPage()}<button class="main" data-do="next">${t("chooseRoute")}</button>`;
    on("next", () => go());
  },

  route() {
    const a = fares.allstop, e = fares.express;
    $("place").textContent = t("routeTitle");
    screen.innerHTML = `
      <div class="cards">
        <article class="card blue">
          <h2>${t("allstopName")}</h2>
          <div class="price">${W(a.card)}</div>
          <ul class="facts">
            <li>${t("byCard", { won: W(a.card) })}</li>
            <li>${t("about", { n: a.minutes })}${star(a.verified.minutes)} · ${t("stops", { n: fares.stations.allstop.length })}</li>
            <li>${t("allstopNote", { extra: W(a.singleExtra) })}</li>
          </ul>
          <button data-route="allstop">${t("pickThis")}</button>
        </article>
        <article class="card orange">
          <span class="tag">${t("grandmaWent")}</span>
          <h2>${t("expressName")}</h2>
          <div class="price">${W(e.adult)}</div>
          <ul class="facts">
            <li>${t("oneTicket", { won: W(e.adult) })}</li>
            <li>${t("exactly", { n: e.minutes })} · ${t("nonstop")}</li>
            <li>${t("expressNote")}</li>
          </ul>
          <button data-route="express">${t("pickThis")}</button>
        </article>
      </div>
      <p class="note">${t("asOf", { date })}<br><span class="star">＊</span> ${t("unverified")}</p>`;
    for (const button of screen.querySelectorAll("[data-route]")) button.onclick = () => { state.route = button.dataset.route; go(); };
  },

  // 입국장에서 기차의 표지판을 찾아 걸어간다. 타는 곳과 표 사는 곳이 모두 지하 1층 교통센터에 있다.
  signs() {
    const miss = (key) => () => { state.signMisses += 1; keep(); play(tick, true); say(key, true); };
    showScene("arrivals", { title: "signsTitle", first: "signsAsk",
      marks: { bus: { name: t("signBus"), seen: page.has(album.icn, "note") }, taxi: { name: t("signTaxi"), seen: true }, train: { name: t("signTrain") } },
      acts: {
        bus: ({ button }) => { state.signMisses += 1; if (!gain("note")) { keep(); play(tick, true); } button.classList.add("seen"); say("signBusSay", true); },
        taxi: miss("signTaxiSay"),
        train: ({ frame }) => {
          gain("word"); say("trainWord");
          frame.classList.add("busy");
          later(2200, () => go());
        },
      } });
  },

  // 지하 1층. 편의점(교통카드), 기계(1회용), 주황 창구(직통 표)까지 걸어가서 산다.
  pay() { showB1("payAsk", {
    store: () => { state.pay = "card"; go(); },
    machine: () => { state.pay = "single"; go(); },
    counter: () => { play(tick, true); say("counterNo", true); },
  }, payMemo()); },

  expressTicket() {
    if (closeup || state.ticket) return expressCounter();
    showB1("expressAsk", {
      store: () => { play(tick, true); say("expressOnly", true); },
      machine: () => { play(tick, true); say("expressOnly", true); },
      counter: () => { closeup = true; render(); },
    });
  },

  // 편의점. 공항에서도, 서울역에서도 같은 화면이다. target 은 산 것을 적을 곳이다.
  store({ target = state, nextKey = "toGates", scene = "b1", back = "pay" } = {}) {
    const c = fares.card;
    let charge = c.charges[0];
    $("place").textContent = t("storeTitle");
    const draw = () => {
      screen.innerHTML = `
        ${still(scene, "store")}
        ${talk(target.ticket ? "storeDone" : "storeAsk")}
        ${target.ticket ? `<button class="main" data-do="next">${t(nextKey)}</button>` : `
        <div class="panel">
          <div class="row"><span>${t("storeCard", { price: W(c.price) })}${star(c.verified.price)}</span></div>
          <div class="row"><span>${t("storeCharge")}</span>
            <span class="choices">${c.charges.map((amount) => `<button data-charge="${amount}" class="${amount === charge ? "on" : ""}">${W(amount)}</button>`).join("")}</span></div>
        </div>
        <button class="main" data-do="buy">${t("storePay", { won: W(c.price + charge) })}</button>
        <button class="plain" data-do="back">${t("back")}</button>
        <p class="note"><span class="star">＊</span> ${t("unverified")}</p>`}`;
      for (const button of screen.querySelectorAll("[data-charge]")) button.onclick = () => { charge = Number(button.dataset.charge); play(tick); draw(); };
      on("buy", () => { target.charge = charge; target.ticket = true; if (target === state) page.collect(album.icn, "icn", "ticket"); keep(); play(ding); showWallet(); showFound("ticket"); draw(); });
      on("back", () => { target.pay = null; go(back); });
      on("next", () => go());
    };
    draw();
  },

  // 1회용 교통카드 발매기. 기계는 한국어로 켜져 있다. 말을 바꾸는 단추를 찾는 것이 첫 배움이다(기획서 3절의 9).
  // dests 는 [역, 1회용의 값]의 줄, right 는 수첩에 적힌 역이다.
  machine({ dests = Object.entries(fares.allstop.to).map(([id, fare]) => [id, fare + fares.allstop.singleExtra]), right = "seoul",
    deposit = fares.allstop.deposit, wrongKey = "mWrongDest", target = state, back = "pay" } = {}) {
    let speak = "ko", phase = "dest", inserted = 0, wrong = false;
    const total = Object.fromEntries(dests)[right] + deposit;
    const m = (key, values) => t(key, values, speak);
    $("place").textContent = t("machineTitle");
    const draw = () => {
      const body = phase === "dest" ? `
          <h2>${m("mDest")}</h2>
          <div class="dests">${dests.map(([id, price]) => `<button data-dest="${id}">${station(id, speak)}<small>${W(price, speak)}</small></button>`).join("")}</div>`
        : `
          <h2>${station(right, speak)} · ${m("mCount")}</h2>
          <div class="sum">${m("mTotal", { won: W(total, speak) })}</div>
          <div class="sub">${m("mDeposit", { deposit: W(deposit, speak) })}</div>
          ${inserted < total ? `<div class="sub">${m("mInsert")}</div>
          <div class="bills">${[1000, 5000, 10000].map((bill) => `<button data-bill="${bill}">${W(bill, speak)}</button>`).join("")}</div>` : ""}
          <div class="sub">${m("mInserted", { won: W(inserted, speak) })}</div>
          ${inserted >= total ? `<div class="sum">${m("mChange", { won: W(inserted - total, speak) })}</div><button class="take" data-do="take">${m("mTake")}</button>` : ""}`;
      screen.innerHTML = `
        <div class="machine">
          <div class="band"></div>
          <div class="display">
            <div class="head"><button data-do="reset">${m("mBack")}</button>
              <span class="langs">${fares.machine.languages.map((code) => `<button data-speak="${code}" class="${code === speak ? "on" : ""}">${{ ko: "한국어", en: "English", ja: "日本語", zh: "中文" }[code]}</button>`).join("")}</span></div>
            ${body}
          </div>
          <div class="slot"></div>
        </div>
        ${talk(wrong ? wrongKey : speak === lang ? "machineYuiOk" : "machineYui")}
        <button class="plain" data-do="back">${t("back")}</button>`;
      if (wrong) screen.querySelector(".yui").classList.add("warn");
      for (const button of screen.querySelectorAll("[data-speak]")) button.onclick = () => { speak = button.dataset.speak; wrong = false; play(tick); draw(); };
      for (const button of screen.querySelectorAll("[data-dest]")) button.onclick = () => {
        wrong = button.dataset.dest !== right;
        if (!wrong) phase = "pay";
        play(tick);
        draw();
      };
      for (const button of screen.querySelectorAll("[data-bill]")) button.onclick = () => { inserted += Number(button.dataset.bill); play(tick, true); draw(); };
      on("reset", () => { phase = "dest"; inserted = 0; wrong = false; draw(); });
      on("back", () => { target.pay = null; go(back); });
      on("take", () => { target.ticket = true; if (target === state) page.collect(album.icn, "icn", "ticket"); play(ding); go(); });
    };
    draw();
  },

  // 개찰구. 지하 1층의 같은 긴 그림에서 파란 쪽과 주황 쪽을 고른다. 할머니가 헤맨 곳이다.
  gates() {
    const done = () => { play(tick, true); say("haveTicket"); };
    const gate = (color) => ({ frame, shake }) => {
      if (trip.gateOpens(state, color)) {
        say("gateOk"); play(ding);
        frame.classList.add("busy");
        return later(900, () => go());
      }
      // 문이 안 열리고 돌아 나온다. 돈은 들지 않는다.
      state.gateMisses += 1; keep();
      say(color === "blue" ? "gateWrongBlue" : "gateWrongOrange", true);
      shake(); play(tick, true);
    };
    showB1("gatesAsk", { store: done, machine: done, counter: done, gateBlue: gate("blue"), gateOrange: gate("orange") }, ticketChip(state));
  },

  platform() {
    const express = state.route === "express";
    showScene("platform", { title: "platformTitle", first: "platformAsk", marks: { door: { name: t("board") } },
      acts: { door: ({ frame }) => {
        say(express ? "platformExpress" : "platformAllstop"); play(ding);
        frame.classList.add("busy");
        later(1600, () => go());
      } } });
  },

  ride({ stops, seconds, line, title, art, yuiKey } = airportRide()) {
    $("place").textContent = title;
    screen.innerHTML = `
      <div class="ride" style="--ride:${seconds}s;--line:var(--${line})">
        ${picture(art)}
        <div class="rail">
          <i class="track"></i>
          ${stops.map((id, i) => `<i class="stop${i === 0 || i === stops.length - 1 ? " end" : ""}" style="left:${(i / (stops.length - 1)) * 100}%"></i>`).join("")}
          <i class="train"></i>
          <div class="ends"><span>${station(stops[0])}</span><span>${station(stops.at(-1))}</span></div>
        </div>
        <p class="now"></p>
        ${talk(yuiKey)}
        <p class="note">${t("skip")}</p>
      </div>`;
    const now = screen.querySelector(".now");
    const began = performance.now();
    let done = false;
    const finish = () => { if (!done) { done = true; go(); } };
    // 지금 지나는 역의 이름. 역마다 눈금 소리가 난다.
    let last = -1;
    const step = () => {
      if (done || !now.isConnected) return;
      const k = Math.min(1, (performance.now() - began) / (seconds * 1000));
      const at = Math.round(k * (stops.length - 1));
      if (at !== last) { last = at; now.textContent = station(stops[at]); if (at > 0) play(tick, at === stops.length - 1); }
      if (k >= 1) return void later(700, finish);
      requestAnimationFrame(step);
    };
    step();
    later(seconds * 1000 + 1500, finish);   // 화면이 가려져 그리기가 멈춰도 넘어간다
    screen.querySelector(".ride").onclick = finish;
  },

  refund({ target = state, amount = fares.allstop.deposit } = {}) {
    const deposit = W(amount);
    $("place").textContent = t("refundTitle");
    screen.innerHTML = `
      <div class="machine"><div class="band"></div>
        <div class="display" style="min-height:120px"><h2>${t("refundTitle")}</h2><div class="sub">${t("refundText", { deposit })}</div></div>
        <div class="slot"></div></div>
      <div class="talk" hidden><img class="face" src="art/yui-stand.png" alt=""><p class="yui in"></p></div>
      <button class="main" data-do="refund">${t("refundDo")}</button>
      <button class="plain" data-do="skip">${t("refundSkip")}</button>`;
    on("refund", () => {
      target.refunded = true;
      if (target === state) page.collect(album.icn, "icn", "coin");
      keep(); showWallet(); showFound("coin"); play(ding);
      screen.querySelector(".talk").hidden = false;
      say("refundYui", false, { deposit });
      for (const button of screen.querySelectorAll("button")) button.disabled = true;
      later(1300, () => go());
    });
    on("skip", () => { target.refunded = false; go(); });
  },

  // 서울역 앞 광장. 걸어 다니며 자리를 잡고 한 장 찍는다. 광장 한가운데가 할머니가 찍은 자리다.
  arrive() {
    showScene("plaza", { title: "arriveTitle", first: "plazaYui", marks: { old: { seen: true } }, below: cameraTools() });
    camera((spot) => { state.spot = spot; state.shot = true; }, () => go());
  },

  paste() { compose("icn"); },

  // ── 둘째 쪽: 서울역 → 명동 ────────────────────────────────────────

  mdPage() {
    $("place").textContent = t("mdPlace");
    screen.innerHTML = `${mdGrandmaPage()}${talk(state.md.carried ? "mdYuiCarried" : "mdYuiNoCard")}
      <button class="main" data-do="next">${t("mdStart")}</button>${mdNote()}`;
    on("next", () => go());
  },

  mdPay() {
    const s = fares.subway, c = fares.card;
    showScene("subway", { title: "subwayTitle", first: "subwayAsk",
      marks: { store: { name: t("storeTitle") }, machine: { name: t("machineTitle") }, map: { seen: true }, gate: { name: t("gatesTitle") } },
      acts: {
        store: () => { state.md.pay = "card"; go(); },
        machine: () => { state.md.pay = "single"; go(); },
        gate: () => { play(tick, true); say("needTicket", true); },
      },
      below: `<ul class="memo">
        <li><b>${t("payCard")}</b>${t("mdCardNote", { price: W(c.price), fare: W(s.card) })}${star(c.verified.price)}</li>
        <li><b>${t("paySingle")}</b>${t("mdSingleNote", { single: W(s.single), deposit: W(s.deposit) })} <em>${t("grandmaWent")}</em></li>
      </ul><p class="note">${t("mdAsOf", { date: mdDate })}<br><span class="star">＊</span> ${t("unverified")}</p>` });
  },

  mdStore() { SCREENS.store({ target: state.md, nextKey: "mdToPlatform", scene: "subway", back: "mdPay" }); },

  mdMachine() {
    const s = fares.subway;
    SCREENS.machine({ dests: s.machineDests.map((id) => [id, s.single]), right: s.stops.at(-1), deposit: s.deposit, wrongKey: "mdWrongDest", target: state.md, back: "mdPay" });
  },

  // 개찰구 안. 계단 둘이 승강장으로 내려간다. 반대쪽을 타면 한 정거장 갔다가 돌아온다. 돈은 더 들지 않는다.
  mdDirection() {
    const s = fares.subway, tried = album.md.tried;
    const toward = (ids) => t("dirToward", { a: station(ids[0]), b: station(ids[1]) });
    const next = (id) => t("dirNext", { station: station(id) });
    showScene("stairs", { title: "dirTitle", first: "dirAsk",
      marks: {
        down: { label: `← ${toward(s.opposite)}`, sub: next(s.oppositeNext), off: tried.includes("down"), name: toward(s.opposite) },
        up: { label: `${toward(s.toward)} →`, sub: next(s.stops[1]), name: toward(s.toward) },
        map: { seen: true }, vending: { seen: true },
      },
      acts: {
        up: ({ frame }) => {
          say("dirOk", false, { station: station(s.stops[1]) }); play(ding);
          frame.classList.add("busy");
          later(1300, () => go());
        },
        down: ({ button }) => {
          if (tried.includes("down")) return say("dirTried");
          tried.push("down"); state.md.dirMisses += 1; keep();
          button.classList.add("tried"); play(tick, true);
          say("dirWrong", true, { station: station(s.oppositeNext) });
        },
      },
      below: ticketChip(state.md, "sky") });
  },

  mdRide() {
    const s = fares.subway;
    SCREENS.ride({ stops: s.stops, seconds: 4, line: "sky", title: `${t("mdRideTitle")} · ${t("exactly", { n: s.minutes })}`, art: "ride-line4", yuiKey: "mdRideYui" });
  },

  mdRefund() { SCREENS.refund({ target: state.md, amount: fares.subway.deposit }); },

  // 출구 고르기. 할머니가 헤맨 곳이다. 할머니가 나간 출구로 가면 산 쪽 찻길이 나오고 돌아 들어온다.
  mdExit() {
    const x = fares.myeongdong.exits, tried = album.md.tried;
    const leave = (n) => ({ button, frame, view }) => {
      if (trip.exitRight(n, fares)) { gain("exit"); return go(); }
      if (tried.includes(n)) return say("exitTried");
      tried.push(n); state.md.exitMisses += 1; keep();
      play(tick, true);
      button.classList.add("tried");
      say(n === x.grandma ? "exitWrongG" : "exitWrong", true);
      if (n !== x.grandma) return;
      frame.classList.add("busy"); view("wrong");
      later(2600, () => { view("main"); frame.classList.remove("busy"); });
    };
    const marks = { board: { seen: page.has(album.md, "word") }, shop: { seen: true } }, acts = {};
    for (const spot of scenes.station.spots.filter((one) => one.exit)) {
      marks[spot.id] = { plate: spot.exit, off: tried.includes(spot.exit), name: t("exitN", { n: spot.exit }) };
      acts[spot.id] = leave(spot.exit);
    }
    acts.board = ({ button }) => { if (!gain("word")) play(tick, true); button.classList.add("seen"); say("board"); };
    showScene("station", { title: "station", first: "stationYui", marks, acts, below: mdNote() });
  },

  // 명동 거리. 둘러보고, 찍고, 먹는다. 차례는 없다. 사진을 찍어야 수첩을 편다.
  mdShoot() {
    const m = state.md;
    showScene("street", { title: "street", first: "streetYui",
      marks: { tower: { seen: page.has(album.md, "clue") }, cart: { seen: page.has(album.md, "egg") }, tree: { seen: true } },
      acts: {
        tower: ({ button }) => { if (!gain("clue")) play(tick, true); button.classList.add("seen"); say("tower"); },
        cart: ({ button }) => { m.ate = true; if (!gain("egg")) { keep(); play(tick, true); } button.classList.add("seen"); say("cart"); },
      },
      below: cameraTools() });
    camera((spot) => { m.spot = spot; m.shot = true; state.step = "mdEat"; }, () => go("mdPaste"));
  },

  mdPaste() { compose("md"); },
};
SCREENS.done = SCREENS.paste;
SCREENS.mdEat = SCREENS.mdShoot;
SCREENS.mdDone = SCREENS.mdPaste;

// 지하 1층 교통센터. 표를 살 때와 개찰구를 고를 때 같은 긴 그림에 선다.
function showB1(first, acts, below = "") {
  const none = () => { play(tick, true); say("needTicket", true); };
  showScene("b1", { title: "b1Title", first,
    marks: { store: { name: t("storeTitle") }, machine: { name: t("machineTitle") }, counter: { name: t("expressTitle") },
      gateBlue: { name: t("gateBlue") }, gateOrange: { name: t("gateOrange") } },
    acts: { gateBlue: none, gateOrange: none, ...acts }, below });
}

// 직통 표의 창구 앞.
function expressCounter() {
  const e = fares.express;
  $("place").textContent = t("expressTitle");
  screen.innerHTML = `
    ${still("b1", "counter")}
    <div class="panel orange">
      <div class="row"><span>${t("expressPlace")}</span></div>
      <div class="row"><span>${t("expressBuy", { won: W(e.adult) })}</span></div>
      <div class="row"><span>${t("expressCardOk")}</span></div>
    </div>
    ${state.ticket ? talk("expressDone") : ""}
    <button class="main" data-do="${state.ticket ? "next" : "buy"}">${state.ticket ? t("toGates") : t("expressPay")}</button>
    <p class="note">${t("asOf", { date })}</p>`;
  on("buy", () => { state.ticket = true; page.collect(album.icn, "icn", "ticket"); keep(); play(ding); showWallet(); showFound("ticket"); render(); });
  on("next", () => go());
}

// 수첩에 적어 온 꾀: 교통카드와 1회용이 어떻게 다른가.
function payMemo() {
  const a = fares.allstop, c = fares.card;
  return `<ul class="memo">
      <li><b>${t("payCard")}</b>${t("payCardNote", { price: W(c.price) })}${star(c.verified.price)}</li>
      <li><b>${t("paySingle")}</b>${t("paySingleNote", { extra: W(a.singleExtra), deposit: W(a.deposit) })}</li>
    </ul><p class="note">${t("asOf", { date })}<br><span class="star">＊</span> ${t("unverified")}</p>`;
}

// 손에 든 표. 색이 개찰구의 색이다.
function ticketChip(target, color) {
  const express = target === state && state.route === "express";
  return `<div class="ticket ${color ?? (express ? "orange" : "blue")}">${t(express ? "itemExpress" : target.pay === "card" ? "myCard" : "itemSingle")}</div>`;
}

// 공항철도를 타는 화면에 놓을 것. 직통은 서지 않고 빨리 간다.
function airportRide() {
  const express = state.route === "express";
  return {
    stops: fares.stations[express ? "express" : "allstop"], seconds: express ? 3.5 : 6.5, line: express ? "orange" : "blue",
    title: `${t(express ? "rideExpress" : "rideAllstop")} · ${express ? t("exactly", { n: fares.express.minutes }) : t("about", { n: fares.allstop.minutes })}`,
    art: "ride-arex", yuiKey: "rideYui",
  };
}

// 할머니의 쪽. 수첩 단추로도 언제든 꺼내 본다.
function grandmaPage() {
  return `
    <div class="paper">
      <h2>${t("pageTitle")}</h2>
      <p class="when">${t("gWhen")}</p>
      <dl class="hand">
        <dt>${t("gHow")}</dt><dd>${t("gHowText")}</dd>
        <dt>${t("gTicket")}</dt><dd>${t("gTicketText", { express: W(fares.express.adult) })}</dd>
        <dt>${t("gLost")}</dt><dd class="lost">${t("gLostText")}</dd>
        <dt>${t("gTip")}</dt><dd>${t("gTipText")}</dd>
        <dt>${t("gThen")}</dt><dd>${t("gThenText")}</dd>
      </dl>
      <p class="sign hand">${t("sign")}</p>
    </div>`;
}

// 할머니의 명동 쪽. 맞는 출구의 번호는 꾀에 적혀 있다.
function mdGrandmaPage() {
  const s = fares.subway, x = fares.myeongdong.exits, mark = star(fares.myeongdong.verified.exits);
  return `
    <div class="paper">
      <h2>${t("mdPlace")}</h2>
      <p class="when">${t("gWhen")}</p>
      <dl class="hand">
        <dt>${t("gHow")}</dt><dd>${t("mdHowText")}</dd>
        <dt>${t("gTicket")}</dt><dd>${t("mdTicketText", { single: W(s.single), deposit: W(s.deposit) })}</dd>
        <dt>${t("gLost")}</dt><dd class="lost">${t("mdLostText", { exit: x.grandma })}${mark}</dd>
        <dt>${t("gTip")}</dt><dd>${t("mdTipText", { exit: x.right })}${mark}</dd>
        <dt>${t("gNot")}</dt><dd>${t("mdNotText")}</dd>
      </dl>
      <p class="sign hand">${t("sign")}</p>
    </div>`;
}
const mdNote = () => `<p class="note">${t("mdAsOf", { date: mdDate })}${fares.myeongdong.verified.exits ? "" : `<br><span class="star">＊</span> ${t("unverifiedExit")}`}</p>`;

// ── 수첩의 한 쪽 꾸미기 ─────────────────────────────────────────────

// 눌러서 놓을 때의 첫 자리. 그 뒤에는 끌어서 옮긴다.
const HOME = { exit: [0.84, 0.1], ticket: [0.78, 0.1], photo: [0.5, 0.36], word: [0.3, 0.68], egg: [0.8, 0.7], coin: [0.8, 0.7], clue: [0.42, 0.88], note: [0.42, 0.88] };

// 쪽마다 다른 것: 사진이 담는 긴 그림, 조각의 생김새, 돈의 셈, 답장.
const PAGES = {
  icn: {
    head: "pageTitle", scene: "plaza", grandmaAt: 50,
    pasted: () => state.pasted, setPasted: () => { state.pasted = true; },
    pieces: {
      ticket: () => [`ticket ${state.route === "express" ? "orange" : "blue"}`, t(state.route === "express" ? "itemExpress" : state.pay === "card" ? "myCard" : "itemSingle")],
      word: () => ["word", `<b>${t("wordIcn")}</b><small>${t("wordIcnSub")}</small>`],
      note: () => ["note hand", t("changedText")],
      coin: () => ["coin", `<b>${W(fares.allstop.deposit)}</b>${t("coinBack")}`],
    },
    grandma: () => ({ lines: ["gHowText", "gLostText"], items: [["itemExpress", trip.grandmaTotal(fares)]], total: trip.grandmaTotal(fares) }),
    mine: () => ({
      ...trip.spending(state, fares), gap: trip.saved(state, fares), asOf: t("asOf", { date }),
      how: state.route === "express" ? "yuiExpress" : state.pay === "card" ? "yuiAllstopCard" : "yuiAllstopSingle",
      notes: [state.gateMisses ? t("gateNote", { n: state.gateMisses }) : t("gateClean"), ...(state.signMisses ? [t("signNote", { n: state.signMisses })] : [])],
    }),
    reply: (gap) => {
      const lines = state.route === "express" ? ["replyE1", "replyE2", "replyE3"] : ["replyA1", "replyA2", "replyA3"];
      // 개찰구를 잘못 갔으면 "바로 들어갔구나" 자리에 "너도 한 번 섰구나"가 온다.
      if (state.gateMisses > 0) lines[state.route === "express" ? 1 : 0] = "replyLost";
      return [...lines.map((key) => t(key)), ...(trip.sameSpot(state) ? [t("replySame")] : []), ...(gap > 0 ? [t("replySaved", { won: W(gap) })] : [])];
    },
    after: () => `<p class="note">${t("nextPage")}</p><button class="main" data-do="md">${t("toMyeongdong")}</button>`,
  },
  md: {
    head: "mdPlace", scene: "street", grandmaAt: 0,
    pasted: () => state.md.pasted, setPasted: () => { state.md.pasted = true; },
    pieces: {
      exit: () => ["exit", String(fares.myeongdong.exits.right)],
      word: () => ["word", `<b>${t("wordMd")}</b><small>${t("wordMdSub")}</small>`],
      egg: () => ["egg", t("eatSticker")],
      clue: () => ["note hand", t("clueNote")],
    },
    grandma: () => {
      const s = fares.subway;
      return { lines: ["mdHowText", ["mdLostText", { exit: fares.myeongdong.exits.grandma }], "mdNotText"], items: [["itemSingle", s.single], ["itemDeposit", s.deposit]], total: trip.mdGrandmaTotal(fares) };
    },
    mine: () => {
      const m = state.md;
      return {
        ...trip.mdSpending(state, fares), gap: trip.mdSaved(state, fares), asOf: t("mdAsOf", { date: mdDate }),
        how: m.pay === "single" ? "mdYuiSingle" : m.carried ? "mdYuiCard" : "mdYuiNewCard",
        notes: [m.exitMisses ? t("exitNote", { n: m.exitMisses }) : t("exitClean"), ...(m.dirMisses ? [t("dirNote", { n: m.dirMisses })] : [])],
      };
    },
    reply: (gap) => {
      const m = state.md, placed = album.md.placed;
      return [t(m.exitMisses ? "mdReplyLost" : "mdReply1"), t("mdReply2"), ...("clue" in placed ? [t("mdReply3")] : []),
        ...(trip.mdSameSpot(state) ? [t("mdReplySame")] : []), ...("egg" in placed ? [t("mdReplyAte")] : []), ...(gap > 0 ? [t("replySaved", { won: W(gap) })] : [])];
    },
    after: () => `<p class="note">${t("mdNext")}</p><button class="plain" data-do="again">${t("restart")}</button>`,
  },
};

function compose(which, fresh) {
  const def = PAGES[which], sheetPage = album[which], locked = def.pasted();
  const scene = scenes[sceneName(def.scene)];
  const photo = (at, box = 1) => (scene.far || scene.near ? sceneView(scene, at / 100, box)
    : `<img src="art/${scene.art}.webp" alt="" draggable="false" style="object-position:${at}% 50%">`);
  const piece = (id) => (id === "photo" ? ["photo", photo(sheetPage.shotAt * 100)] : def.pieces[id]());
  const waiting = sheetPage.found.filter((id) => !(id in sheetPage.placed));
  const hers = def.grandma(), mine = def.mine();
  const verdict = mine.gap > 0 ? t("savedMoney", { won: W(mine.gap) }) : mine.gap < 0 ? t("overMoney", { won: W(-mine.gap) }) : t("sameMoney");
  const line = (entry) => (Array.isArray(entry) ? t(...entry) : t(entry));
  const ledger = (items, total) => `<ul>${items.map(([key, amount]) => `<li><span>${t(key)}</span><span>${W(amount)}</span></li>`).join("")}<li class="sum"><span>${t("total")}</span><span>${W(total)}</span></li></ul>`;
  $("place").textContent = t(def.head);
  screen.innerHTML = `
    <article class="paper side">
      <h2>${t("grandmaSpring")}</h2>
      <div class="frame faded">${photo(def.grandmaAt, 1.5)}</div>
      ${hers.lines.map((entry, i) => `<p class="hand${i === 1 ? " lost" : ""}">${line(entry)}</p>`).join("")}
      ${ledger(hers.items, hers.total)}
    </article>
    <div class="sheet${locked ? " done" : ""}">
      <p class="head hand">${t(def.head)}</p><p class="date hand">${t("pageDate")}</p>
      ${Object.entries(sheetPage.placed).map(([id, at]) => { const [cls, inner] = piece(id); return `<div class="piece piece-${cls}${id === fresh ? " in" : ""}" data-id="${id}" style="left:${at.x * 100}%;top:${at.y * 100}%">${inner}</div>`; }).join("")}
    </div>
    ${locked ? "" : `<div class="tray">${waiting.map((id) => `<button data-item="${id}">${t(itemKey(id))}</button>`).join("")}</div>
      ${talk(page.canPaste(sheetPage) ? "pageYui" : "pasteNeed")}`}
    <article class="paper side">
      <h2>${t("yui")}</h2>
      <p>${t(mine.how)}</p>
      ${mine.notes.map((text) => `<p>${text}</p>`).join("")}
      ${ledger(mine.items.map((item) => [item.key, item.amount]), mine.total)}
    </article>
    <p class="verdict">${verdict}<small>${mine.asOf}</small></p>
    ${locked ? `<div class="reply hand"><h2>${t("replyHead")}</h2>${[...def.reply(mine.gap), ...page.replyExtras(which, sheetPage).map((key) => t(key))].map((text) => `<p>${text}</p>`).join("")}<p class="sign">${t("sign")}</p></div>${def.after()}`
      : `<button class="main" data-do="paste" ${page.canPaste(sheetPage) ? "" : "disabled"}>${t("paste")}</button>`}`;

  const sheet = screen.querySelector(".sheet");
  for (const button of screen.querySelectorAll(".tray button")) button.onclick = () => {
    const id = button.dataset.item;
    if (page.place(sheetPage, id, ...HOME[id])) { keep(); play(tick, true); compose(which, id); }
  };
  if (!locked) for (const one of sheet.querySelectorAll(".piece")) drag(one, sheet, sheetPage, () => compose(which));
  on("paste", () => { if (!page.canPaste(sheetPage)) return; def.setPasted(); keep(); play(ding); compose(which); });
  on("md", () => { state = trip.enterMyeongdong(state); go("mdPage"); });
  on("again", restart);
}

// 놓인 것을 끌어 옮긴다. 쪽의 아래로 끌어내면 도로 내려놓는다.
function drag(piece, sheet, sheetPage, redraw) {
  const id = piece.dataset.id;
  let grab = null;
  const spot = (event) => {
    const box = sheet.getBoundingClientRect();
    return [(event.clientX - box.left) / box.width - grab[0], (event.clientY - box.top) / box.height - grab[1]];
  };
  piece.onpointerdown = (event) => {
    const box = sheet.getBoundingClientRect(), at = sheetPage.placed[id];
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
    if (y > 1.03) { page.unplace(sheetPage, id); keep(); return redraw(); }
    page.place(sheetPage, id, x, y); keep();
    const at = sheetPage.placed[id];
    piece.style.left = `${at.x * 100}%`; piece.style.top = `${at.y * 100}%`;
  };
}

// ── 틀 ──────────────────────────────────────────────────────────────

function on(name, handler) {
  const button = screen.querySelector(`[data-do=${name}]`);
  if (button) button.onclick = handler;
}

function restart() {
  if (!confirm(t("restartAsk"))) return;
  state = trip.fresh();
  album = page.freshAlbum();
  lastScene = null;
  $("settings").classList.remove("on");
  go("intro");
}

function render() {
  drawn += 1;
  walking += 1;
  showWallet();
  showFound();
  $("note").textContent = t("note");
  (SCREENS[state.step] ?? SCREENS.intro)();
}

// 고르는 카드는 단추만이 아니라 카드의 어디를 눌러도 골라진다(사용자, 2026.10.12: "여기를 눌러도 반응하게 해줘").
screen.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card && !event.target.closest("button")) card.querySelector("button")?.click();
});

// ── 수첩, 설정, 말 ───────────────────────────────────────────────────

function showJournal() {
  $("journalTitle").textContent = t("title");
  $("journalBody").innerHTML = `
    <figure class="old wide"><img src="art/photo-2004.webp" alt="" draggable="false"><figcaption class="hand">典子, 2004.10</figcaption></figure>
    <p><b>${t("clueTitle")}</b> · ${t("photoThen")}<br>${t("clueText")}</p>
    ${state.step === "intro" ? `<p>${t("pageLocked")}</p>` : `${kind() === "md" ? `${mdGrandmaPage()}<br>` : ""}${grandmaPage()}`}`;
  $("journal").classList.add("on");
}

// 설정의 갈래. Changes 쪽은 날마다 바뀐 것을 한 줄씩 보인다(../assets/changes.js ← docs/바뀐-것들.md). 날짜는 그날의 첫 줄에만 적는다.
const NEWS = typeof CHANGES === "undefined" ? [] : CHANGES;
function showTab(name) {
  for (const button of document.querySelectorAll("#settingsTabs button")) button.setAttribute("aria-selected", String(button.dataset.tab === name));
  for (const section of document.querySelectorAll("#settings section")) { section.hidden = section.dataset.tab !== name; section.scrollTop = 0; }
}
function showNews() {
  const stamp = (day) => { const [y, m, d] = day.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const words = (typeof CHANGE_WORDS === "undefined" ? {} : CHANGE_WORDS)[lang] ?? {};
  // 판 번호의 끝자리는 바뀐 것의 줄 수다. 줄을 더하면 저절로 오른다.
  $("appVersion").textContent = NEWS.length ? `v0.1.${NEWS.length} · ${NEWS[0].day.replaceAll("-", ".")}` : "";
  if (typeof CHANGES_STARTED !== "undefined") {
    const [y, m, d] = CHANGES_STARTED.split("-").map(Number);
    $("newsStarted").textContent = `${t("started", { y, m, d })} ${t("days", { n: Math.round((today - stamp(CHANGES_STARTED)) / 86400000) + 1 })}`;
  }
  let lastDay = null;
  $("newsList").innerHTML = NEWS.map(({ day, text }) => {
    const [, month, dayOf] = day.split("-").map(Number), when = day === lastDay ? "" : `${month}.${dayOf}`;
    lastDay = day;
    return `<li><time datetime="${day}">${when}</time><span>${words[text] ?? text}</span></li>`;
  }).join("");
}

// 글자 크기. 설정과 수첩의 창, 유이의 말, 종이와 판의 글이 함께 바뀐다(style.css 의 --text).
let textSize = textSizeFrom((() => { try { return storage?.getItem(TEXT_KEY); } catch { return null; } })());
function showTextSize() {
  document.documentElement.style.setProperty("--text", textSize);
  for (const button of document.querySelectorAll(".textSize button")) button.disabled = !canResize(textSize, Number(button.dataset.way));
}

function showSound() {
  $("soundButton").classList.toggle("off", !soundOn);
  $("soundSwitch").textContent = `${t("sound")} · ${t(soundOn ? "on" : "off")}`;
  $("soundSwitch").classList.toggle("on", soundOn);
}
function setSound(next) {
  soundOn = next;
  try { storage?.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch { /* 이번에만 */ }
  showSound();
}

function setLang(next) {
  lang = LANGS.includes(next) ? next : "en";
  try { storage?.setItem(LANG_KEY, lang); } catch { /* 저장하지 못해도 이번에는 바뀐다 */ }
  document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
  document.title = `Korea Oddity — ${t("title")}`;
  $("settingsTitle").textContent = t("settings");
  $("closeSettings").textContent = $("closeJournal").textContent = t("close");
  $("soundTerm").textContent = t("soundTerm");
  $("testTerm").textContent = t("testTerm");
  $("restartButton").textContent = t("restart");
  $("journalButton").setAttribute("aria-label", t("journal"));
  $("soundButton").setAttribute("aria-label", t("sound"));
  $("settingsButton").setAttribute("aria-label", t("settings"));
  document.querySelector(".textSize").setAttribute("aria-label", t("textSize"));
  for (const button of document.querySelectorAll(".textSize button")) button.setAttribute("aria-label", t(button.dataset.way === "1" ? "textLarger" : "textSmaller"));
  $("helpLead").textContent = t("wHelpLead");
  $("helpList").innerHTML = [1, 2, 3, 4, 5].map((n) => `<dt>${t(`wHelp${n}`)}</dt><dd>${t(`wHelp${n}b`)}</dd>`).join("");
  showNews();
  $("aboutList").innerHTML = `
    <dt>${t("aboutFare")}</dt><dd>${t("aboutFareText", { date })}</dd>
    <dt>${t("aboutArt")}</dt><dd>${t("aboutArtText")}</dd>
    <dt>${t("aboutData")}</dt><dd>${t("aboutDataText")}</dd>`;
  for (const button of document.querySelectorAll("#langRow button")) button.classList.toggle("on", button.dataset.lang === lang);
  showSound();
  render();
}

$("journalButton").onclick = showJournal;
$("closeJournal").onclick = () => $("journal").classList.remove("on");
$("soundButton").onclick = () => setSound(!soundOn);
$("soundSwitch").onclick = () => setSound(!soundOn);
$("settingsButton").onclick = () => { showTab("options"); $("settings").classList.add("on"); };
for (const button of document.querySelectorAll("#settingsTabs button")) button.onclick = () => showTab(button.dataset.tab);
for (const button of document.querySelectorAll(".textSize button")) button.onclick = () => {
  textSize = nextTextSize(textSize, Number(button.dataset.way));
  try { storage?.setItem(TEXT_KEY, String(textSize)); } catch { /* 이번에만 */ }
  play(tick);
  showTextSize();
};
showTextSize();
$("closeSettings").onclick = () => $("settings").classList.remove("on");
$("restartButton").onclick = restart;
for (const sheet of document.querySelectorAll(".modal")) sheet.onclick = (event) => { if (event.target === sheet) sheet.classList.remove("on"); };
for (const button of document.querySelectorAll("#langRow button")) button.onclick = () => setLang(button.dataset.lang);

// 주소에 ?lang=ja 를 붙이면 그 말로 연다.
setLang(LANGS.includes(query.get("lang")) ? query.get("lang") : lang);
