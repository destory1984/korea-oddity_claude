// 할머니의 수첩(새 기획)의 시제품: 공항에서 서울역까지의 첫 쪽과 서울역에서 명동까지의 둘째 쪽.
// 걸음의 차례와 돈의 셈은 core/trip.js, 글은 i18n.js, 요금은 data/fares.json 에 있다. 여기는 화면만 놓는다.

import { TEXT, LANGS, LANG_KEY, pickLang, translate } from "./i18n.js";
import * as trip from "./core/trip.js";
import { shutter as shutterSound, click as tick, ding, SHUTTER_S } from "../compare/ui/sound.js";

const fares = await (await fetch("data/fares.json")).json();
const ART = "art/";
const $ = (id) => document.getElementById(id);
const screen = $("screen");

// localStorage 에 손대는 것조차 막힌 브라우저가 있다. 그때는 저장 없이 논다.
let storage = null;
try { storage = globalThis.localStorage; } catch { /* 저장 없이 */ }
const memory = { getItem: () => null, setItem() {} };
let state = trip.load(storage ?? memory);
let lang = pickLang(storage, navigator.language ?? "");

const SOUND_KEY = "koreaoddity.trip.sound";
let soundOn = true;
try { soundOn = storage?.getItem(SOUND_KEY) !== "off"; } catch { /* 켜 둔다 */ }
const play = (fn, ...args) => { if (soundOn) fn(...args); };

const t = (key, values) => translate(lang, key, values);
const W = (amount, to = lang) => trip.won(amount, to);
const date = fares.checked.replaceAll("-", ".");
const mdDate = fares.subway.checked.replaceAll("-", ".");
const station = (id, to = lang) => translate(to, `st_${id}`);
// 서울역의 자리마다의 그림.
const SPOT_ART = { A: "seoul-a", B: "seoul-station", C: "seoul-c" };
const MD_SPOT_ART = { A: "md-a", B: "md-b", C: "md-c" };
const inMyeongdong = () => trip.STEPS.indexOf(state.step) >= trip.STEPS.indexOf("mdPage");
const img = (name) => `<img src="${ART}${name}.webp" alt="" draggable="false">`;

function keep() { trip.save(storage ?? memory, state); }
function go(step = trip.nextStep(state)) {
  state.step = step;
  keep();
  render();
  scrollTo(0, 0);
}

// ── 지갑 ────────────────────────────────────────────────────────────

function showWallet() {
  const { spent, balance, hasCard } = trip.totals(state, fares);
  const card = hasCard ? `<br>${t("cardLeft")} ${W(balance)}` : "";
  $("wallet").innerHTML = `${t("spent")} <b>${W(spent)}</b>${card}`;
}

// ── 걸음마다의 화면 ──────────────────────────────────────────────────

