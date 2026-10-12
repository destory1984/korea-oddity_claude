// 걷기 시험판의 글. 한국어로 짓고 옮겼다. 옮긴 글은 기계 번역이고 원어민이 보지 않았다.

export const TEXT = {
  ko: {
    title: "명동역 걷기 시험판", hint: "가고 싶은 곳을 누른다. 누른 채 끌면 따라간다. 자판의 화살표로도 걷는다.",
    start: "명동역에 내렸다. 수첩엔 6번 출구라고 적혀 있어.", gate: "삑. 교통카드를 찍고 나왔다.",
    exitN: "{n}번", exitWrongG: "산 쪽 찻길이야. 가게가 없어. 할머니가 나온 데가 여기구나. 돌아 들어가자.", exitWrong: "거리가 한산해. 여기가 아니야. 돌아 들어가자.",
    exitOk: "사람이 많다. 명동 거리다! 계란빵 수레를 찾자.", goal: "계란빵이다. 따끈하고 달다.",
    result: "{steps}걸음을 걸었다. 출구를 {misses}번 잘못 나왔다.", again: "처음부터 다시",
    note: "역 안과 거리의 배치는 지어낸 것이다. 실제 명동역의 구조가 아니다.",
  },
  en: {
    title: "Myeongdong Station walking test", hint: "Tap where you want to go. Hold and drag to keep walking. The arrow keys work too.",
    start: "I got off at Myeongdong Station. The notebook says Exit 6.", gate: "Beep. I tapped out with my transit card.",
    exitN: "Exit {n}", exitWrongG: "A road by the mountain. No shops. So this is where Grandma came out. Back inside.", exitWrong: "The street is quiet. This is not it. Back inside.",
    exitOk: "So many people. This is the Myeongdong street! Let's find the egg bread cart.", goal: "Egg bread. Warm and sweet.",
    result: "Walked {steps} steps. Took the wrong exit {misses} time(s).", again: "Start over",
    note: "The layout of the station and the street is invented. It is not the real Myeongdong Station.",
  },
  ja: {
    title: "明洞駅 歩くテスト版", hint: "行きたいところをタップ。押したまま動かすとついてくる。矢印キーでも歩ける。",
    start: "明洞駅で降りた。手帳には6番出口って書いてある。", gate: "ピッ。交通カードをタッチして出た。",
    exitN: "{n}番", exitWrongG: "山のほうの車道だ。お店がない。おばあちゃんが出たのはここなんだ。もどろう。", exitWrong: "通りが静かだ。ここじゃない。もどろう。",
    exitOk: "人がいっぱい。明洞の通りだ! ケランパンの屋台を探そう。", goal: "ケランパンだ。あったかくて甘い。",
    result: "{steps}歩あるいた。出口を{misses}回まちがえた。", again: "最初からやり直す",
    note: "駅の中と通りの配置は架空のものです。実際の明洞駅の構造ではありません。",
  },
  zh: {
    title: "明洞站 步行试作版", hint: "点一下想去的地方。按住拖动就会跟着走。也可以用方向键。",
    start: "在明洞站下了车。手册上写的是6号出口。", gate: "嘀。刷交通卡出了站。",
    exitN: "{n}号", exitWrongG: "是靠山那边的车道。没有店。奶奶就是从这儿出来的啊。回去吧。", exitWrong: "街上很冷清。不是这里。回去吧。",
    exitOk: "人真多。是明洞街! 去找鸡蛋糕的小摊吧。", goal: "是鸡蛋糕。热乎乎的,甜甜的。",
    result: "走了{steps}步。走错出口{misses}次。", again: "从头再来",
    note: "车站里和街道的布局是虚构的,不是真实的明洞站结构。",
  },
};
export const LANGS = Object.keys(TEXT);
export const translate = (lang, key, values = {}) =>
  (TEXT[lang]?.[key] ?? TEXT.ko[key] ?? key).replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole));
