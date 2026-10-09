# 비교 시제품 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성산일출봉(A안, 다이얼 넷으로 포개기)과 첨성대(B안, 지점과 때를 골라 찍기)를 한 게임에 지어, 여섯 사람이 둘을 견주어 볼 수 있게 한다.

**Architecture:** `docs/compare/` 아래의 빌드 없는 바닐라 JS 모듈이다. 판정, 저장, 로그(`core/`)는 화면을 모르고 `node --test` 로 시험한다. 화면(`ui/`)은 `places/*.json` 과 상태값으로 받은 겹 그림을 놓는다. 사진은 그림 파일이 아니라 상태값으로 저장한다.

**Tech Stack:** 바닐라 JS(ES 모듈), DOM과 CSS, SVG(도움의 선과 윤곽선), `node:test`, 있는 `docs/assets/sun.js`, Codex CLI 그림 주문(`tools/art-order.sh`), 파이썬 그림 도구(`tools/key-sky.py`, `tools/season-layers.py`).

**Spec:** `docs/superpowers/specs/2026-10-09-compare-prototype-design.md`. 놀이의 규칙은 사용자가 가져온 `팔도한량-비교시제품-작업서.md`(저장소 밖, 사용자의 내려받기 폴더)와 `C:\_c\time-oddity\temp\20261009_도윤-팔도한량-새기획서.md` 에 있다. 셋을 함께 읽는다.

## Global Constraints

- 지금의 시험판(`docs/overlay-proto.html`)과 `docs/assets/sun.js` 는 고치지 않는다. 2권의 터(`C:\_c\time-oddity`)는 읽기만 한다.
- 그림을 코드로 그리지 않는다. 코드가 그리는 것은 하늘의 색, 해, 별, 도움의 선, 윤곽선뿐이다.
- 성공 조건, 소라의 말, 답장은 `docs/compare/places/*.json` 에서만 읽는다. 코드와 시험에 다시 적지 않는다(시험은 JSON을 읽어 견준다).
- 글은 한국어뿐이다. 할머니 메모와 소라의 말은 25자 안, 답장은 세 줄.
- 프레임워크, npm 의존성, 내려받는 라이브러리를 들이지 않는다.
- 저장은 localStorage 의 한 키 `paldo.compare.v1`. 밖으로 보내는 요청이 없다.
- 비밀값, 이메일 주소, 개인 경로를 파일에 넣지 않는다. 커밋 작성자 주소는 `13573570+destory1984@users.noreply.github.com` 이고 커밋 전에 `git config user.email` 로 본다.
- 깃허브에 올리지 않는다. 로컬 커밋만 쌓는다.
- 문서는 "다" 평서체, 틸드를 쓰지 않고 범위는 → 로 적는다. 커밋 메시지는 지금까지처럼 영어 한 줄이다.
- 시험은 파일 이름을 적어 돌린다. 폴더만 넣으면 윈도우에서 돌지 않는다.
- 브라우저 확인은 `.claude/launch.json` 의 `proto` 를 띄워 `http://localhost:4319/compare/` 에서 한다. 주소의 `?v=` 를 바꿔 다시 연다.

## Review Focus

시험표에 없지만 사람이 부딪힐 만한 것 다섯이다. 줄마다 맡은 작업에 시험을 넣었다.

1. localStorage 가 막혔거나 가득 찼다 → 놀이는 이어지고 안내가 뜨며, 붙이기는 성공 연출 없이 "다시 붙이기"를 보인다. (작업 3)
2. 다이얼이 끝을 넘어 돈다(12월 31일 → 1월 1일, 24시 → 0시) → 날 번호가 0 → 364 안에 있고 해 계산에 NaN이 들어가지 않는다. (작업 2)
3. 셔터를 연달아 누른다 → 사진은 한 장이다. (작업 3)
4. 닿을 수 없어야 할 조합(과제 1인데 밤)이 저장에서 읽힌다 → 오류 없이 미충족, 소라는 말하지 않는다. (작업 2)
5. 임시 사진 3장에서 밀려난 사진을 붙이려 한다 → 오류 없이 붙지 않는다. (작업 3)

---

## 파일

| 파일 | 맡는 일 | 작업 |
|---|---|---|
| `docs/art-order-2.md` | 발주서 2 | 1 |
| `docs/assets/scenes/cheom-tree.webp`, `seong-*.webp` | 받은 겹과 철의 그림 | 1 |
| `docs/compare/package.json` | `{"type": "module"}` 한 줄. Node가 `.js` 를 모듈로 읽게 한다 | 2 |
| `docs/compare/places/seongsan.json`, `cheomseongdae.json` | 장소 자료 | 2 |
| `docs/compare/core/judge.js` | 판정 | 2 |
| `docs/compare/core/store.js` | 저장 | 3 |
| `docs/compare/core/log.js` | 로그의 숫자 | 3 |
| `docs/compare/index.html`, `style.css`, `main.js` | 틀과 화면 옮기기 | 4 |
| `docs/compare/ui/journal.js`, `ui/result.js` | 시작, 수첩, 결과, 마지막 물음 | 4, 7 |
| `docs/compare/ui/scene.js` | 상태값 → 풍경 | 5 |
| `docs/compare/ui/cheomseongdae.js` | 첨성대 화면 | 5 |
| `docs/compare/ui/dial.js` | 가로 눈금 다이얼 | 6 |
| `docs/compare/ui/seongsan.js` | 성산 화면 | 6 |
| `tests/compare-data.test.mjs`, `compare-judge.test.mjs`, `compare-store.test.mjs`, `compare-log.test.mjs` | 자동 시험 | 2, 3 |

---

### Task 1: 발주서 2와 그림 여섯 장

**Files:**
- Create: `docs/art-order-2.md`
- Create: `docs/assets/scenes/cheom-tree.webp`, `seong-sea.webp`, `seong-ridge.webp`, `seong-field.webp`, `seong-grass.webp`, `seong-shadow.webp`, 그리고 `seong-field`, `seong-grass` 의 `-spring`, `-summer`, `-autumn`, `-winter`
- Modify: `THIRD-PARTY.md` (받은 그림 여섯 장을 발주서 1의 항목과 같은 꼴로 더한다)
- 작업 폴더(커밋하지 않음): `assets/codex/order2/`