const SCREENS = {
  intro() {
    screen.innerHTML = `
      <p class="place">${t("introPlace")}</p>
      <div class="frame">${img("icn-arrivals")}</div>
      <div class="paper letter hand">
        <figure class="old">${img("photo-2004")}<figcaption class="hand">典子, 2004.10</figcaption></figure>
        <p class="then">${t("photoThen")}</p>
        <p>${t("letter1")}</p><p>${t("letter2")}</p><p>${t("letter3")}</p><p>${t("letter4")}</p>
        <p class="sign">${t("sign")}</p>
      </div>
      <p class="yui">${t("yuiIntro")}</p>
      <button class="main" data-do="next">${t("openFirst")}</button>`;
    on("next", () => go());
  },

  page() {
    screen.innerHTML = `${grandmaPage()}<button class="main" data-do="next">${t("chooseRoute")}</button>`;
    on("next", () => go());
  },

  route() {
    const a = fares.allstop, e = fares.express;
    screen.innerHTML = `
      <h1>${t("routeTitle")}</h1>
      <div class="cards">
        <article class="card blue">
          <h2>${t("allstopName")}</h2>
          <div class="price">${W(a.card)}</div>
          <ul class="facts">
            <li>${t("byCard", { won: W(a.card) })}</li>
            <li>${t("about", { n: a.minutes })}${a.verified.minutes ? "" : ' <span class="star">＊</span>'} · ${t("stops", { n: fares.stations.allstop.length })}</li>
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
      <p class="note">${t("asOf", { date })}${fares.allstop.verified.minutes ? "" : `<br><span class="star">＊</span> ${t("unverified")}`}</p>`;
    for (const button of screen.querySelectorAll("[data-route]")) button.onclick = () => {
      state.route = button.dataset.route;
      go();
    };
  },

  // 입국장에서 기차의 표지판을 찾아 지하 1층으로 내려간다. 타는 곳과 표 사는 곳이 모두 지하 1층 교통센터에 있다.
  signs() {
    screen.innerHTML = `
      <h1>${t("signsTitle")}</h1>
      <div class="frame">${img("icn-arrivals")}</div>
      <p class="yui">${t("signsAsk")}</p>
      <div class="signboard">
        <button data-sign="train"><b>🚆</b>${t("signTrain")}</button>
        <button data-sign="bus"><b>🚌</b>${t("signBus")}</button>
        <button data-sign="taxi"><b>🚕</b>${t("signTaxi")}</button>
      </div>`;
    const bubble = screen.querySelector(".yui");
    for (const button of screen.querySelectorAll("[data-sign]")) button.onclick = () => {
      if (button.dataset.sign !== "train") {
        state.signMisses += 1; keep();
        bubble.className = "yui warn"; bubble.textContent = t("signWrong");
        button.disabled = true; play(tick, true);
        return;
      }
      bubble.className = "yui"; bubble.textContent = t("signOk");
      play(ding);
      screen.querySelector(".signboard").outerHTML = `<button class="main" data-do="next">${t("signDown")}</button>`;
      on("next", () => go());
    };
  },

  pay() {
    const a = fares.allstop, c = fares.card;
    const star = c.verified.price ? "" : ' <span class="star">＊</span>';
    screen.innerHTML = `
      <h1>${t("payTitle")}</h1>
      <div class="cards">
        <article class="card blue">
          <h2>${t("payCard")}</h2>
          <ul class="facts"><li>${t("payCardNote", { price: W(c.price) })}${star}</li></ul>
          <button data-pay="card">${t("pickThis")}</button>
        </article>
        <article class="card blue">
          <h2>${t("paySingle")}</h2>
          <ul class="facts"><li>${t("paySingleNote", { extra: W(a.singleExtra), deposit: W(a.deposit) })}</li></ul>
          <button data-pay="single">${t("pickThis")}</button>
        </article>
      </div>
      <p class="note">${t("asOf", { date })}${fares.card.verified.price ? "" : `<br><span class="star">＊</span> ${t("unverified")}`}</p>`;
    for (const button of screen.querySelectorAll("[data-pay]")) button.onclick = () => {
      state.pay = button.dataset.pay;
      go();
    };
  },

  // 편의점. 공항에서도, 서울역에서도 같은 화면이다. target 은 산 것을 적을 곳이다.
  store(target = state, nextKey = "toGates") {
    const c = fares.card;
    let charge = c.charges[0];
    const draw = () => {
      screen.innerHTML = `
        <h1>${t("storeTitle")}</h1>
        <div class="frame">${img("icn-store")}</div>
        <p class="yui">${target.ticket ? t("storeDone") : t("storeAsk")}</p>
        ${target.ticket ? `<button class="main" data-do="next">${t(nextKey)}</button>` : `
        <div class="panel">
          <div class="row"><span>${t("storeCard", { price: W(c.price) })}${c.verified.price ? "" : ' <span class="star">＊</span>'}</span></div>
          <div class="row"><span>${t("storeCharge")}</span>
            <span class="choices">${c.charges.map((amount) => `<button data-charge="${amount}" class="${amount === charge ? "on" : ""}">${W(amount)}</button>`).join("")}</span></div>
        </div>
        <button class="main" data-do="buy">${t("storePay", { won: W(c.price + charge) })}</button>
        ${fares.card.verified.price ? "" : `<p class="note"><span class="star">＊</span> ${t("unverified")}</p>`}`}`;
      for (const button of screen.querySelectorAll("[data-charge]")) button.onclick = () => { charge = Number(button.dataset.charge); play(tick); draw(); };
      on("buy", () => { target.charge = charge; target.ticket = true; keep(); play(ding); showWallet(); draw(); });
      on("next", () => go());
    };
    draw();
  },

  // 1회용 교통카드 발매기. 기계는 한국어로 켜져 있다. 말을 바꾸는 단추를 찾는 것이 첫 배움이다(기획서 3절의 9).
  // dests 는 [역, 1회용의 값]의 줄, right 는 수첩에 적힌 역이다.
  machine({ dests = Object.entries(fares.allstop.to).map(([id, fare]) => [id, fare + fares.allstop.singleExtra]), right = "seoul",
    deposit = fares.allstop.deposit, wrongKey = "mWrongDest", target = state } = {}) {
    let speak = "ko", phase = "dest", inserted = 0, wrong = false;
    const total = Object.fromEntries(dests)[right] + deposit;
    const m = (key, values) => translate(speak, key, values);
    const draw = () => {
      const readable = speak === lang;
      const body = phase === "dest" ? `
          <h2>${m("mDest")}</h2>
          <div class="dests">${dests.map(([id, price]) =>
            `<button data-dest="${id}">${station(id, speak)}<small>${W(price, speak)}</small></button>`).join("")}</div>`
        : `
          <h2>${station(right, speak)} · ${m("mCount")}</h2>
          <div class="sum">${m("mTotal", { won: W(total, speak) })}</div>
          <div class="sub">${m("mDeposit", { deposit: W(deposit, speak) })}</div>
          ${inserted < total ? `<div class="sub">${m("mInsert")}</div>
          <div class="bills">${[1000, 5000, 10000].map((bill) => `<button data-bill="${bill}">${W(bill, speak)}</button>`).join("")}</div>` : ""}
          <div class="sub">${m("mInserted", { won: W(inserted, speak) })}</div>
          ${inserted >= total ? `<div class="sum">${m("mChange", { won: W(inserted - total, speak) })}</div><button class="take" data-do="take">${m("mTake")}</button>` : ""}`;
      screen.innerHTML = `
        <h1>${t("machineTitle")}</h1>
        <div class="machine">
          <div class="band"></div>
          <div class="display">
            <div class="head"><button data-do="back">${m("mBack")}</button>
              <span class="langs">${fares.machine.languages.map((code) => `<button data-speak="${code}" class="${code === speak ? "on" : ""}">${{ ko: "한국어", en: "English", ja: "日本語", zh: "中文" }[code]}</button>`).join("")}</span></div>
            ${body}
          </div>
          <div class="slot"></div>
        </div>
        <p class="yui${wrong ? " warn" : ""}">${wrong ? t(wrongKey) : readable ? t("machineYuiOk") : t("machineYui")}</p>`;
      for (const button of screen.querySelectorAll("[data-speak]")) button.onclick = () => { speak = button.dataset.speak; wrong = false; play(tick); draw(); };
      for (const button of screen.querySelectorAll("[data-dest]")) button.onclick = () => {
        wrong = button.dataset.dest !== right;
        if (!wrong) phase = "pay";
        play(tick);
        draw();
      };
      for (const button of screen.querySelectorAll("[data-bill]")) button.onclick = () => { inserted += Number(button.dataset.bill); play(tick, true); draw(); };
      on("back", () => { phase = "dest"; inserted = 0; wrong = false; draw(); });
      on("take", () => { target.ticket = true; play(ding); go(); });
    };
    draw();
  },

  expressTicket() {
    const e = fares.express;
    screen.innerHTML = `
      <h1>${t("expressTitle")}</h1>
      <div class="panel orange">
        <div class="row"><span>${t("expressPlace")}</span></div>
        <div class="row"><span>${t("expressBuy", { won: W(e.adult) })}</span></div>
        <div class="row"><span>${t("expressCardOk")}</span></div>
      </div>
      <p class="yui"${state.ticket ? "" : " hidden"}>${t("expressDone")}</p>
      <button class="main" data-do="${state.ticket ? "next" : "buy"}">${state.ticket ? t("toGates") : t("expressPay")}</button>
      <p class="note">${t("asOf", { date })}</p>`;
    on("buy", () => { state.ticket = true; keep(); play(ding); render(); });
    on("next", () => go());
  },

  gates() {
    const mine = state.route === "express" ? "orange" : "blue";
    screen.innerHTML = `
      <h1>${t("gatesTitle")}</h1>
      <div class="frame gates">${img("icn-gates")}
        <div class="zones">
          <button class="blue" data-gate="blue"><span>${t("gateBlue")}<small>${t("gateBlueSub")}</small></span></button>
          <button class="orange" data-gate="orange"><span>${t("gateOrange")}<small>${t("gateOrangeSub")}</small></span></button>
        </div>
      </div>
      <div class="ticket ${mine}">${t(state.route === "express" ? "itemExpress" : state.pay === "card" ? "myCard" : "itemSingle")}</div>
      <p class="yui">${t("gatesAsk")}</p>`;
    const bubble = screen.querySelector(".yui");
    for (const button of screen.querySelectorAll("[data-gate]")) button.onclick = () => {
      if (trip.gateOpens(state, button.dataset.gate)) {
        for (const other of screen.querySelectorAll("[data-gate]")) other.disabled = true;
        bubble.className = "yui";
        bubble.textContent = t("gateOk");
        play(ding);
        setTimeout(() => { if (bubble.isConnected) go(); }, 900);
        return;
      }
      // 할머니가 헤맨 곳이다. 문이 안 열리고 돌아 나온다. 돈은 들지 않는다.
      state.gateMisses += 1;
      keep();
      bubble.className = "yui warn";
      bubble.textContent = t(button.dataset.gate === "blue" ? "gateWrongBlue" : "gateWrongOrange");
      const frame = screen.querySelector(".frame");
      frame.classList.remove("shake"); void frame.offsetWidth; frame.classList.add("shake");
      play(tick, true);
    };
  },

  platform() {
    const express = state.route === "express";
    screen.innerHTML = `
      <h1>${t("platformTitle")} · ${t(express ? "rideExpress" : "rideAllstop")}</h1>
      <div class="frame">${img("arex-platform")}</div>
      <p class="yui">${t(express ? "platformExpress" : "platformAllstop")}</p>
      <button class="main" data-do="next">${t("board")}</button>`;
    on("next", () => go());
  },

  ride({ stops, seconds, line, title, art, yuiKey } = airportRide()) {
    screen.innerHTML = `
      <div class="ride" style="--ride:${seconds}s;--line:var(--${line})">
        <h1>${title}</h1>
        <div class="frame">${img(art)}</div>
        <div class="rail">
          <i class="track"></i>
          ${stops.map((id, i) => `<i class="stop${i === 0 || i === stops.length - 1 ? " end" : ""}" style="left:${(i / (stops.length - 1)) * 100}%"></i>`).join("")}
          <i class="train"></i>
          <div class="ends"><span>${station(stops[0])}</span><span>${station(stops.at(-1))}</span></div>
        </div>
        <p class="now"></p>
        <p class="yui">${t(yuiKey)}</p>
        <p class="note">${t("skip")}</p>
      </div>`;
    const now = screen.querySelector(".now");
    const began = performance.now();
    let done = false;
    const finish = () => { if (!done) { done = true; go(); } };
    // 지금 지나는 역의 이름. 일반열차는 역마다 눈금 소리가 난다.
    let last = -1;
    const step = () => {
      if (done || !now.isConnected) return;
      const k = Math.min(1, (performance.now() - began) / (seconds * 1000));
      const at = Math.round(k * (stops.length - 1));
      if (at !== last) { last = at; now.textContent = station(stops[at]); if (at > 0) play(tick, at === stops.length - 1); }
      if (k >= 1) return void setTimeout(finish, 700);
      requestAnimationFrame(step);
    };
    step();
    setTimeout(finish, seconds * 1000 + 1500);   // 화면이 가려져 그리기가 멈춰도 넘어간다
    screen.querySelector(".ride").onclick = finish;
  },

  refund(target = state, amount = fares.allstop.deposit) {
    const deposit = W(amount);
    screen.innerHTML = `
      <h1>${t("refundTitle")}</h1>
      <div class="machine"><div class="band"></div>
        <div class="display" style="min-height:120px"><h2>${t("refundTitle")}</h2><div class="sub">${t("refundText", { deposit })}</div></div>
        <div class="slot"></div></div>
      <p class="yui" hidden></p>
      <button class="main" data-do="refund">${t("refundDo")}</button>
      <button class="main" data-do="skip" style="border-color:rgba(255,255,255,.35);color:var(--white);font-weight:400">${t("refundSkip")}</button>`;
    on("refund", () => {
      target.refunded = true; keep(); showWallet(); play(ding);
      const bubble = screen.querySelector(".yui");
      bubble.hidden = false; bubble.textContent = t("refundYui", { deposit });
      for (const button of screen.querySelectorAll("button")) button.disabled = true;
      setTimeout(() => { if (bubble.isConnected) go(); }, 1300);
    });
    on("skip", () => { target.refunded = false; go(); });
  },

  // 도착의 도장으로 한 장 찍는다. 삐빅, 찰칵, 2초 쉬고 다음 걸음으로 간다. 서울역과 명동이 같은 화면을 쓴다.
  arrive({ target = state, art = SPOT_ART, titleKey = "arriveTitle", yuiKey = "arriveYui", labelKey = "spot" } = {}) {
    screen.innerHTML = `
      <h1>${t(titleKey)}</h1>
      <div class="frame">${trip.SPOTS.map((spot) => `<img class="spot" data-spot="${spot}" src="${ART}${art[spot]}.webp" alt="" draggable="false">`).join("")}</div>
      <p class="yui">${t(yuiKey)}</p>
      <div class="spots">${trip.SPOTS.map((spot) => `<button data-pick="${spot}">${t(`${labelKey}${spot}`)}</button>`).join("")}</div>
      <div class="tools"><button class="shutter" data-do="shutter" aria-label="${t("shutter")}"></button></div>`;
    // 자리를 옮기면 그 자리에서 본 그림으로 넘어간다. 어느 자리든 사진은 된다.
    const stand = (spot) => {
      target.spot = spot; keep();
      for (const image of screen.querySelectorAll("img.spot")) image.classList.toggle("on", image.dataset.spot === spot);
      for (const button of screen.querySelectorAll("[data-pick]")) button.classList.toggle("on", button.dataset.pick === spot);
    };
    for (const button of screen.querySelectorAll("[data-pick]")) button.onclick = () => { stand(button.dataset.pick); play(tick); };
    stand(target.spot);
    on("shutter", () => {
      for (const pick of screen.querySelectorAll("[data-pick]")) pick.disabled = true;
      const button = screen.querySelector(".shutter"), frame = screen.querySelector(".frame");
      button.disabled = true;
      target.shot = true; keep();
      play(shutterSound);
      setTimeout(() => frame.classList.add("flash"), soundOn ? 350 : 0);
      setTimeout(() => { if (frame.isConnected) go(); }, SHUTTER_S * 1000 + 2000);
    });
  },

  paste() {
    const mine = trip.spending(state, fares), hers = trip.grandmaTotal(fares), gap = trip.saved(state, fares);
    const how = state.route === "express" ? "yuiExpress" : state.pay === "card" ? "yuiAllstopCard" : "yuiAllstopSingle";
    const verdict = gap > 0 ? t("savedMoney", { won: W(gap) }) : gap < 0 ? t("overMoney", { won: W(-gap) }) : t("sameMoney");
    const lines = state.route === "express" ? ["replyE1", "replyE2", "replyE3"] : ["replyA1", "replyA2", "replyA3"];
    // 개찰구를 잘못 갔으면 "바로 들어갔구나" 자리에 "너도 한 번 섰구나"가 온다.
    if (state.gateMisses > 0) lines[state.route === "express" ? 1 : 0] = "replyLost";
    const reply = lines.map((key) => `<p>${t(key)}</p>`).join("")
      + (trip.sameSpot(state) ? `<p>${t("replySame")}</p>` : "")
      + (gap > 0 ? `<p>${t("replySaved", { won: W(gap) })}</p>` : "");
    screen.innerHTML = `
      <h1>${t("pasteTitle")}</h1>
      <div class="spread">
        <article class="paper">
          <h2>${t("grandmaSpring")}</h2>
          <div class="frame faded">${img(SPOT_ART[trip.GRANDMA_SPOT])}</div>
          <p class="hand">${t("gHowText")}</p>
          <p class="hand lost">${t("gLostText")}</p>
          <ul><li><span>${t("itemExpress")}</span><span>${W(hers)}</span></li><li class="sum"><span>${t("total")}</span><span>${W(hers)}</span></li></ul>
        </article>
        <article class="paper">
          <h2>${t("yui")}</h2>
          <div class="frame">${state.pasted ? img(SPOT_ART[state.spot]) : ""}</div>
          <p>${t(how)}</p>
          <p><b>${t("changed")}</b> ${t("changedText")}</p>
          <p>${state.gateMisses ? t("gateNote", { n: state.gateMisses }) : t("gateClean")}</p>
          <ul>${mine.items.map((item) => `<li><span>${t(item.key)}</span><span>${W(item.amount)}</span></li>`).join("")}
            <li class="sum"><span>${t("total")}</span><span>${W(mine.total)}</span></li></ul>
        </article>
      </div>
      <p class="verdict">${verdict}<small>${t("asOf", { date })}</small></p>
      ${state.pasted ? `<div class="paper reply hand"><h2>${t("replyHead")}</h2>${reply}<p class="sign">${t("sign")}</p></div>
        <p class="note">${t("nextPage")}</p>
        <button class="main" data-do="md">${t("toMyeongdong")}</button>`
      : `<button class="main" data-do="paste">${t("pasteDo")}</button>`}`;
    on("paste", () => { state.pasted = true; keep(); play(ding); render(); });
    on("md", () => { state = trip.enterMyeongdong(state); go("mdPage"); });
  },

  // ── 둘째 쪽: 서울역 → 명동 ────────────────────────────────────────

  mdPage() {
    screen.innerHTML = `
      <p class="place">${t("mdPlace")}</p>
      ${mdGrandmaPage()}
      <p class="yui">${t(state.md.carried ? "mdYuiCarried" : "mdYuiNoCard")}</p>
      <button class="main" data-do="next">${t("mdStart")}</button>
      ${mdNote()}`;
    on("next", () => go());
  },

  mdPay() {
    const s = fares.subway, c = fares.card;
    const star = c.verified.price ? "" : ' <span class="star">＊</span>';
    screen.innerHTML = `
      <h1>${t("payTitle")}</h1>
      <div class="cards">
        <article class="card sky">
          <h2>${t("payCard")}</h2>
          <ul class="facts"><li>${t("mdCardNote", { price: W(c.price), fare: W(s.card) })}${star}</li></ul>
          <button data-pay="card">${t("pickThis")}</button>
        </article>
        <article class="card sky">
          <span class="tag">${t("grandmaWent")}</span>
          <h2>${t("paySingle")}</h2>
          <ul class="facts"><li>${t("mdSingleNote", { single: W(s.single), deposit: W(s.deposit) })}</li></ul>
          <button data-pay="single">${t("pickThis")}</button>
        </article>
      </div>
      <p class="note">${t("mdAsOf", { date: mdDate })}${fares.card.verified.price ? "" : `<br><span class="star">＊</span> ${t("unverified")}`}</p>`;
    for (const button of screen.querySelectorAll("[data-pay]")) button.onclick = () => {
      state.md.pay = button.dataset.pay;
      go();
    };
  },

  mdStore() { SCREENS.store(state.md, "mdToPlatform"); },

  mdMachine() {
    const s = fares.subway;
    SCREENS.machine({ dests: s.machineDests.map((id) => [id, s.single]), right: s.stops.at(-1), deposit: s.deposit, wrongKey: "mdWrongDest", target: state.md });
  },

  // 타는 곳에서 방면을 고른다. 반대쪽을 타면 한 정거장 갔다가 돌아온다. 돈은 더 들지 않는다.
  mdDirection() {
    const s = fares.subway;
    const toward = (ids) => t("dirToward", { a: station(ids[0]), b: station(ids[1]) });
    const next = (id) => t("dirNext", { station: station(id) });
    screen.innerHTML = `
      <h1>${t("dirTitle")}</h1>
      <div class="frame">${img("line4-platform")}</div>
      <div class="ticket sky">${t(state.md.pay === "card" ? "myCard" : "itemSingle")}</div>
      <p class="yui">${t("dirAsk")}</p>
      <div class="ways">
        <button data-dir="down"><b>←</b>${toward(s.opposite)}<small>${next(s.oppositeNext)}</small></button>
        <button data-dir="up"><b>→</b>${toward(s.toward)}<small>${next(s.stops[1])}</small></button>
      </div>`;
    const bubble = screen.querySelector(".yui");
    for (const button of screen.querySelectorAll("[data-dir]")) button.onclick = () => {
      if (trip.directionRight(button.dataset.dir)) {
        for (const other of screen.querySelectorAll("[data-dir]")) other.disabled = true;
        bubble.className = "yui"; bubble.textContent = t("dirOk", { station: station(s.stops[1]) });
        play(ding);
        setTimeout(() => { if (bubble.isConnected) go(); }, 1100);
        return;
      }
      state.md.dirMisses += 1; keep();
      bubble.className = "yui warn"; bubble.textContent = t("dirWrong", { station: station(s.oppositeNext) });
      button.disabled = true; play(tick, true);
    };
  },

  mdRide() {
    const s = fares.subway;
    SCREENS.ride({ stops: s.stops, seconds: 4, line: "sky", title: `${t("mdRideTitle")} · ${t("exactly", { n: s.minutes })}`, art: "line4-platform", yuiKey: "mdRideYui" });
  },

  mdRefund() { SCREENS.refund(state.md, fares.subway.deposit); },

  // 출구 고르기. 할머니가 헤맨 곳이다. 틀리면 다른 길이 나오고 돌아 들어온다.
  mdExit() {
    const x = fares.myeongdong.exits;
    screen.innerHTML = `
      <h1>${t("exitTitle")}</h1>
      <div class="frame"><img class="spot on" data-view="in" src="${ART}md-exit.webp" alt="" draggable="false"><img class="spot" data-view="out" src="${ART}md-wrong.webp" alt="" draggable="false"></div>
      <p class="yui">${t("exitAsk")}</p>
      <div class="exits">${x.choices.map((n) => `<button data-exit="${n}">${t("exitN", { n })}</button>`).join("")}</div>
      ${mdNote()}`;
    const bubble = screen.querySelector(".yui");
    const view = (name) => { for (const image of screen.querySelectorAll("img.spot")) image.classList.toggle("on", image.dataset.view === name); };
    for (const button of screen.querySelectorAll("[data-exit]")) button.onclick = () => {
      const n = Number(button.dataset.exit);
      for (const other of screen.querySelectorAll("[data-exit]")) other.disabled = true;
      if (trip.exitRight(n, fares)) {
        bubble.className = "yui"; bubble.textContent = t("exitOk");
        play(ding);
        setTimeout(() => { if (bubble.isConnected) go(); }, 1100);
        return;
      }
      state.md.exitMisses += 1; keep();
      bubble.className = "yui warn"; bubble.textContent = t(n === x.grandma ? "exitWrongG" : "exitWrong");
      view("out"); play(tick, true);
      button.dataset.tried = "1";
      // 돌아 들어온다. 가 본 출구는 다시 누르지 못한다.
      setTimeout(() => {
        if (!bubble.isConnected) return;
        view("in");
        for (const other of screen.querySelectorAll("[data-exit]")) other.disabled = other.dataset.tried === "1";
      }, 2600);
    };
  },

  mdShoot() { SCREENS.arrive({ target: state.md, art: MD_SPOT_ART, titleKey: "mdShootTitle", yuiKey: "mdShootYui", labelKey: "mdSpot" }); },

  // 먹는다. 갔다 왔다는 느낌이다. 수첩에 딱지로 남는다. 값은 적지 않는다(쓴 돈은 교통만 견준다).
  mdEat() {
    const ate = state.md.ate;
    screen.innerHTML = `
      <h1>${t("eatTitle")}</h1>
      <div class="frame">${img("md-eat")}</div>
      <p class="yui">${t(ate ? "eatDone" : "eatYui")}</p>
      ${ate ? `<div class="sticker">${t("eatSticker")}</div>` : ""}
      <button class="main" data-do="${ate ? "next" : "eat"}">${t(ate ? "toPaste" : "eatDo")}</button>`;
    on("eat", () => { state.md.ate = true; keep(); play(ding); render(); });
    on("next", () => go());
  },

  mdPaste() {
    const m = state.md, s = fares.subway, x = fares.myeongdong.exits;
    const mine = trip.mdSpending(state, fares), hers = trip.mdGrandmaTotal(fares), gap = trip.mdSaved(state, fares);
    const how = m.pay === "single" ? "mdYuiSingle" : m.carried ? "mdYuiCard" : "mdYuiNewCard";
    const verdict = gap > 0 ? t("savedMoney", { won: W(gap) }) : gap < 0 ? t("overMoney", { won: W(-gap) }) : t("sameMoney");
    const reply = [m.exitMisses ? "mdReplyLost" : "mdReply1", "mdReply2", "mdReply3"].map((key) => `<p>${t(key)}</p>`).join("")
      + (trip.mdSameSpot(state) ? `<p>${t("mdReplySame")}</p>` : "")
      + (m.ate ? `<p>${t("mdReplyAte")}</p>` : "")
      + (gap > 0 ? `<p>${t("replySaved", { won: W(gap) })}</p>` : "");
    screen.innerHTML = `
      <h1>${t("mdPlace")}</h1>
      <div class="spread">
        <article class="paper">
          <h2>${t("grandmaSpring")}</h2>
          <div class="frame faded">${img(MD_SPOT_ART[trip.MD_GRANDMA_SPOT])}</div>
          <p class="hand">${t("mdHowText")}</p>
          <p class="hand lost">${t("mdLostText", { exit: x.grandma })}</p>
          <p class="hand">${t("mdNotText")}</p>
          <ul><li><span>${t("itemSingle")}</span><span>${W(s.single)}</span></li><li><span>${t("itemDeposit")}</span><span>${W(s.deposit)}</span></li>
            <li class="sum"><span>${t("total")}</span><span>${W(hers)}</span></li></ul>
        </article>
        <article class="paper">
          <h2>${t("yui")}</h2>
          <div class="frame">${m.pasted ? img(MD_SPOT_ART[m.spot]) : ""}</div>
          <p>${t(how)}</p>
          <p><b>${t("mdClue")}</b> ${t("mdClueText")}</p>
          <p>${m.exitMisses ? t("exitNote", { n: m.exitMisses }) : t("exitClean")}${m.dirMisses ? `<br>${t("dirNote", { n: m.dirMisses })}` : ""}</p>
          ${m.ate ? `<p><b>${t("ate")}</b> <span class="sticker small">${t("eatSticker")}</span></p>` : ""}
          <ul>${mine.items.map((item) => `<li><span>${t(item.key)}</span><span>${W(item.amount)}</span></li>`).join("")}
            <li class="sum"><span>${t("total")}</span><span>${W(mine.total)}</span></li></ul>
        </article>
      </div>
      <p class="verdict">${verdict}<small>${t("mdAsOf", { date: mdDate })}</small></p>
      ${m.pasted ? `<div class="paper reply hand"><h2>${t("replyHead")}</h2>${reply}<p class="sign">${t("sign")}</p></div>
        <p class="note">${t("mdNext")}</p>
        <button class="main" data-do="again">${t("restart")}</button>`
      : `<button class="main" data-do="paste">${t("pasteDo")}</button>`}`;
    on("paste", () => { m.pasted = true; keep(); play(ding); render(); });
    on("again", restart);
  },
};
SCREENS.done = SCREENS.paste;
SCREENS.mdDone = SCREENS.mdPaste;

