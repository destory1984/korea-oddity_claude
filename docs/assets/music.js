// 우주 한량(1권)의 배경 음악. tools/copy-music.mjs 가 만든 파일이다. 손으로 고치지 않는다.
// Background music, decided here and played by ui/sound.js. No sound files: a slow pad
// of three notes per bar under a few bell notes, different every bar but always the
// same for a given bar number. Eleven tunes take turns, each with its own four chords,
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

// A minor, F, C, G: the pad's three notes (Hz) and a bass note under them.
const CHORDS = [
  chord('A2', 'A3', 'C4', 'E4'),
  chord('F2', 'F3', 'A3', 'C4'),
  chord('C3', 'G3', 'C4', 'E4'),
  chord('G2', 'G3', 'B3', 'D4'),
];
// A minor pentatonic over two octaves: any of these fits any of the chords.
const MELODY = scale('A4 C5 D5 E5 G5 A5 C6 D6');

// slots: where a melody note may fall inside a bar, in seconds.
// busy: the share of slots that sound near a world (deep space: about a third of it).
// bell: how long a note rings, and its overtone (a multiple of the note, and how loud);
//   wave: 'triangle' for a plucked sound (a sine, the music box, when left out).
// motif: a figure, as places in the melody; the notes that sound walk along it in
//   order instead of being picked by chance (which notes sound is still by chance).
const TUNES = [
  {
    id: 'box', name: '오르골',
    chords: CHORDS, melody: MELODY,
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.45,
    bell: { length: 1.4, overtone: 3, overtoneVolume: 0.2 },
  },
  {
    // C major, bright and open.
    id: 'dawn', name: '새벽',
    chords: [chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('G2', 'G3', 'B3', 'D4')],
    melody: scale('C5 D5 E5 G5 A5 C6 D6 E6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.5,
    bell: { length: 1.0, overtone: 2, overtoneVolume: 0.25 },
  },
  {
    // D dorian: minor with a raised sixth, like a calm sea.
    id: 'sea', name: '먼 바다',
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('G2', 'G3', 'B3', 'D4'), chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4')],
    melody: scale('D5 F5 G5 A5 C6 D6 F6 G6'),
    slots: [0, 1.5, 3, 4, 5.5, 7], busy: 0.5,
    bell: { length: 1.8, overtone: 3, overtoneVolume: 0.15 },
  },
  {
    // F major in threes: a cradle song.
    id: 'lullaby', name: '자장가',
    chords: [chord('F2', 'A3', 'C4', 'F4'), chord('D2', 'A3', 'D4', 'F4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('C3', 'G3', 'C4', 'E4')],
    melody: scale('C5 D5 F5 G5 A5 C6 D6 F6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.6,
    bell: { length: 1.6, overtone: 4, overtoneVolume: 0.12 },
  },
  {
    // E minor, high and glassy.
    id: 'stars', name: '별무리',
    chords: [chord('E2', 'G3', 'B3', 'E4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('E5 G5 A5 B5 D6 E6 G6 A6'),
    slots: [0, 0.5, 1, 2, 3, 4, 4.5, 5, 6, 7], busy: 0.35,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.3 },
  },
  {
    // D minor, low and slow, one long note at a time.
    id: 'night', name: '깊은 밤',
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('A2', 'A3', 'C4', 'E4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('D4 F4 G4 A4 C5 D5 F5 G5'),
    slots: [0, 2, 4, 6], busy: 0.7,
    bell: { length: 2.6, overtone: 2, overtoneVolume: 0.2 },
  },
  // The five below came later (2026-10-03: six were heard too often). Each also has a
  // figure of its own, so they do not sound like the first six with other notes.
  {
    // G major in fives: a slow climb and back down.
    id: 'drift', name: '유영',
    chords: [chord('G2', 'G3', 'B3', 'D4'), chord('E2', 'G3', 'B3', 'E4'), chord('C3', 'G3', 'C4', 'E4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('G4 A4 B4 D5 E5 G5 A5 B5'),
    slots: [0, 1.6, 3.2, 4.8, 6.4], busy: 0.62,
    bell: { length: 2.0, overtone: 2, overtoneVolume: 0.18 },
    motif: [0, 2, 3, 5, 7, 5, 3, 2],
  },
  {
    // B minor, many short drops: rain on a window.
    id: 'rain', name: '빗방울',
    chords: [chord('B2', 'F#3', 'B3', 'D4'), chord('G2', 'G3', 'B3', 'D4'), chord('D2', 'A3', 'D4', 'F#4'), chord('A2', 'A3', 'C#4', 'E4')],
    melody: scale('D5 E5 F#5 A5 B5 D6 E6 F#6'),
    slots: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7], busy: 0.24,
    bell: { length: 0.8, overtone: 4, overtoneVolume: 0.1, wave: 'triangle' },
  },
  {
    // The five notes of a Korean tune on G, plucked: two close together, then a wait.
    id: 'gayageum', name: '가야금',
    chords: [chord('G2', 'G3', 'C4', 'D4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'A3', 'D4'), chord('D2', 'A3', 'D4', 'E4')],
    melody: scale('D4 E4 G4 A4 C5 D5 E5 G5'),
    slots: [0, 0.4, 2, 2.4, 4, 5, 5.4, 7], busy: 0.5,
    bell: { length: 1.3, overtone: 2, overtoneVolume: 0.3, wave: 'triangle' },
    motif: [3, 5, 4, 3, 2, 3, 5, 7, 6, 5, 3, 2],
  },
  {
    // D major, wide and bright, a falling line.
    id: 'aurora', name: '오로라',
    chords: [chord('D2', 'A3', 'D4', 'F#4'), chord('B2', 'F#3', 'B3', 'D4'), chord('G2', 'G3', 'B3', 'D4'), chord('A2', 'A3', 'C#4', 'E4')],
    melody: scale('A4 B4 D5 E5 F#5 A5 B5 D6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.4,
    bell: { length: 2.4, overtone: 3, overtoneVolume: 0.12 },
    motif: [7, 6, 4, 5, 4, 2, 3, 1],
  },
  {
    // B flat major in threes, up and down like a merry-go-round.
    id: 'carousel', name: '회전목마',
    chords: [chord('Bb2', 'Bb3', 'D4', 'F4'), chord('G2', 'G3', 'Bb3', 'D4'), chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('Bb4 C5 D5 F5 G5 Bb5 C6 D6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.62,
    bell: { length: 1.1, overtone: 2, overtoneVolume: 0.22 },
    motif: [0, 2, 4, 1, 3, 5, 2, 4, 6, 4, 2, 1],
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
function tuneOrder(random = Math.random) {
  const order = TUNES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
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
