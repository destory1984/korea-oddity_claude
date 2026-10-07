// 팔도 한량의 배경 음악. 소리 파일 없이 곡을 짜서 울린다.
// 곡 스물(TUNES)은 여기서 지었다(2026.10.7). 마디를 짜는 법(chance, barPlan, tuneOrder 들)과 울리는 법(createMusic)은
// 우주 한량(1권)의 src/core/music.js, src/ui/sound.js 에서 옮긴 것이다. THIRD-PARTY.md 에 적었다.
// A slow pad of three notes per bar under a few bell notes, different every bar but always
// the same for a given bar number. Twenty tunes take turns, each with its own four chords,
// five-note scale, beat and bell.

const BAR_S = 8;
// Each tune plays this many bars (about two minutes), then the next one starts.
const BARS_PER_TUNE = 16;

const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'A4' → 440, 'Bb2' → 116.54, 'F#4' → 369.99.
function hz(name) {
  const [, letter, mark, octave] = name.match(/^([A-G])([#b]?)(\d)$/);
  const midi = 12 * (Number(octave) + 1) + STEPS[letter] + { '#': 1, b: -1, '': 0 }[mark];
  return Math.round(440 * 2 ** ((midi - 69) / 12) * 100) / 100;
}
const chord = (bass, ...pad) => ({ bass: hz(bass), pad: pad.map(hz) });
const scale = (names) => names.split(' ').map(hz);

// slots: where a melody note may fall inside a bar, in seconds.
// busy: the share of slots that sound.
// bell: how long a note rings, and its overtone (a multiple of the note, and how loud;
//   not a whole number for a metal bell); wave: 'triangle' for a plucked sound (a sine,
//   the music box, when left out).
// motif: a figure, as places in the melody; the notes that sound walk along it in
//   order instead of being picked by chance (which notes sound is still by chance).
const TUNES = [
  // ---- Twelve in Western keys ----
  {
    // A major, an even walk between low stone walls.
    id: 'doldam', name: '돌담길',
    chords: [chord('A2', 'A3', 'C#4', 'E4'), chord('F#2', 'F#3', 'A3', 'C#4'), chord('D3', 'A3', 'D4', 'F#4'), chord('E2', 'G#3', 'B3', 'E4')],
    melody: scale('A4 B4 C#5 E5 F#5 A5 B5 C#6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.42,
    bell: { length: 1.5, overtone: 2, overtoneVolume: 0.2 },
    motif: [0, 1, 2, 1, 3, 2, 4, 3, 5, 4, 3, 2],
  },
  {
    // F sharp minor, short and dry: bamboo leaves brushing each other.
    id: 'daesup', name: '대숲',
    chords: [chord('F#2', 'F#3', 'A3', 'C#4'), chord('E2', 'G#3', 'B3', 'E4'), chord('D3', 'A3', 'D4', 'F#4'), chord('C#3', 'G#3', 'C#4', 'E4')],
    melody: scale('F#5 A5 B5 C#6 E6 F#6 A6 B6'),
    slots: [0, 0.75, 1.5, 2.25, 3, 4, 4.75, 5.5, 6.25, 7], busy: 0.28,
    bell: { length: 0.7, overtone: 3, overtoneVolume: 0.12, wave: 'triangle' },
  },
  {
    // E flat major, a wind chime under the eaves: off the beat, ringing long.
    id: 'punggyeong', name: '처마 끝 풍경',
    chords: [chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('C3', 'G3', 'C4', 'Eb4'), chord('Ab2', 'Ab3', 'C4', 'Eb4'), chord('Bb2', 'F3', 'Bb3', 'D4')],
    melody: scale('G5 Bb5 C6 Eb6 F6 G6 Bb6 C7'),
    slots: [0.3, 1.1, 2.9, 3.4, 5.2, 6.6], busy: 0.4,
    bell: { length: 2.8, overtone: 2.76, overtoneVolume: 0.3 },
  },
  {
    // E major in threes: wind running over a barley field.
    id: 'bori', name: '보리밭',
    chords: [chord('E2', 'G#3', 'B3', 'E4'), chord('C#3', 'G#3', 'C#4', 'E4'), chord('A2', 'A3', 'C#4', 'E4'), chord('B2', 'F#3', 'B3', 'D#4')],
    melody: scale('B4 C#5 E5 F#5 G#5 B5 C#6 E6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.58,
    bell: { length: 1.3, overtone: 2, overtoneVolume: 0.22 },
    motif: [0, 2, 4, 3, 2, 4, 6, 5, 4, 2, 3, 1],
  },
  {
    // C sharp minor, low, two notes at a time: a night train over the rail joints.
    id: 'bamgicha', name: '밤 기차',
    chords: [chord('C#3', 'G#3', 'C#4', 'E4'), chord('F#2', 'F#3', 'A3', 'C#4'), chord('A2', 'A3', 'C#4', 'E4'), chord('G#2', 'G#3', 'B3', 'D#4')],
    melody: scale('C#4 E4 F#4 G#4 B4 C#5 E5 F#5'),
    slots: [0, 0.3, 2, 2.3, 4, 4.3, 6, 6.3], busy: 0.7,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.15 },
    motif: [0, 3, 0, 3, 1, 4, 1, 4, 2, 5, 2, 5, 1, 4, 0, 3],
  },
  {
    // G sharp minor: two flashes, then the dark, like a lighthouse.
    id: 'deungdae', name: '등대',
    chords: [chord('G#2', 'G#3', 'B3', 'D#4'), chord('E2', 'G#3', 'B3', 'E4'), chord('B2', 'F#3', 'B3', 'D#4'), chord('F#2', 'F#3', 'A#3', 'C#4')],
    melody: scale('G#4 B4 C#5 D#5 F#5 G#5 B5 C#6'),
    slots: [0, 0.6, 4, 4.6], busy: 0.7,
    bell: { length: 2.4, overtone: 2, overtoneVolume: 0.2 },
    motif: [4, 7, 4, 6, 3, 5, 4, 7],
  },
  {
    // B major in sevens: two steps up, one back, up a round green hill.
    id: 'oreum', name: '오름',
    chords: [chord('B2', 'F#3', 'B3', 'D#4'), chord('E2', 'G#3', 'B3', 'E4'), chord('G#2', 'G#3', 'B3', 'D#4'), chord('F#2', 'F#3', 'A#3', 'C#4')],
    melody: scale('F#4 G#4 B4 C#5 D#5 F#5 G#5 B5'),
    slots: [0, 1.14, 2.29, 3.43, 4.57, 5.71, 6.86], busy: 0.5,
    bell: { length: 1.7, overtone: 3, overtoneVolume: 0.14 },
    motif: [0, 1, 2, 3, 2, 3, 4, 5, 4, 5, 6, 7, 6, 4, 2, 1],
  },
  {
    // E flat minor, soft and off the beat, always falling: the first snow.
    id: 'cheonnun', name: '첫눈',
    chords: [chord('Eb2', 'Gb3', 'Bb3', 'Eb4'), chord('B2', 'F#3', 'B3', 'D#4'), chord('Gb2', 'Gb3', 'Bb3', 'Db4'), chord('Db3', 'Ab3', 'Db4', 'F4')],
    melody: scale('Eb5 Gb5 Ab5 Bb5 Db6 Eb6 Gb6 Ab6'),
    slots: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5], busy: 0.4,
    bell: { length: 2.2, overtone: 2, overtoneVolume: 0.1 },
    motif: [7, 5, 6, 4, 5, 3, 4, 2, 3, 1, 2, 0],
  },
  {
    // D flat major, warm and unhurried: an afternoon on the wooden porch.
    id: 'toenmaru', name: '툇마루',
    chords: [chord('Db3', 'Ab3', 'Db4', 'F4'), chord('Bb2', 'F3', 'Bb3', 'Db4'), chord('Gb2', 'Gb3', 'Bb3', 'Db4'), chord('Ab2', 'Ab3', 'C4', 'Eb4')],
    melody: scale('Ab4 Bb4 Db5 Eb5 F5 Ab5 Bb5 Db6'),
    slots: [0, 2, 3, 4, 6, 7], busy: 0.5,
    bell: { length: 1.9, overtone: 2, overtoneVolume: 0.2 },
  },
  {
    // A flat major, quick small drops running downhill: a mountain stream.
    id: 'gyegok', name: '계곡',
    chords: [chord('Ab2', 'Ab3', 'C4', 'Eb4'), chord('F2', 'F3', 'Ab3', 'C4'), chord('Db3', 'Ab3', 'Db4', 'F4'), chord('Eb2', 'G3', 'Bb3', 'Eb4')],
    melody: scale('Eb5 F5 Ab5 Bb5 C6 Eb6 F6 Ab6'),
    slots: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7], busy: 0.26,
    bell: { length: 0.6, overtone: 4, overtoneVolume: 0.1 },
    motif: [7, 6, 5, 4, 6, 5, 4, 3, 5, 4, 3, 2, 4, 3, 2, 1, 3, 2, 1, 0],
  },
  {
    // C minor, a long step and a short one: silver grass leaning in the wind.
    id: 'eoksae', name: '억새',
    chords: [chord('C3', 'G3', 'C4', 'Eb4'), chord('Ab2', 'Ab3', 'C4', 'Eb4'), chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('Bb2', 'F3', 'Bb3', 'D4')],
    melody: scale('C5 Eb5 F5 G5 Bb5 C6 Eb6 F6'),
    slots: [0, 1.5, 2, 3.5, 4, 5.5, 6, 7.5], busy: 0.45,
    bell: { length: 1.6, overtone: 3, overtoneVolume: 0.16 },
  },
  {
    // G with a lowered seventh, three slow notes a bar: the tide going out over the flats.
    id: 'gaetbeol', name: '갯벌',
    chords: [chord('G2', 'G3', 'B3', 'D4'), chord('F2', 'A3', 'C4', 'F4'), chord('C3', 'G3', 'C4', 'E4'), chord('D2', 'A3', 'D4', 'F4')],
    melody: scale('D5 E5 G5 A5 B5 D6 E6 G6'),
    slots: [0, 2.67, 5.33], busy: 0.8,
    bell: { length: 3.0, overtone: 2, overtoneVolume: 0.15 },
    motif: [2, 4, 3, 1, 2, 0],
  },
  // ---- Eight on the five notes of Korean folk song, one for each way of singing them.
  // Their chords keep to the same five notes (fourths and fifths, no thirds piled up).
  {
    // Seoul and Gyeonggi (gyeong-tori: sol la do re mi, resting on sol), plucked, in a
    // skipping twelve: a market day.
    id: 'jangteo', name: '장터',
    chords: [chord('E2', 'E3', 'A3', 'B3'), chord('A2', 'E3', 'A3', 'C#4'), chord('E2', 'E3', 'F#3', 'B3'), chord('B2', 'F#3', 'B3', 'C#4')],
    melody: scale('B3 C#4 E4 F#4 A4 B4 C#5 E5'),
    slots: [0, 1.33, 2, 3.33, 4, 5.33, 6, 6.67], busy: 0.6,
    bell: { length: 1.1, overtone: 2, overtoneVolume: 0.3, wave: 'triangle' },
    motif: [2, 4, 3, 2, 1, 2, 4, 5, 6, 5, 4, 2],
  },
  {
    // The east, Gangwon and Gyeongsang (menari-tori: mi sol la do re, coming down
    // la, sol, mi): a road over a mountain pass.
    id: 'gogaetgil', name: '고갯길',
    chords: [chord('F2', 'F3', 'Ab3', 'C4'), chord('C3', 'G3', 'C4', 'Eb4'), chord('Ab2', 'Ab3', 'C4', 'Eb4'), chord('Eb2', 'G3', 'Bb3', 'Eb4')],
    melody: scale('C4 Eb4 F4 Ab4 Bb4 C5 Eb5 F5'),
    slots: [0, 1.33, 2.67, 4, 4.67, 5.33, 6.67], busy: 0.5,
    bell: { length: 1.6, overtone: 2, overtoneVolume: 0.25, wave: 'triangle' },
    motif: [7, 6, 5, 5, 4, 3, 2, 2, 1, 0, 1, 2],
  },
  {
    // The south-west, Jeolla (yukjabaegi-tori: mi, la, and do breaking down to si):
    // a wind from the south.
    id: 'namnyeok', name: '남녘 바람',
    chords: [chord('A2', 'A3', 'C4', 'E4'), chord('E2', 'E3', 'B3', 'E4'), chord('A2', 'A3', 'B3', 'E4'), chord('D3', 'A3', 'D4', 'E4')],
    melody: scale('E4 A4 B4 C5 E5 A5 B5 C6'),
    slots: [0, 0.5, 2, 4, 4.5, 6], busy: 0.55,
    bell: { length: 1.8, overtone: 2, overtoneVolume: 0.25, wave: 'triangle' },
    motif: [1, 3, 2, 1, 0, 1, 4, 7, 6, 5, 4, 3, 2, 1],
  },
  {
    // The north-west (susimga-tori: re mi sol la do, resting on re, leaning on la):
    // the sun going down over the western sea.
    id: 'noeul', name: '서쪽 노을',
    chords: [chord('F2', 'F3', 'Bb3', 'C4'), chord('C3', 'G3', 'C4', 'Eb4'), chord('Bb2', 'F3', 'Bb3', 'D4'), chord('F2', 'F3', 'G3', 'C4')],
    melody: scale('F4 G4 Bb4 C5 Eb5 F5 G5 Bb5'),
    slots: [0, 1, 3, 4, 5, 7], busy: 0.5,
    bell: { length: 2.0, overtone: 2, overtoneVolume: 0.18 },
    motif: [3, 4, 3, 1, 0, 1, 3, 5, 4, 3, 1, 0],
  },
  {
    // Jeju, high and thin, far apart: the whistle a diver lets out when she comes up.
    id: 'sumbi', name: '숨비소리',
    chords: [chord('Db3', 'Ab3', 'Db4', 'Eb4'), chord('Gb2', 'Gb3', 'Bb3', 'Db4'), chord('Db3', 'Ab3', 'Bb3', 'Eb4'), chord('Ab2', 'Ab3', 'Db4', 'Eb4')],
    melody: scale('Ab5 Bb5 Db6 Eb6 Gb6 Ab6 Bb6 Db7'),
    slots: [0, 1, 4, 5.5], busy: 0.5,
    bell: { length: 2.6, overtone: 2, overtoneVolume: 0.08 },
    motif: [5, 3, 4, 2, 6, 4, 3, 1],
  },
  {
    // The sad mode of court and temple music (gyemyeonjo), low, one stroke at a time,
    // with the overtone of a bronze bell: a mountain temple.
    id: 'sansa', name: '산사',
    chords: [chord('G2', 'G3', 'C4', 'D4'), chord('D2', 'A3', 'D4', 'F4'), chord('C3', 'G3', 'C4', 'F4'), chord('G2', 'G3', 'Bb3', 'D4')],
    melody: scale('G3 Bb3 C4 D4 F4 G4 Bb4 C5'),
    slots: [0, 3, 6], busy: 0.75,
    bell: { length: 3.2, overtone: 2.4, overtoneVolume: 0.22 },
  },
  {
    // A quick twelve (jajinmori), plucked, round and round: a dance under the full moon.
    id: 'dalmaji', name: '달맞이',
    chords: [chord('B2', 'F#3', 'B3', 'C#4'), chord('E2', 'E3', 'B3', 'E4'), chord('B2', 'F#3', 'B3', 'E4'), chord('F#2', 'F#3', 'C#4', 'E4')],
    melody: scale('F#4 G#4 B4 C#5 E5 F#5 G#5 B5'),
    slots: [0, 0.67, 1.33, 2, 2.67, 3.33, 4, 4.67, 5.33, 6, 6.67, 7.33], busy: 0.3,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.25, wave: 'triangle' },
    motif: [2, 3, 4, 3, 2, 1, 2, 4, 5, 4, 3, 2, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 1],
  },
  {
    // A rowing song, rocking up and back down: a boat on the swell.
    id: 'baennorae', name: '뱃노래',
    chords: [chord('B2', 'F#3', 'B3', 'E4'), chord('E2', 'E3', 'B3', 'D4'), chord('B2', 'F#3', 'A3', 'D4'), chord('F#2', 'F#3', 'B3', 'E4')],
    melody: scale('B3 D4 E4 F#4 A4 B4 D5 E5'),
    slots: [0, 1.33, 2, 3.33, 4, 5.33, 6, 7.33], busy: 0.55,
    bell: { length: 1.5, overtone: 3, overtoneVolume: 0.15 },
    motif: [2, 3, 4, 3, 2, 1, 0, 1],
  },
];

// How much of a tune's busyness is left in each mood.
const BUSY = { near: 1, deep: 0.36, surface: 0 };

// Steady numbers in 0..1 for (bar, n), the same every time.
function chance(bar, n) {
  let x = (Math.imul(bar + 1, 0x9e3779b1) ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// 'surface' while standing on a world, 'near' within 300,000 km of one, else 'deep'.
function moodFor({ restingOn, surfaceKm }) {
  if (restingOn) return 'surface';
  return surfaceKm <= 300000 ? 'near' : 'deep';
}

// The tune that bar number `bar` belongs to.
function tuneFor(bar) {
  return TUNES[Math.floor(bar / BARS_PER_TUNE) % TUNES.length];
}

// The first bar of the tune after the one `bar` is in.
function nextTuneBar(bar) {
  return (Math.floor(bar / BARS_PER_TUNE) + 1) * BARS_PER_TUNE;
}

// The tunes in a chance order for one sitting (random: a function giving 0..1), so the
// game does not open with the same tune every time. Every tune comes once a round.
// first: the id of a tune to open with (the prototype takes it from ?tune= in the address).
function tuneOrder(random = Math.random, first) {
  const order = TUNES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const at = order.indexOf(TUNES.findIndex((tune) => tune.id === first));
  if (at > 0) order.unshift(...order.splice(at, 1));
  return order;
}

// The bar number to play at `position` (bars played so far in this sitting) when the
// tunes go round in `order`: the same place in the tune, in a later round each time
// round, so a tune's notes differ from its last turn.
function barInOrder(position, order) {
  const turn = Math.floor(position / BARS_PER_TUNE);
  const round = Math.floor(turn / order.length);
  return (round * TUNES.length + order[turn % order.length]) * BARS_PER_TUNE + (position % BARS_PER_TUNE);
}

// What to play in bar number `bar`:
// { bass, pad: [3 Hz], notes: [{ freq, at, volume }], bell: { length, overtone, overtoneVolume } }.
function barPlan(bar, mood) {
  const tune = tuneFor(bar);
  const { bass, pad } = tune.chords[bar % tune.chords.length];
  const octave = mood === 'deep' ? 0.5 : 1;
  const notes = [];
  tune.slots.forEach((slot, i) => {
    if (chance(bar, i) >= tune.busy * BUSY[mood]) return;
    notes.push({
      freq: tune.motif
        ? tune.melody[tune.motif[(bar * tune.slots.length + i) % tune.motif.length]]
        : tune.melody[Math.floor(chance(bar, i + 100) * tune.melody.length)],
      // A little off the beat, like a hand-wound music box.
      at: Math.min(BAR_S - 0.6, slot + chance(bar, i + 200) * 0.3),
      volume: 0.02 + chance(bar, i + 300) * 0.025,
    });
  });
  return { bass: bass * octave, pad: pad.map((f) => f * octave), notes, bell: tune.bell };
}

// ---- 울리기: 1권 src/ui/sound.js 에서 옮겼다 ----
// ctx: AudioContext, out: 음악이 나갈 곳, first: 맨 먼저 울릴 곡의 id(없으면 아무 곡). 프레임마다 tick(mood)을 부른다. mood 는 'near', 'deep', 'surface'.
function createMusic(ctx, out, first) {
  const PAD_VOLUME = 0.02, BASS_VOLUME = 0.03;
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(out);
  const order = tuneOrder(Math.random, first);
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

if (typeof module !== "undefined") module.exports = { TUNES, BAR_S, BARS_PER_TUNE, hz, chord, scale, barPlan, tuneOrder, barInOrder, tuneFor };
