// 눈금 소리와 셔터 소리. 시험판(overlay-proto.html)의 것을 옮겼다. 손을 대기 전에는 소리를 내지 않는다.

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

export function shutter() {
  if (!ac) return;
  burst(2400, 0.9);
  burst(900, 0.8, 0.07);
}
