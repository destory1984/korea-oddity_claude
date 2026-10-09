// 눈금 소리와 셔터 소리. 눈금 소리는 시험판(overlay-proto.html)의 것을 옮겼다. 손을 대기 전에는 소리를 내지 않는다.
// 셔터 소리(반셔터의 "삐빅"과 "찰칵")는 우주 한량(1권)의 것을 가져왔다.

const DIAL_VOLUME = 0.5;   // 2권의 값(1)이 크다고 하여 절반으로 줄인 것 그대로다
let ac = null, noise = null, lastClick = 0;

function wake() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  noise = ac.createBuffer(1, ac.sampleRate * 0.045, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.18));
}
globalThis.addEventListener?.("pointerdown", wake);   // Node 시험에서는 없다

function burst(freq, vol, when = 0) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
  s.buffer = noise; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.0; v.gain.value = vol;
  s.connect(f); f.connect(v); v.connect(ac.destination); s.start(ac.currentTime + when);
}

export function click(big) {
  const now = performance.now();
  if (!ac || now - lastClick < 22) return;
  lastClick = now;
  burst(big ? 760 : 1200, (big ? 0.75 : 0.5) * DIAL_VOLUME);
  const o = ac.createOscillator(), og = ac.createGain(), t0 = ac.currentTime;
  o.type = "sine"; o.frequency.setValueAtTime(big ? 240 : 340, t0); o.frequency.exponentialRampToValueAtTime(big ? 130 : 190, t0 + 0.035);
  og.gain.setValueAtTime((big ? 0.22 : 0.12) * DIAL_VOLUME, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
  o.connect(og); og.connect(ac.destination); o.start(t0); o.stop(t0 + 0.06);
}

// 다이얼이 맞는 자리에 들어왔을 때의 맑은 두 음.
export function ding() {
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const [freq, at] of [[880, 0], [1320, 0.07]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.16, t0 + at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.22);
    o.connect(g); g.connect(ac.destination); o.start(t0 + at); o.stop(t0 + at + 0.25);
  }
}

// ── 사진기 소리: 우주 한량(1권)의 src/ui/sound.js 에서 가져왔다(tone, noise, snap, 큐 shutter) ──────────
// 초점을 잡는 "삐빅"에 이어 "찰칵". 1권에서 녹음 하나를 재어 지은 소리다: 3,886Hz의 두 음(하나에 45ms),
// 0.2초쯤 쉬고, 5kHz 언저리의 바람 소리 세 덩이. 숫자는 1권 그대로다. 1권의 효과음 버스는 MASTER_VOLUME(0.8)을 지난다.
const MASTER_VOLUME = 0.8;
let out = null, hiss = null;

function bus() {
  if (out) return;
  out = ac.createGain();
  out.gain.value = MASTER_VOLUME;
  out.connect(ac.destination);
  hiss = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);   // 1권처럼 2초의 흰 잡음
  const data = hiss.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

// hold: 처음부터 이 시간까지는 제 크기를 지킨 뒤에 잦아든다.
function tone({ freq, type = "sine", start = 0, length = 0.2, volume = 0.2, attack = 0.01, hold = 0 }) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator(), env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + attack);
  if (hold > attack) env.gain.setValueAtTime(volume, t + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

// attack: 소리 없는 데서 부풀어 오르는 시간. 0이면 처음부터 제 크기라 앞머리가 딱딱하다.
function hissBurst({ start = 0, length = 0.1, volume = 0.2, type = "highpass", freq = 2000, to = freq, attack = 0, hold = 0 }) {
  const t = ac.currentTime + start;
  const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), env = ac.createGain();
  src.buffer = hiss;
  src.loop = true;
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t + length);
  if (attack > 0) {
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + attack);
  } else {
    env.gain.setValueAtTime(volume, t);
  }
  if (hold > attack) env.gain.setValueAtTime(volume, t + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter).connect(env).connect(out);
  src.start(t);
  src.stop(t + length + 0.05);
}

// 셔터의 "찰칵". 지금부터 at 초 뒤에 난다.
function snap(at) {
  hissBurst({ start: at, length: 0.085, volume: 0.24, type: "highpass", freq: 2200, attack: 0.025, hold: 0.045 });
  hissBurst({ start: at, length: 0.085, volume: 0.12, type: "bandpass", freq: 3500, attack: 0.025, hold: 0.045 });
  hissBurst({ start: at + 0.055, length: 0.07, volume: 0.2, type: "highpass", freq: 3000, attack: 0.012, hold: 0.035 });
  hissBurst({ start: at + 0.055, length: 0.07, volume: 0.2, type: "bandpass", freq: 1100, attack: 0.012, hold: 0.035 });
  hissBurst({ start: at + 0.095, length: 0.2, volume: 0.3, type: "highpass", freq: 2000, attack: 0.04, hold: 0.06 });
  hissBurst({ start: at + 0.095, length: 0.26, volume: 0.2, type: "bandpass", freq: 3600, to: 1900, attack: 0.04, hold: 0.1 });
}

export const SHUTTER_S = 0.71;   // "삐빅"의 첫 소리부터 "찰칵"이 다 잦아들 때까지

export function shutter() {
  if (!ac) return;
  bus();
  for (const at of [0, 0.06]) {
    tone({ freq: 3886, type: "square", start: at, length: 0.056, volume: 0.022, attack: 0.004, hold: 0.042 });
    tone({ freq: 3886, start: at, length: 0.056, volume: 0.04, attack: 0.004, hold: 0.042 });
  }
  snap(0.35);
}
