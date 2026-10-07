// 우주 한량(1권)의 배경 음악을 그대로 가져온다.
// 쓰는 법: node tools/copy-music.mjs <1권 저장소 경로>  →  docs/assets/music.js 를 쓴다.
// 1권의 src/core/music.js(곡 열하나와 마디 짜기)는 손대지 않고 옮긴다. 시험판이 파일로도 열려야 해서
// import 와 export 만 떼어 보통 스크립트로 만든다. 울리는 쪽(1권 src/ui/sound.js 의 tone, padNote, playBar,
// music, setMusic)은 아래 PLAYER 에 같은 숫자로 옮겨 적었다.
import { readFileSync, writeFileSync } from "node:fs";

const from = process.argv[2];
if (!from) { console.error("1권 저장소 경로를 넣는다."); process.exit(1); }
const core = readFileSync(`${from}/src/core/music.js`, "utf8").replace(/\r\n/g, "\n")
  .replace(/^import .*\n/m, "")
  .replace(/^export /gm, "")
  .replace(/name: t\('([^']+)'\)/g, "name: '$1'");

const PLAYER = `
// ---- 울리기: 1권 src/ui/sound.js 에서 옮겼다 ----
// ctx: AudioContext, out: 음악이 나갈 곳. 프레임마다 tick(mood)을 부른다. mood 는 'near', 'deep', 'surface'.
function createMusic(ctx, out) {
  const PAD_VOLUME = 0.02, BASS_VOLUME = 0.03;
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(out);
  const order = tuneOrder();
  let on = false, nextBarAt = 0, barNumber = 0, playing = null, barBuses = [];

  function tone({ freq, type = 'sine', start = 0, length = 0.2, volume = 0.2, out: to = musicBus, attack = 0.01 }) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(env).connect(to);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }
  // One held note of the pad: two slightly detuned triangles behind a low-pass filter,
  // swelling in over 2.5 s and fading out over 3 s so bars melt into each other.
  function padNote(freq, start, volume, to) {
    const t = ctx.currentTime + start;
    const end = t + BAR_S + 3;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(volume, t + 2.5);
    env.gain.setValueAtTime(volume, end - 3);
    env.gain.linearRampToValueAtTime(0.0001, end);
    filter.connect(env).connect(to);
    for (const cents of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }
  function playBar(plan, start) {
    const to = ctx.createGain();
    to.connect(musicBus);
    barBuses = barBuses.filter((bar) => bar.until > ctx.currentTime);
    barBuses.push({ out: to, until: ctx.currentTime + start + BAR_S + 3.1 });
    for (const freq of plan.pad) padNote(freq, start, PAD_VOLUME, to);
    tone({ freq: plan.bass, start, length: BAR_S, volume: BASS_VOLUME, out: to });
    for (const note of plan.notes) {
      const { length, overtone, overtoneVolume, wave = 'sine' } = plan.bell;
      tone({ freq: note.freq, type: wave, start: start + note.at, length, volume: note.volume, out: to });
      tone({ freq: note.freq * overtone, start: start + note.at, length: length * 0.3, volume: note.volume * overtoneVolume, out: to });
    }
  }
  return {
    // Starts each bar a little ahead of time so the audio clock, not the frame rate, keeps the beat.
    tick(mood = 'near') {
      if (!on || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (nextBarAt < now) nextBarAt = now + 0.1;
      if (nextBarAt - now > 0.5) return;
      const bar = barInOrder(barNumber, order);
      playBar(barPlan(bar, mood), nextBarAt - now);
      playing = tuneFor(bar).name;
      barNumber += 1;
      nextBarAt += BAR_S;
    },
    set(next) { on = next; musicBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.3); },
    on: () => on,
    tuneName: () => playing,
  };
}
`;

writeFileSync(new URL("../docs/assets/music.js", import.meta.url),
  "// 우주 한량(1권)의 배경 음악. tools/copy-music.mjs 가 만든 파일이다. 손으로 고치지 않는다.\n" + core + PLAYER);
console.log("docs/assets/music.js");