**Interfaces:**
- Produces: 위의 WebP 파일 이름. `key-sky.py` 가 찍어 준 "윤곽이 가장 낮은 높이"와 "맨 아래의 색"을 발주서 2의 표에 적는다. 작업 2가 그 값을 JSON에 옮긴다.

- [ ] **Step 1: 주문 문장을 쓴다**

`assets/codex/order2/` 에 겹마다 `.txt` 한 장. 앞머리는 `docs/art-order-1.md` 4절의 문장을 그대로 쓰고, 둘째 문단(참고 그림 `cheom-front.png` 에 그림체를 맞추라는 말)도 그대로 붙인다. 겹마다의 문장은 아래 묘사를 발주서 1의 본보기와 같은 꼴(이 겹, 무엇이 어디에, 높이, 나머지는 자홍색)로 풀어 쓴다.

| 파일 | 묘사 | 놓는 높이 |
|---|---|---|
| `seong-ridge` | 제주 성산일출봉. 바다 위로 솟은 넓은 화산 봉우리 하나. 옆은 깎아지른 벼랑, 위는 톱니처럼 들쭉날쭉한 분화구 테두리. 가로 한가운데에서 조금 오른쪽. 풀빛과 회갈색 | 봉우리의 높이는 그림 높이의 30%, 발은 아래에서 50% |
| `seong-sea` | 잔잔한 바다. 윗가장자리는 반듯한 수평선 한 줄. 푸른색 두 가지 | 수평선은 아래에서 50%, 그 아래는 맨 아래까지 바다 |
| `seong-field` | 낮고 완만한 풀 들판. 윗가장자리가 부드럽게 굽는다. 풀색 두 가지 | 윗가장자리는 아래에서 38% → 44% |
| `seong-grass` | 맨 앞의 키 큰 풀 무더기. 윗가장자리가 풀잎 끝으로 들쭉날쭉하다. 짙은 풀색 | 윗가장자리는 아래에서 18% → 26% |
| `seong-shadow` | 사진 찍는 사람 한 명의 길게 늘어진 그림자. 그림 맨 아래 가운데에서 시작해 위로 뻗는다. 머리가 위, 두 팔을 얼굴 앞에 든 꼴. 짙은 남색 한 가지. 나머지는 모두 자홍색 | 그림자의 길이는 그림 높이의 45%, 너비는 10% |
| `cheom-tree` | 잎이 무성한 큰 나무 한 그루. 굵은 줄기와 둥글고 넓은 잎 덩어리. 가로 한가운데. 나머지는 모두 자홍색 | 나무의 높이는 그림 높이의 70%, 발은 아래에서 15% |

- [ ] **Step 2: `seong-ridge` 한 장을 먼저 주문한다**

```bash
bash tools/art-order.sh assets/codex/order2 assets/codex/order2/seong-ridge.txt seong-ridge.png assets/codex/order1/cheom-front.png assets/codex/order1/idle-1.png
```

받은 그림을 Read 도구로 본다. 통과: 빈 자리가 한 가지 자홍색이고, 글자와 사람이 없고, 그림체가 `cheom-front.png` 와 같아 보인다. 떨어지면 문장을 고쳐 한 번 더 주문한다. 두 번 떨어지면 멈추고 사용자에게 그림을 보인다.

- [ ] **Step 3: 나머지 다섯 장을 주문한다**

같은 명령으로 한 장씩. 한 장에 1 → 3분이다. 받는 대로 Step 2의 기준으로 본다.

- [ ] **Step 4: 자홍색을 지우고 철의 그림을 만든다**

```bash
py tools/key-sky.py assets/codex/order2/seong-ridge.png docs/assets/scenes/seong-ridge.webp
```

여섯 장 모두. 찍힌 높이와 색을 적어 둔다. 이어서:

```bash
py tools/season-layers.py docs/assets/scenes/seong-field.webp docs/assets/scenes/seong-grass.webp
```

통과: `docs/assets/scenes/` 에 새 파일이 14장(여섯 장과 철 여덟 장) 있다.

- [ ] **Step 5: 발주서 2와 `THIRD-PARTY.md` 를 쓴다**

발주서 2는 발주서 1과 같은 차례다(주문한 것, 문장, 주문한 차례, 받고 확인한 것, 잰 값의 표). 다시 주문했으면 몇 번째에 받았는지 적는다.

- [ ] **Step 6: 커밋**

```bash
git add docs/art-order-2.md docs/assets/scenes THIRD-PARTY.md
git commit -m "Art order 2: Seongsan layers, the photographer's shadow, a tree for Cheomseongdae"
```

---

### Task 2: 장소 자료와 판정

**Files:**
- Create: `docs/compare/package.json`, `docs/compare/places/seongsan.json`, `docs/compare/places/cheomseongdae.json`, `docs/compare/core/judge.js`
- Test: `tests/compare-data.test.mjs`, `tests/compare-judge.test.mjs`

**Interfaces:**
- Consumes: 작업 1이 잰 값(없으면 0.5로 두고 작업 5, 6에서 맞춘다).
- Produces:
  - `dayOfYear(s: number): number` — s(0 → 1, 범위 밖이면 감아 돈다)를 0 → 364의 정수로.
  - `stagedSun(h: number): {alt: number, az: number}` — 해 계산이 실패했을 때의 연출. `alt = 48 × sin(π × (h - 6.62) / 11.37)`, `az = h < 12.3 ? 100 : 260`. h는 24로 감아 돈다.
  - `judgeContinuous(place, dials: {x, d, s, h}, sun: {alt, az}): {matched: boolean, composition: boolean, season: boolean, time: "morning"|"night"|"noon"|"evening", sora: string, line: string}`
  - `judgeDiscrete(place, taskId: number, spot: string, time: string): {ok: boolean, needs: [{tag, label, met}], sora: string|null, line: string|null}`