// 공항철도를 타는 화면에 놓을 것. 직통은 서지 않고 빨리 간다.
function airportRide() {
  const express = state.route === "express";
  return {
    stops: fares.stations[express ? "express" : "allstop"], seconds: express ? 3.5 : 6.5, line: express ? "orange" : "blue",
    title: `${t(express ? "rideExpress" : "rideAllstop")} · ${express ? t("exactly", { n: fares.express.minutes }) : t("about", { n: fares.allstop.minutes })}`,
    art: "arex-ride", yuiKey: "rideYui",
  };
}

// 할머니의 명동 쪽. 맞는 출구의 번호는 꾀에 적혀 있다.
function mdGrandmaPage() {
  const s = fares.subway, x = fares.myeongdong.exits;
  const star = fares.myeongdong.verified.exits ? "" : ' <span class="star">＊</span>';
  return `
    <div class="paper">
      <h2>${t("mdPlace")}</h2>
      <p class="when">${t("gWhen")}</p>
      <dl class="hand">
        <dt>${t("gHow")}</dt><dd>${t("mdHowText")}</dd>
        <dt>${t("gTicket")}</dt><dd>${t("mdTicketText", { single: W(s.single), deposit: W(s.deposit) })}</dd>
        <dt>${t("gLost")}</dt><dd class="lost">${t("mdLostText", { exit: x.grandma })}${star}</dd>
        <dt>${t("gTip")}</dt><dd>${t("mdTipText", { exit: x.right })}${star}</dd>
        <dt>${t("gNot")}</dt><dd>${t("mdNotText")}</dd>
      </dl>
      <p class="sign hand">${t("sign")}</p>
    </div>`;
}
const mdNote = () => `<p class="note">${t("mdAsOf", { date: mdDate })}${fares.myeongdong.verified.exits ? "" : `<br><span class="star">＊</span> ${t("unverifiedExit")}`}</p>`;

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

function on(name, handler) {
  const button = screen.querySelector(`[data-do=${name}]`);
  if (button) button.onclick = handler;
}

function restart() {
  if (!confirm(t("restartAsk"))) return;
  state = trip.fresh();
  keep();
  $("settings").classList.remove("on");
  render();
}

function render() {
  showWallet();
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
    <figure class="old" style="float:none;width:70%;margin:0 auto 8px">${img("photo-2004")}<figcaption class="hand">典子, 2004.10</figcaption></figure>
    <p><b>${t("clueTitle")}</b> · ${t("photoThen")}<br>${t("clueText")}</p>
    ${state.step === "intro" ? `<p>${t("pageLocked")}</p>` : `${inMyeongdong() ? `${mdGrandmaPage()}<br>` : ""}${grandmaPage()}`}`;
  $("journal").classList.add("on");
}

function showTab(name) {
  for (const button of document.querySelectorAll("#settingsTabs button")) button.setAttribute("aria-selected", String(button.dataset.tab === name));
  for (const section of document.querySelectorAll("#settings section")) section.hidden = section.dataset.tab !== name;
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
  $("helpLead").textContent = t("helpLead");
  $("helpList").innerHTML = [1, 2, 3, 4].map((n) => `<dt>${t(`help${n}`)}</dt><dd>${t(`help${n}b`)}</dd>`).join("");
  $("aboutList").innerHTML = `<dt>${t("title")}</dt><dd>${t("proto")}</dd>
    <dt>${t("aboutMade")}</dt><dd>${t("aboutMadeBy")}</dd>
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
$("closeSettings").onclick = () => $("settings").classList.remove("on");
$("restartButton").onclick = restart;
for (const sheet of document.querySelectorAll(".sheet")) sheet.onclick = (event) => { if (event.target === sheet) sheet.classList.remove("on"); };
for (const button of document.querySelectorAll("#settingsTabs button")) button.onclick = () => showTab(button.dataset.tab);
for (const button of document.querySelectorAll("#langRow button")) button.onclick = () => setLang(button.dataset.lang);

// 주소에 ?lang=ja 를 붙이면 그 말로 연다(시험판과 같다).
const asked = new URLSearchParams(location.search).get("lang");
setLang(LANGS.includes(asked) ? asked : lang);