**자료의 꼴.** 작업서 10절의 JSON에 아래를 더한다.

`seongsan.json`:
- `"staging": true`, `"stagingNote"`: 보는 쪽이 서쪽인 까닭 한 줄(설계서 9절).
- `"view": {"azimuth": 270, "fov": 60}`
- `"target": {"x": 0.3, "d": 0.6, "day": 287, "h": 6.667}`, `"tolerance": {"x": 0.1, "d": 0.1}`, `"seasonDays": [257, 318]`(9월 15일 → 11월 15일), `"lowSun": [-0.83, 10]`
- `"start": {"x": -0.4, "d": 0.2, "s": 0.5, "h": 12}` — 처음 값. 구도, 계절, 시각이 모두 틀린 자리다.
- `"fixDistance": false`
- `"sora"` 에 `"evening": "해가 앞에 있어. 그림자가 뒤로 가."` 를 더해 여섯 줄.
- `"layers"` 마다 `"image"`(파일 이름), `"horizon"`(잰 높이), `"foot"`(맨 아래의 색), `"seasons": true|false`.

`cheomseongdae.json`:
- `"labels": {"towerFull": "탑", "grass": "풀밭", "stars": "별"}`
- `"soraRules"`: 위에서부터 처음 맞는 줄을 쓴다. 맞는 줄이 없으면 말하지 않는다.

```json
[
  {"ok": true, "task": 1, "say": "ok1"},
  {"ok": true, "task": 2, "say": "ok2"},
  {"has": ["topCut"], "say": "topCut"},
  {"has": ["towerHidden", "stars"], "task": 2, "say": "starsNoTower"},
  {"has": ["towerHidden"], "say": "towerHidden"},
  {"has": ["towerFull"], "lacks": ["stars"], "task": 2, "say": "noStars"}
]
```

- `"camera": {"A": {"scale": 2.0}, "B": {"scale": 1.0}, "C": {"scale": 1.0, "tree": true}}`
- `"layers"`: `cheom-far`(0.498, `#4b8291`), `cheom-mid`(0.497, `#70aa54`), `cheom-front`(0.604, `#6ea84d`), `cheom-tree`(작업 1의 값).

- [ ] **Step 1: 자료 시험을 쓴다** (`tests/compare-data.test.mjs`)

JSON 둘을 `fs` 로 읽어:
- `memo`, `sora` 의 모든 값, `tasks[].memo` 가 25자 안이다(공백 포함).
- `reply` 가 세 줄이다.
- `sora` 의 줄 수가 양쪽 여섯이다.
- 첨성대의 `states` 가 아홉이고 열쇠가 `spots × times` 와 같다.
- `soraRules[].say` 가 모두 `sora` 의 열쇠다.

- [ ] **Step 2: 판정 시험을 쓴다** (`tests/compare-judge.test.mjs`)

성산. 해는 `createRequire` 로 `docs/assets/sun.js` 의 `sunAt(33.458, 126.942, day, h * 60 - 540)` 를 불러 넘긴다. `t = place.target`, `S = (day) => (day + 0.5) / 365`.

| 이름 | 다이얼 | 기대 |
|---|---|---|
| 들어오자마자 | `place.start` | `matched` false, `sora` "composition" |
| 구도만 맞고 12시 | x 0.3, d 0.6, s `S(287)`, h 12 | `matched` false, `time` "noon", `sora` "noon" |
| 다 맞음 | x 0.3, d 0.6, s `S(287)`, h 6.667 | `matched` true, `time` "morning", `sora` "match" |
| 해 뜨기 전 | 위와 같고 h 6.5 | `time` "night", `sora` "night" |
| 저녁 | 위와 같고 h 17.5 | `time` "evening", `sora` "evening" |
| 계절만 틀림 | x 0.3, d 0.6, s `S(195)`, h 6.667 | `season` false, `sora` "season" |
| 구도의 끝 | x 0.4, d 0.5, s `S(287)`, h 7 | `matched` true |
| 구도 밖 | x 0.41 | `composition` false |
| 계절의 끝 | 날 257, 318은 `season` true, 256, 319는 false. h는 `(sunTimes(33.458, 126.942, 날).rise + 550) / 60`(그날 해돋이 10분 뒤) | 257, 318은 `matched` true |
| 여럿 틀림 | x 0, s `S(195)`, h 12 | `sora` "composition" (구도, 계절, 시각의 차례) |

`line` 은 `place.sora[sora]` 와 같다.

`dayOfYear`: `dayOfYear(0)` 0, `dayOfYear(0.9999)` 364, `dayOfYear(1)` 0, `dayOfYear(-0.001)` 364, `dayOfYear(1.5)` 은 `dayOfYear(0.5)` 와 같다.

`stagedSun`: `stagedSun(6.667).alt` 가 0 → 10 사이이고 `az` 100, `stagedSun(12).alt` 가 10 위, `stagedSun(2).alt` 가 음수, `stagedSun(17.5).az` 260, `stagedSun(30)` 은 `stagedSun(6)` 과 같다. 이 연출로도 "다 맞음" 줄이 `matched` true다.

첨성대. 아홉 상태 × 과제 둘을 모두 돈다.
- 과제 1의 `ok` 는 B-day, B-dusk 에서만 true. 과제 2는 B-night 에서만.
- 작업서 5절의 반응표 여섯 줄: (A-day, 1) "topCut", (C-day, 1) "towerHidden", (B-day, 1) "ok1", (B-dusk, 2) "noStars", (C-night, 2) "starsNoTower", (B-night, 2) "ok2".
- (B-dusk, 2)의 `needs` 는 `[{tag: "towerFull", label: "탑", met: true}, {tag: "stars", label: "별", met: false}]`. (C-night, 2)는 탑 false, 별 true.
- (B-night, 1): `ok` false, `sora` null, `line` null, 던지지 않는다.
- 없는 상태(`"D"`, `"day"`): `ok` false, `needs` 가 모두 `met: false`, 던지지 않는다.

- [ ] **Step 3: 시험이 떨어지는지 본다**

Run: `node --test tests/compare-data.test.mjs tests/compare-judge.test.mjs`
Expected: 파일이 없어 FAIL.

- [ ] **Step 4: `package.json`, JSON 둘, `judge.js` 를 쓴다**

`judgeContinuous` 의 구도: 끝값(x 0.4, d 0.5)이 맞도록 `Math.abs(x - target.x) <= tolerance.x + 1e-9` 로 견준다. 0.4 - 0.3 은 부동소수로 0.1보다 조금 크다.

`judgeContinuous` 의 시각: `alt < lowSun[0]` 이면 night, `alt > lowSun[1]` 이면 noon, 그 사이에서 `az < 180` 이면 morning, 아니면 evening. morning 만 맞는 때다.

- [ ] **Step 5: 시험이 통과하는지 본다**

Run: `node --test tests/compare-data.test.mjs tests/compare-judge.test.mjs tests/sun.test.mjs`
Expected: 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add docs/compare tests/compare-data.test.mjs tests/compare-judge.test.mjs
git commit -m "Compare prototype: place data and the two judges"
```

---

### Task 3: 저장과 로그

**Files:**
- Create: `docs/compare/core/store.js`, `docs/compare/core/log.js`
- Test: `tests/compare-store.test.mjs`, `tests/compare-log.test.mjs`

**Interfaces:**
- Consumes: `places/*.json` 의 `start`(성산의 처음 값), `tasks[0].start`(첨성대의 처음 상태).
- Produces (`store.js`):
  - `KEY = "paldo.compare.v1"`
  - `createStore(storage, places: {seongsan, cheomseongdae}, now = Date.now)` → store
  - `store.status: "ok" | "fresh" | "broken" | "memory"` — `memory` 는 storage 가 던져서 기기에 못 쓰는 때.
  - `store.state` — 설계서 7절의 꼴. `broken` 이면 null.
  - `store.save(): boolean`
  - `store.startOver()` — `broken` 에서 새 저장을 만든다. 이때에만 `KEY` 를 덮어쓴다.
  - `store.go(screen: "start"|"journal"|"place"|"result"|"ask", placeId?: string)` — 화면을 적고 저장. 장소에 들어오면 `visited` 를 true로 하고 `enter`, 나가면 `leave` 를 로그에 쓴다.
  - `store.setDials(patch)`, `store.setOverlay(on)`, `store.setSpot(spot)`, `store.setTime(time)`, `store.bumpHelp(): number`(1 → 3에서 멈춘다) — 바꾸고, 로그를 쓰고, 저장.
  - `store.addShot(placeId, shot): shot|null` — `id`(1부터 오르는 수)와 `t` 를 붙여 `shots` 끝에 넣고 3장만 남긴다. 앞 사진과 150ms 안이면 null(연달아 누른 것).
  - `store.paste(placeId, shotId): {saved: boolean, memoryNew: boolean, otherViewNew: boolean}`
  - `store.setAnswer(answer: "seongsan"|"cheomseongdae"|"both"|"neither")`
  - `store.log(place, kind, value)`
- Produces (`log.js`):
  - `metrics(log, placeId): {firstSuccessMs: number|null, shutters: number, helps: number, retried: boolean}` — `firstSuccessMs` 는 첫 `enter` 에서 판정이 성공인 첫 `shutter` 까지. `retried` 는 그 뒤에 `retry` 가 있는가.
  - `exportText(state): string` — `{log, metrics: {seongsan, cheomseongdae}, answer}` 를 들여쓴 JSON으로.

**정한 것.**
- 저장의 꼴은 설계서 7절과 같되 `pasted` 를 이렇게 둔다. 성산: `pasted`(붙인 사진 한 장 또는 null). 첨성대: `pasted: {photo, "1", "2"}` — `photo` 는 마지막에 붙인 아무 사진, `"1"` 과 `"2"` 는 그 과제를 채운 사진.
- `paste` 는 상태의 복사본을 고쳐 `storage.setItem` 을 해 보고, 던지면 복사본을 버리고 `{saved: false, …}` 를 낸다. 성공하면 `paste` 를 로그에 쓴다.
- 성산의 `paste`: `shot.matched` 이고 `memory` 가 false면 `memory` 를 true로, `memoryNew` true.
- 첨성대의 `paste`: `shot.ok` 이고 `shot.task` 가 1이면 `pasted["1"]`, `memory`, 그리고 `task` 를 2로, `help` 를 0으로. `shot.task` 가 2면 `pasted["2"]`, `otherView`.
- 로그 한 줄은 `{place, t, kind, value}`. `kind` 는 enter, dial, state, shutter, help, paste, retry, leave, answer, fallback, config.

- [ ] **Step 1: 저장 시험을 쓴다** (`tests/compare-store.test.mjs`)

가짜 storage 는 `Map` 을 감싼 `{getItem, setItem, removeItem}` 이고 `failWrites` 를 켜면 `setItem` 이 던진다. `now` 는 손으로 올리는 시계다.

| 이름 | 하는 일 | 기대 |
|---|---|---|
| 처음 | 빈 storage | `status` "fresh", 성산의 `dials` 가 `place.start`, 첨성대가 A-day, 과제 1 |
| 복구 | `setSpot("C")`, `setTime("night")`, `go("place", "cheomseongdae")` 뒤 같은 storage 로 새 store | `status` "ok", spot C, time night, screen place |
| 다이얼 복구 | `setDials({x: 0.3})` 뒤 새 store | x 0.3, 나머지는 그대로 |
| 두 번 붙이기 | 성산에 `matched: true` 인 사진을 넣고 `paste` 두 번 | 첫 번 `memoryNew` true, 둘째 false, `memory` true |
| 포개지지 않은 사진 | `matched: false` 를 붙임 | `saved` true, `pasted` 가 그 사진, `memory` false |
| 과제 넘어가기 | 첨성대에 `{task: 1, ok: true}` 를 붙임 | `memory` true, `task` 2, `help` 0 |
| 다른 시선 | 이어서 `{task: 2, ok: true}` 를 붙임 | `otherViewNew` true, `pasted["1"]` 과 `pasted["2"]` 가 둘 다 있다 |
| 쓰기 실패 | `failWrites` 를 켜고 `paste` | `saved` false, `memory` false, `task` 1. 끄고 다시 붙이면 `saved` true |
| 깨진 저장 | storage 에 `"{깨짐"` 을 넣고 store | `status` "broken", `KEY` 의 값이 그대로, `KEY + ".broken"` 에 같은 글. `startOver()` 뒤 `status` "fresh" |
| 다른 판 | `{"version": 99}` | 깨진 저장과 같다 |
| storage 가 던짐 | `getItem` 이 던지는 storage | `status` "memory", `addShot` 은 되고 `paste` 는 `saved` false, 던지지 않는다 |
| 임시 사진 3장 | 200ms 간격으로 `addShot` 네 번 | `shots` 가 3장이고 처음 것이 없다 |
| 연달아 누름 | 같은 때에 `addShot` 두 번 | 둘째는 null, `shots` 1장 |
| 밀려난 사진 | 네 번 찍고 첫 사진의 id로 `paste` | `saved` false, 던지지 않는다 |
| 도움 | `bumpHelp()` 네 번 | 1, 2, 3, 3 |

- [ ] **Step 2: 로그 시험을 쓴다** (`tests/compare-log.test.mjs`)

손으로 쓴 로그로: enter(t 1000) → shutter 미충족(3000) → help(4000) → shutter 충족(9000) → paste → retry(12000).
- `metrics` 는 `{firstSuccessMs: 8000, shutters: 2, helps: 1, retried: true}`.
- 성공이 없는 로그는 `firstSuccessMs` null, `retried` false.
- 다른 장소의 줄은 세지 않는다.
- `exportText` 를 `JSON.parse` 하면 `log`, `metrics.seongsan`, `metrics.cheomseongdae`, `answer` 가 있다.
- store 로 `go("place", "seongsan")`, `setDials`, `addShot` 을 하면 `state.log` 의 `kind` 가 차례로 enter, dial, shutter 다.

- [ ] **Step 3: 떨어지는지 본다**

Run: `node --test tests/compare-store.test.mjs tests/compare-log.test.mjs`
Expected: FAIL.

- [ ] **Step 4: `store.js`, `log.js` 를 쓴다**

- [ ] **Step 5: 통과하는지 본다**

Run: `node --test tests/compare-data.test.mjs tests/compare-judge.test.mjs tests/compare-store.test.mjs tests/compare-log.test.mjs`
Expected: 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add docs/compare/core tests/compare-store.test.mjs tests/compare-log.test.mjs
git commit -m "Compare prototype: one-key save that never resets itself, and the play log"
```

---

### Task 4: 뼈대 화면

**Files:**
- Create: `docs/compare/index.html`, `docs/compare/style.css`, `docs/compare/main.js`, `docs/compare/ui/journal.js`, `docs/compare/ui/result.js`

**Interfaces:**
- Consumes: 작업 3의 store, 작업 2의 JSON.
- Produces:
  - `main.js` 가 `places` 를 `fetch` 로 읽고 `createStore(localStorage, places)` 를 만들어 `show(screen, placeId)` 로 화면을 바꾼다. 화면은 `<main>` 안의 `<section data-screen="…">` 다섯이고 하나만 보인다.
  - `mountJournal(root, {store, places, onOpen(placeId), onExport()})`
  - `mountResult(root, {store, places, placeId, shot, verdict, onJournal(), onRetry()})` — 왼쪽 옛 사진, 오른쪽 찍은 사진, 필요한 것의 표시(첨성대), 소라의 한마디, "수첩에 붙이기", 붙인 뒤 답장 세 줄(기억이 새로 채워진 때에만), 단추 "수첩으로", "한 번 더 찍기".
  - 장소 화면이 지킬 약속: `mountPlace(root, {store, place, onShot(shot, verdict), onBack()})`. 이 작업에서는 이름과 "수첩으로" 단추만 있는 빈 화면이다.
  - 풍경을 놓을 자리는 `<div class="frame">`(가로 3, 세로 2). 작업 5의 `renderScene` 이 채운다. 이 작업에서는 회색 칸이다.

**정한 것.**
- 글꼴은 `../assets/fonts/` 의 CSS 셋을 `<link>` 로 읽는다(Pretendard, 나눔손글씨 펜, 개구). `sun.js` 는 `<script src="../assets/sun.js">` 로 모듈보다 먼저 읽는다.
- 화면의 기둥은 너비 480픽셀을 넘지 않고 가운데에 둔다. 색과 종이 느낌은 시험판의 수첩을 따른다.
- 시작 화면: 제목 "팔도 한량 — 시제품", 쪽지 "소라야, 두 군데만 가 보렴. 사진이 다 바랬구나.", 단추 "수첩 펴기", 아래에 작은 "로그 내보내기".
- 수첩: 두 칸이 나란히. 칸마다 바랜 사진 자리, 메모, 채움 표시(성산 셋, 첨성대 넷), "가기".
- 로그 내보내기: `navigator.clipboard.writeText(exportText(state))`. 실패하면 `<textarea readonly>` 에 띄운다.
- `store.status` 가 `broken` 이면 다른 화면 대신 안내를 띄운다: "저장한 것이 깨졌어. 원본은 그대로 두었어." 와 단추 "새로 시작". `memory` 면 화면 위에 한 줄: "이 기기에는 저장이 안 돼. 붙이기가 되지 않을 수 있어."
- "한 번 더 찍기"는 `retry` 를 로그에 쓰고 그 장소로 돌아간다. 상태는 그대로다.
- 붙이기가 `saved: false` 면 답장도 채움 표시도 내지 않고 단추의 글을 "다시 붙이기"로 바꾼다.

- [ ] **Step 1: 틀과 화면 넷을 쓴다**

- [ ] **Step 2: 브라우저에서 본다**

`proto` 를 띄우고 `http://localhost:4319/compare/?v=1` 을 연다.
- 콘솔에 오류가 없다.
- 시작 → 수첩 → 성산 "가기" → 빈 장소 → "수첩으로" 가 된다. 수첩의 성산 "자리" 표시가 채워진다.
- 장소 화면에서 새로 고치면 같은 장소 화면으로 돌아온다.
- `localStorage.setItem("paldo.compare.v1", "{")` 뒤 새로 고치면 깨짐 안내가 뜨고, `paldo.compare.v1` 의 값이 `{` 그대로다.
- "로그 내보내기" 뒤 붙여 넣은 글이 JSON이고 `enter` 줄이 있다.
- 너비 375에서 가로로 밀리지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add docs/compare
git commit -m "Compare prototype: start, the two-square journal, the result screen"
```

---

### Task 5: 풍경과 첨성대

**Files:**
- Create: `docs/compare/ui/scene.js`, `docs/compare/ui/cheomseongdae.js`
- Modify: `docs/compare/main.js`, `docs/compare/ui/result.js`, `docs/compare/ui/journal.js`, `docs/compare/style.css`, `docs/compare/places/cheomseongdae.json`(놓는 값)

**Interfaces:**
- Consumes: `judgeDiscrete`, store, `cheom-*.webp`.
- Produces:
  - `renderScene(frame: HTMLElement, place, view, opts?: {faded?: boolean, gray?: boolean, outline?: boolean})` — 같은 `frame` 에 다시 부르면 겹을 새로 만들지 않고 놓는 값만 고친다. `view` 는 첨성대 `{spot, time}`, 성산 `{x, d, s, h, sun}`. 이 작업은 첨성대만 짓고, 성산은 작업 6이 같은 함수에 더한다.
  - `viewOf(place, shot)` — 저장한 사진을 `view` 로.
  - `mountPlace` 의 첨성대 판.

**정한 것.**
- 겹은 `<img>` 를 `position: absolute` 로 쌓는다. 그림 너비는 틀 너비의 1.45배(시험판과 같다), 겹의 `horizon` 이 틀의 정해진 높이에 오게 세로로 민다. 구도는 탑과 풀밭 겹의 `transform` 으로 바꾸고, `transform-origin` 은 탑의 발이다.
- 지점: A는 탑과 풀밭과 고분을 2.0배, B는 1.0배, C는 B에 나무 겹을 탑 앞에 놓는다. 옮기는 데 0.5초(`transition`). 옮기는 동안 셔터에 `disabled`. 옮기는 중에 다른 지점을 누르면 마지막 것으로 간다.
- 때: 하늘은 `linear-gradient`(낮 `#8fc1e8` → `#cfe6f5`, 저녁 `#3d3a78` → `#f0925a`, 밤 `#0b1440` → `#1d2a6b`), 겹은 CSS `filter`(저녁 `brightness(0.8) sepia(0.25) hue-rotate(-12deg)`, 밤 `brightness(0.42) saturate(0.6) hue-rotate(20deg)`). 별은 밤에만 하늘에 찍는 흰 점 40개이고, 자리는 고정된 씨앗으로 정해 늘 같다. 화면 위 양 끝 15%에 적어도 다섯씩 둔다(A에서도 보이게).
- 지점 단추는 풍경 위의 발자국 표시 셋, 때 카드는 풍경 아래 셋. 과제 1에서는 때 카드가 접혀 보이지 않는다.
- "옛 사진": 참고 사진을 따로 띄운다. 과제 1은 B-day, 과제 2는 B-night 를 `faded` 로 놓은 것. 풍경 위에 덮지 않는다.
- "비교": `shots` 의 마지막 둘을 나란히. 한 장뿐이면 단추가 꺼져 있다.
- "도움": `store.bumpHelp()` 의 값으로. 1은 옛 사진을 열고 필요한 두 요소에 테두리, 2는 풍경 위 SVG 선(A면 화면 위 가장자리에 톱니 표시, C면 나무에서 탑으로 긋는 선, 과제 2의 낮과 저녁이면 하늘에 점선 별 셋), 3은 성공 상태를 `gray` 로 놓은 작은 미리보기.
- 셔터: `store.addShot("cheomseongdae", {spot, time, task, ok})` 가 null이 아니면 `onShot`. 판정은 `judgeDiscrete`.
- 과제의 메모는 풍경 위에 손글씨로 한 줄. 과제 2가 열리면 메모가 바뀌고 때 카드가 펴진다.
- 결과 화면과 수첩의 사진은 `renderScene(frame, place, viewOf(place, shot))`. 수첩의 "다른 시선"은 `pasted["1"]` 과 `pasted["2"]` 를 나란히.

- [ ] **Step 1: `scene.js` 의 첨성대와 `cheomseongdae.js` 를 쓰고 화면에 잇는다**

- [ ] **Step 2: 구도를 잰다**

브라우저의 너비 375에서 `getBoundingClientRect()` 로 잰다. 맞지 않으면 `cheomseongdae.json` 의 `camera` 와 놓는 값을 고친다.
- B: 탑 그림의 탑 꼭대기가 틀의 윗가장자리보다 틀 높이의 10% 넘게 아래다.
- A: 탑 꼭대기가 틀의 윗가장자리보다 위다(틀 밖). 풀밭은 보인다.
- C: 나무의 잎 덩어리가 탑 너비의 절반 넘게 덮는다. 탑 꼭대기도 덮는다.
- 밤의 A: 틀 안에 보이는 별이 다섯 넘는다.

- [ ] **Step 3: 시험표 여덟 줄을 브라우저에서 돌린다**

작업서 5절의 시험표 그대로. 줄마다 결과 화면의 표시와 소라의 말, 수첩의 채움 표시, `localStorage` 의 `memory` 와 `task` 를 본다. "저장 실패"는 콘솔에서 `Storage.prototype.setItem = () => { throw new Error("full") }` 를 넣고 붙여 본다. 답장이 뜨지 않고 "다시 붙이기"가 보여야 한다.

더 볼 것: 옮기는 0.5초 동안 셔터를 눌러도 사진이 생기지 않는다. 셔터를 두 번 빠르게 눌러도 한 장이다. 도움 3단계가 차례로 뜬다.

- [ ] **Step 4: 화면을 찍어 본다**

너비 375에서 A-day, B-day, C-day, B-night 넷을 찍어 Read 로 본다. 탑의 잘림과 가림이 한눈에 다른가. 다르지 않으면 `camera` 를 고친다.

- [ ] **Step 5: 커밋**

```bash
git add docs/compare
git commit -m "Compare prototype: Cheomseongdae as an observation puzzle (3 spots x 3 times, 2 tasks)"
```

---

### Task 6: 다이얼과 성산일출봉

**Files:**
- Create: `docs/compare/ui/dial.js`, `docs/compare/ui/seongsan.js`
- Modify: `docs/compare/ui/scene.js`, `docs/compare/main.js`, `docs/compare/style.css`, `docs/compare/places/seongsan.json`(놓는 값)

**Interfaces:**
- Consumes: `judgeContinuous`, `dayOfYear`, `stagedSun`, 전역 `sunAt`(`docs/assets/sun.js`), store, `seong-*.webp`.
- Produces:
  - `createDial(el, {min, max, step, value, wrap: boolean, snaps: number[], major: number, label(v): string, onInput(v), onRelease(v)}): {set(v), shake()}`
  - `sunFor(place, dials): {alt, az, staged: boolean}` (`seongsan.js`) — `sunAt` 을 `try` 로 감싸고, 던지거나 수가 아니면 `stagedSun(h)` 에 `staged: true`.
  - `renderScene` 의 성산 판.
  - `mountPlace` 의 성산 판.

**정한 것.**
- 다이얼은 높이 44픽셀의 가로 눈금 띠다. 가운데에 바늘이 서 있고, 끌면 눈금이 흐른다. 12픽셀이 한 눈금이다. PC에서는 휠 한 칸이 한 눈금. `snaps` 의 값에서 ±1 눈금 안에 놓으면 그 값으로 끌려간다. 눈금 소리는 시험판의 `click(big)` 을 옮기고 크기는 0.5, `major` 눈금마다 큰 소리다. `pointerdown` 전에는 소리를 내지 않는다.

| 다이얼 | 범위 | 한 눈금 | 감아 돎 | 걸림 | 글 |
|---|---|---|---|---|---|
| 좌우 x | -1 → 1 | 0.02 | 아니다 | 없음 | 왼쪽 ↔ 오른쪽 |
| 거리 d | 0 → 1 | 0.02 | 아니다 | 없음 | 가까이 ↔ 멀리 |
| 계절 s | 0 → 1 | 5일(5/365) | 돈다 | 날 14, 104, 195, 287 (1월, 4월, 7월, 10월의 15일) | "10월 15일" |
| 시각 h | 0 → 24 | 10분 | 돈다 | 없음 | "06:40" |

- 다이얼의 값은 소수 넷째 자리에서 반올림해 내보낸다. 눈금을 여러 번 더해 생기는 부동소수의 밀림을 막는다.
- 네 걸림은 똑같이 생겼다. 10월만 다르게 보이지 않는다.
- `fixDistance` 가 true면 d를 0.6에 두고 그 다이얼을 만들지 않으며 `config` 를 로그에 쓴다.
- 풍경: 겹을 `x × 계수 × 틀 너비의 30%` 만큼 왼쪽으로 밀고, `1 + (1 - d) × 계수 × 0.8` 배로 키운다(`transform-origin` 은 겹의 아래 가운데). 계수는 바다 0.1, 능선 0.3, 들판 0.6, 풀 1.0.
- 철: 들판과 풀은 철의 그림 넉 장을 겹쳐 두고, 날이 이웃한 두 철의 가운데 날(14, 104, 195, 287) 사이 어디인지로 두 장의 불투명도를 정한다.
- 하늘: 해의 높이로 네 색을 잇는다. 밤 `#0b1440`(-6도 아래), 새벽 `#f3b58a`(0도, 오전), 저녁 `#e8794a`(0도, 오후), 낮 `#8fc1e8`(10도 위). 겹에는 높이에 따라 `brightness` 0.4 → 1.0.
- 해: `az` 가 240 → 300이고 `alt` 가 -0.83 위면 그린다. 가로는 `(az - 240) / 60 × 틀 너비`, 세로는 수평선에서 `alt / 40 × 틀 높이` 만큼 위. 바다와 능선 겹의 뒤에 둔다.
- 그림자: `time` 이 morning 일 때만 보인다. 맨 앞(풀 위)에 놓고, 세로로 `1.0 - alt / 10 × 0.5` 배(낮을수록 길다), 불투명도 0.55. 좌우와 거리에는 따라 움직이지 않는다(찍는 사람의 그림자다).
- "옛 사진": `renderScene` 을 목표값(`place.target`)과 `{faded: true, outline: true}` 로 한 장 더 놓아 불투명도 0.4로 덮는다. 윤곽선은 능선과 그림자 겹에 `drop-shadow` 넷으로 낸 흰 테다. 켬과 끔은 `store.setOverlay`.
- 포개짐의 알림: 판정이 false에서 true로 바뀌는 순간, 옛 사진이 꺼져 있으면 다이얼 넷에 `shake()`(0.3초, 좌우 2픽셀). 켜져 있으면 아무것도 하지 않는다.
- 다이얼을 굴리는 동안은 풍경만 고치고, 놓을 때 `store.setDials` 를 한 번 부른다.
- 해 계산이 `staged` 로 처음 떨어지면 `fallback` 을 로그에 한 번 쓴다.
- 셔터: `store.addShot("seongsan", {x, d, s, h, matched})`. 판정은 `judgeContinuous(place, dials, sunFor(place, dials))`.
- 결과 화면의 왼쪽 사진은 목표값을 `faded` 로, 오른쪽은 `viewOf(place, shot)`.

- [ ] **Step 1: `dial.js` 를 쓴다**

- [ ] **Step 2: `scene.js` 에 성산을 더하고 `seongsan.js` 를 쓴다**

- [ ] **Step 3: 구도를 잰다**

너비 375에서. 맞지 않으면 `seongsan.json` 의 놓는 값을 고친다. 계수와 판정의 숫자는 고치지 않는다.
- d 1.0: 능선 전체가 풀 위로 보인다.
- d 0.0: 풀의 윗가장자리가 능선의 발보다 위다(풀이 능선을 가린다).
- x -1 과 x 1 에서 능선이 틀 안에서 틀 너비의 15% 넘게 옮겨 가고, 어느 겹의 옆 끝도 틀 안에 드러나지 않는다.
- 목표값에서 그림자의 머리가 들판에 닿는다.

- [ ] **Step 4: 시험표 여덟 줄을 브라우저에서 돌린다**

작업서 4절의 시험표 그대로. "해 계산 라이브러리 실패"는 콘솔에서 `window.sunAt = () => { throw new Error("x") }` 를 넣고 다이얼을 굴린다. 하늘이 시각에 따라 바뀌고, 06:40에 맞추면 포개지고, 로그에 `fallback` 이 한 줄 있어야 한다.

더 볼 것: 계절 다이얼을 12월에서 1월로 넘겨도 풍경이 끊기지 않는다. 시각을 24시에서 0시로 넘겨도 같다. 계절 다이얼이 네 철의 가운데에서 걸린다. 17:30에 지는 해가 틀 안에 보이고 그림자가 없다.

- [ ] **Step 5: 화면을 찍어 본다**

너비 375에서 넷: 처음 값, 목표값에서 옛 사진을 켠 것, 목표값에서 끈 것, 17:30. Read 로 본다. 그림자가 있는 것과 없는 것이 한눈에 다른가.

- [ ] **Step 6: 커밋**

```bash
git add docs/compare
git commit -m "Compare prototype: Seongsan as a four-dial overlay with a computed sun"
```

---

### Task 7: 마지막 물음, 통틀어 돌려 보기, 문서

**Files:**
- Modify: `docs/compare/ui/result.js`, `docs/compare/main.js`, `docs/바뀐-것들.md`, `data/changes-i18n.json`, `docs/assets/changes.js`(도구가 만든다), `docs/넘김.md`, `README.md`(시제품을 여는 법 한 문단)

**Interfaces:**
- Consumes: 앞의 모두.
- Produces: `mountAsk(root, {store, onDone()})` — "한 번 더 하고 싶은 곳은?" 과 단추 넷(성산일출봉, 첨성대, 둘 다, 둘 다 아님).

**정한 것.**
- 두 장소의 `memory` 가 다 true이고 `answer` 가 null이면, 결과 화면에서 "수첩으로"를 누를 때 수첩 대신 물음이 뜬다. 고르면 `store.setAnswer` 가 `answer` 를 로그에 쓰고 수첩으로 간다. 그 뒤에는 다시 뜨지 않고 계속 놀 수 있다.
- 첨성대의 과제 2는 물음의 조건이 아니다.

- [ ] **Step 1: 물음을 쓰고 잇는다**

- [ ] **Step 2: 처음부터 끝까지 두 번 돈다**

저장을 지우고(`localStorage.removeItem("paldo.compare.v1")`) 성산부터 한 번, 다시 지우고 첨성대부터 한 번. 두 번 모두 물음까지 가고, 고른 뒤 수첩에서 다시 장소에 들어갈 수 있다. 콘솔에 오류가 없다.

- [ ] **Step 3: 로그를 본다**

"로그 내보내기"로 받은 JSON에서 두 장소의 `firstSuccessMs`, `shutters`, `helps`, `retried` 가 돈 대로 나오고 `answer` 가 있다.

- [ ] **Step 4: 자동 시험을 모두 돌린다**

Run: `node --test tests/compare-data.test.mjs tests/compare-judge.test.mjs tests/compare-store.test.mjs tests/compare-log.test.mjs tests/sun.test.mjs tests/music.test.mjs`
Expected: 모두 PASS.

- [ ] **Step 5: 공정함을 견준다**

설계서 5절과 작업서 6절에 대어 본다. 두 장소의 받은 그림이 넷씩인가. 소라의 말이 여섯 줄씩인가. 소신이 처음부터 돈 두 번에서 첫 성공까지 걸린 시간을 로그에서 읽어 `docs/넘김.md` 에 적는다(만든 사람의 시간이라 참고일 뿐이다).

- [ ] **Step 6: 비밀값과 개인 경로를 훑는다**

Run: `git grep -nE "gmail|Downloads|AppData|TELEGRAM|token" -- docs/compare tests docs/art-order-2.md docs/superpowers`
Expected: 나오는 줄이 없다.

- [ ] **Step 7: 문서를 고친다**

- `docs/바뀐-것들.md` 의 2026.10.9 맨 위에 한 줄, `data/changes-i18n.json` 에 그 줄의 번역, `node tools/make-changes.mjs`.
- `docs/넘김.md`: 1절에 비교 시제품(여는 주소, 파일, 시험 명령), 2절에 2026.10.9의 결정 둘, 3절에 사용자가 볼 것(받은 그림, 가로 눈금 다이얼, 보는 쪽 서쪽), 4절에 확인하지 못한 것(진짜 손전화, 여섯 사람의 테스트), 5절의 다음 일. 저장소 이름이 바뀐 것(로컬은 `oddity-korea_claude`, 깃허브는 `korea-oddity_claude`)도 적는다.
- `README.md` 에 시제품을 여는 법: `py -m http.server 4319 --directory docs` 를 띄우고 `http://localhost:4319/compare/`. 같은 와이파이의 손전화에서는 PC의 주소로 연다.

- [ ] **Step 8: 커밋**

```bash
git add docs data README.md
git commit -m "Compare prototype: the closing question, and the handoff brought up to date"
```
