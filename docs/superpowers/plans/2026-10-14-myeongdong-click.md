# 명동 쪽: 짓는 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 눌러 푸는 틀(`godot/click.gd`)을 쪽마다의 줄거리 파일로 넓히고, 그 위에 명동 쪽(명동역 → 명동 거리, 아주머니, 화장품 언니, 일본 가족, 탑의 단서, 할머니의 답장)을 짓는다.

**Architecture:** 줄거리는 `godot/data/click/<쪽>.json` 에 있다. 상태와 규칙은 그림 없는 `click_rules.gd` 가 맡고 머리 없이 시험한다. `click.gd` 는 쪽의 이름을 받아 그 파일을 읽는다. 얻은 것은 `got:<열쇠>` 표시로, 답장은 표시에 따라 고른 줄로 나타낸다.

**Tech Stack:** Godot 4.7.2(GDScript), 웹 뽑기, Node(`tools/godot-data.mjs`), Python(`tools/godot-fonts.py`, `tools/walk-sheet.py`, PIL), Codex CLI(`tools/art-order.sh`).

**Spec:** `docs/superpowers/specs/2026-10-14-myeongdong-click-design.md`

## Global Constraints

- 지금 판(`?click` 없이 여는 홍대 판)과 골목 맛보기(`?click`)는 움직임이 바뀌지 않는다. 둘의 시험과 시연이 그대로 통과한다.
- 웹은 `?click=myeongdong`, 컴퓨터는 `-- --click=myeongdong`, 시연은 `-- --click-demo=myeongdong`. 이름 없는 `--click`, `--click-demo`, `?click` 은 골목이다.
- 말은 한국어만, 줄거리 파일에 바로 적는다. 글꼴(개구)에 없는 말줄임표(U+2026)와 가운뎃점(U+00B7)을 쓰지 않는다.
- 인물 그림은 B의 얼굴, 어른 4등신, 유이 3.5등신(`docs/art-order-15.md`). 꼬마는 유이보다 작다. 몸을 드러내지 않는다. 실제 가게와 상표의 이름을 쓰지 않는다.
- 엇나간 건네기에는 벌이 없다. 확인이 안 된 사실은 말에서 빼거나 누그러뜨린다.
- 2004년 명동의 일본 손님은 "그때도 일본 손님이 꽤 왔지" 정도로만 말한다.
- `$GODOT` 는 사용자의 내려받기 폴더에 있는 `Godot_v4.7.2-stable_win64_console.exe`.
- 커밋 작성자 주소는 `13573570+destory1984@users.noreply.github.com`. 깃허브에 올리는 것은 이 계획에 없다(4시간 간격은 넘김 문서를 따른다).
- 문서에 틸드를 쓰지 않는다. 범위는 → 로 적는다.

## Review Focus

1. 쪽을 바꿔 열어도(골목 → 명동 → 골목) 앞 쪽의 상태가 섞이지 않는다. → Task 2의 `test_chapters_isolated`.
2. 3번 출구로 나갔다가 돌아온 뒤 6번으로 나가면 답장의 첫 줄이 "너도 3번으로 나갔구나"가 된다. 3번에 두 번 가도 표시는 한 번이다. → Task 4의 `test_reply_lines`.
3. 아주머니의 말을 듣기 전에 사진을 탑에 대면 단서가 서지 않고, 들은 뒤에는 선다. → Task 4의 `test_photo_before_hint`.
4. 같은 거스름돈 다발을 두 번 건네거나 계란빵을 두 번 받으려 해도 가방과 표시가 한 번만 바뀐다. → Task 4의 `test_repeat`.
5. 인물 그림이 없거나 이름이 틀리면 게임이 멈추지 않고 임시 덩어리로 선다. → Task 3 Step 3.

---

### Task 1: 사실 넷을 확인한다

**Files:**
- Modify: `docs/재주-목록.md`(3절과 4-2절에 새 줄), `docs/superpowers/specs/2026-10-14-myeongdong-click-design.md`(2절)

- [ ] **Step 1: 찾아본다.** 명동역 6번(명동 거리)과 3번(남산) 출구, 명동역 출구 안내판에 일본어가 적히는지, 명동 노점이 현금을 주로 받는지, 명동 계란빵의 값(2026년 기준).
- [ ] **Step 2: 적는다.** 재주-목록에 "출구 안내판에서 일본어를 찾아 읽는다"(3절), "노점은 현금이 편하고 작은 돈을 챙겨 둔다"(4-2절)를 더하고 근거와 날을 적는다. 설계서 2절에 결과를 적는다. 값이 확인되면 Task 4의 말에 넣고, 안 되면 값을 말하지 않는다.
- [ ] **Step 3: 커밋** `git commit -m "Skills: Myeongdong exits, sign languages, street-food cash; checked"`

### Task 2: 줄거리를 쪽마다의 파일로

**Files:**
- Move: `godot/data/click.json` → `godot/data/click/alley.json`
- Modify: `godot/click.gd`(`_ready`, `_restart`, 머리말), `godot/game.gd:136-142`, `godot/tests/test_click_story.gd`, `tools/godot-fonts.py:26-37`

**Interfaces:**
- Produces:
  - 줄거리 파일의 맨 위에 `"first": "<곳의 열쇠>"`(골목은 `"alley"`). `_restart` 는 이 곳으로 들어간다.
  - `click.gd` 의 `chapter: String`(기본 `"alley"`). 정하는 차례: 컴퓨터는 사용자 인자 `--click=<이름>` 또는 `--click-demo=<이름>`, 웹은 `location.search` 의 `click=<이름>`. 이름이 비면 `"alley"`. 파일이 없으면 `push_error` 하고 `"alley"`.
  - 시험: `test_click_story.gd` 는 `res://data/click/` 의 모든 `.json` 에 대해 쪽에 매이지 않는 시험(`test_wrong_pairs`, `test_everyone_speaks`, `test_targets_exist`, `test_font_has_glyphs`)을 돌린다. 골목의 길 시험(`test_paths`, `test_repeat`, `test_buy_first`)은 `alley.json` 에만.
  - `play(data: Dictionary, moves: Array, picks: Array) -> Dictionary` 로 바꾸어 쪽의 자료를 받는다(Task 4가 쓴다).

- [ ] **Step 1: 시험을 먼저 고친다.** 경로를 `res://data/click/alley.json` 으로, 쪽에 매이지 않는 시험을 파일마다 돌게, `test_chapters_isolated` 를 더한다(골목 한 판을 끝까지 두고 새 판을 시작하면 상태가 `first` 와 `start` 그대로다).
- [ ] **Step 2: 돌려서 실패를 본다.** `GODOT=... bash godot/tests/run.sh`. Expected: 파일이 없어 실패.
- [ ] **Step 3: 옮기고 짓는다.** `git mv`, `"first": "alley"` 를 넣고, `click.gd` 와 `game.gd` 와 글꼴 도구를 고친다(글꼴 도구는 `godot/data/click/*.json` 을 모두 읽는다).
- [ ] **Step 4: 통과를 본다.** 시험 `0 failed` 둘. `$GODOT --path godot -- --click-demo` 의 끝 줄이 앞과 같다(`place=open`, `gaveDrinks`, `bag=["card"]`, `ask_fits=true`).
- [ ] **Step 5: 커밋** `git commit -m "Click frame: one story file per chapter; chapter picked by --click=<name> or ?click=<name>"`

### Task 3: 틀에 더하는 것 셋(얻은 것, 답장, 인물 그림)

**Files:**
- Modify: `godot/click_rules.gd`, `godot/tests/test_click_rules.gd`, `godot/click.gd`

**Interfaces:**
- Produces (`click_rules.gd`, 모두 `static`):
  - `reply(data: Dictionary, state: Dictionary) -> Array` — `data.reply` 는 `[{ "text": String, "need"?: Array, "not"?: Array }, ...]`. 맞는 줄의 `text` 를 차례대로 돌려준다. `data.reply` 가 없으면 `[data.end]`.
  - 얻은 것은 표시 `got:<열쇠>` 로 둔다(`["set", "got:exit"]`). 새 명령은 없다.
- 줄거리 파일에 더하는 열쇠: `goals: [{ "id": String, "name": String }]`(없으면 동그라미를 그리지 않는다), `reply`, 사람마다 `art`(그림 열쇠, `godot/art/<art>.png`)와 `face`(`godot/art/<face>.png`).

- [ ] **Step 1: 시험.** `test_reply`: `reply` 줄 셋(조건 없음, `need:["wrongExit"]`, `not:["wrongExit"]`)에서 표시가 없으면 첫째와 셋째, `wrongExit` 이 서면 첫째와 둘째. `reply` 가 없는 자료는 `[end]`.
- [ ] **Step 2: 실패를 본다.** `bash godot/tests/run.sh`. Expected: `reply` 가 없어 실패.
- [ ] **Step 3: 짓는다.**
  - `reply` 를 `click_rules.gd` 에.
  - `click.gd` 의 `end` 는 `_clear_column()` 뒤에 종이 한 장(크림색 상자, 줄마다 `_line(…, 32, INK)`, 맨 끝에 오른쪽으로 붙인 "할머니가")을 띄우고 "처음부터" 단추를 둔다. `reply` 가 없는 골목은 지금처럼 보인다(줄 하나에 "할머니가" 없음: `data.has("reply")` 일 때만 서명).
  - 동그라미: 가방 아래 줄(오른쪽 위, 가방 밑 8px)에 `goals` 의 수만큼 지름 30의 동그라미. `got:<id>` 가 서면 `GOLD` 로 찬다. `_next` 에서 가방과 함께 다시 그린다.
  - 인물: `_stand` 는 `art` 가 있고 `ResourceLoader.exists` 이면 `Sprite2D`(키 = `YUI_H × height`, 발이 `FEET` 에), 없으면 지금의 덩어리. `_face(who)` 는 사람의 `face` 그림이 있으면 그것을.
- [ ] **Step 4: 통과를 본다.** 시험 `0 failed`, 골목 시연의 끝 줄이 앞과 같다.
- [ ] **Step 5: 커밋** `git commit -m "Click frame: goal dots, grandma's reply by flags, people drawn from art"`

### Task 4: 명동의 줄거리(자료)

**Files:**
- Create: `godot/data/click/myeongdong.json`
- Modify: `godot/tests/test_click_story.gd`(명동의 길 시험)

**Interfaces:**
- Consumes: Task 2의 `play(data, moves, picks)`, Task 3의 `reply`, `got:` 표시.
- 곳: `station`(walk, `md-exit`, 시작 50%), `wrong`(still, `md-wrong`), `street`(walk, `md-street`, 시작 8%). `first: "station"`.
- 자리(% 는 그림의 너비와 높이): `station` — `exit3`(1, 28, 13, 44), `board`(15.5, 38, 8, 28, 이름표 "안내도"), `exit8`(58, 36, 12, 36), `exit6`(87.5, 28, 12, 44). `wrong` — `back`(0, 0, 100, 100). `street` — `down`(0, 30, 9, 50, 이름표 "명동역"), `tower`(22, 6, 8, 32), `cart`(67, 38, 14, 40), `shop`(80, 30, 15, 45, 이름표 "화장품").
- 사람(`street`): `ajumma`(수레 앞 74%), `clerk`(화장품 가게 앞 88%), `mom`(62%), `dad`(57%), `kid`(59.5%, height 0.75). 일본 가족 셋은 하나의 대상 `family` 로 다룬다: `mom` 의 자리에 누를 곳을 두고 `dad`, `kid` 는 그림만 선다(`"tap": false`).
- 처음 가방: `card`(교통카드), `photo`(2004년 사진), `bill`(만 원). 얻는 것: `coins`(천 원 다발), `bread`(계란빵), `sample`(샘플), `sticker`(스티커).
- 표시: `wrongExit`, `onStreet`, `queueFree`, `hint`(아주머니가 탑을 보라 함), `got:exit`, `got:bread`, `got:clue`, `got:sticker`, `askedWay`, `helpedFamily`.
- `goals`: `exit`("출구"), `bread`("계란빵"), `clue`("단서"), `sticker`("스티커").
- 끝: 단서(`got:clue`)가 서면 거리의 `down` 을 누를 때 `end`. 가족에게 아직 답하지 않았으면 그 앞에 가족이 다가와 묻는다(`askedWay` 를 세우고 `ask`).
- `reply`: [`need:["wrongExit"]` "너도 3번으로 나갔구나. 나는 세 번 돌았단다.", `not:["wrongExit"]` "출구는 맞게 나왔구나. 나는 세 번 돌았단다.", 조건 없음 "탑이 오른쪽이었다는 건 몰랐구나.", `need:["helpedFamily"]` "길 잃은 사람을 도왔다니, 내가 다 고맙다."].

- [ ] **Step 1: 시험.** `test_md_paths`(모두 끝에 닿는다):
  - A 설계서의 차례: 안내도 → 6번 → 아주머니(줄 서!) → 화장품 언니에게 만 원 → 아주머니에게 천 원 다발 → 아주머니 누름(사진 봐 줌) → 사진을 탑에 → `down`(가족이 물음, 3번을 고름). 끝에 `got:` 넷, 가방에 `bread`.
  - B 3번으로 헤맴: 3번 → `back` → 6번 → … A와 같다. 답장 첫 줄이 "너도 3번으로".
  - C 가족에게 틀리게: … 8번을 고름. `helpedFamily` 없음, `got:sticker` 없음, 그래도 끝.
  - `test_photo_before_hint`: 거리에서 바로 사진을 탑에 대면 `got:clue` 가 서지 않고 유이의 말("탑은 보이는데")이 나온다. 아주머니의 말 뒤에는 선다.
  - `test_repeat`: 천 원 다발을 두 번 건네도 계란빵 하나. 만 원을 두 번 바꿀 수 없다(두 번째는 언니의 다른 말).
  - `test_reply_lines`: A의 답장은 "출구는 맞게", "탑이 오른쪽", "도왔다니" 셋. B는 "너도 3번으로"로 시작.
- [ ] **Step 2: 실패를 본다.** 파일이 없어 실패.
- [ ] **Step 3: `myeongdong.json` 을 쓴다.** 설계서 3절의 사슬과 말. 고정된 말: 할머니의 글 "3번으로 나갔더니 오르막뿐이었다. 세 번을 돌았다.", 아주머니 "줄 서!", "노란 주전자 간판... 명동엔 이런 가게 없었어. 탑이 어디 보이는지 봐 봐.", 유이 "여기선 탑이 왼쪽이야. 사진에선 오른쪽. 찍은 곳은 더 북쪽이야.", 엇나간 건네기 셋(설계서 3절). 아주머니의 2004년 말은 "그때도 일본 손님이 꽤 왔지".
- [ ] **Step 4: 통과를 본다.** `0 failed` 둘.
- [ ] **Step 5: 커밋** `git commit -m "Myeongdong story data; paths, reply lines and repeats tested"`

### Task 5: 그림을 받아 넣는다

**Files:**
- Create: `docs/art-order-20.md`, `godot/art/md-ajumma.png`(와 `-face`), `md-clerk`, `md-mom`, `md-dad`, `md-kid`
- Modify: `docs/water/art/md-street.webp`(수레 앞의 사람을 지운 판), `tools/godot-data.mjs:13`(`ART` 에 `md-exit`, `md-wrong`, `md-street`, `photo-2004`), `godot/data/click/myeongdong.json`(`art`, `face`), `THIRD-PARTY.md`

- [ ] **Step 1: 주문한다.** 인물 다섯(자홍 바탕 1024 × 1536, 한 사람씩, 참고 그림 `assets/codex/order15-f/band-f.png` 의 얼굴과 등신)과 거리 한 장(참고 `md-street.webp`, 수레 앞의 모자 쓴 남자만 지우고 나머지는 그대로). 주문한 말을 `assets/codex/order20/*.txt` 에 둔다.
  - 아주머니: 쉰 살 넘은, 짧은 파마머리, 앞치마, 토시, 집게를 든 손, 바쁘게 웃는다.
  - 화장품 언니: 스무 살 넘은, 하나로 묶은 긴 머리, 흰 셔츠에 가게의 연분홍 앞치마, 두 손 가득 샘플, 활짝 웃는다.
  - 일본 가족: 엄마(어깨까지의 머리, 베이지 트렌치코트, 손에 지도), 아빠(안경, 남색 점퍼, 목에 카메라), 꼬마(다섯 살쯤, 노란 모자, 엄마 다리 뒤에 반쯤 숨음). 셋 다 난처한 얼굴.
- [ ] **Step 2: 받은 것을 본다.** 얼굴이 B인가, 등신이 맞는가, 자홍 테두리가 깨끗한가, 거리 그림에서 사람만 지워졌는가. 틀린 것은 고칠 것을 번호로 적어 다시 주문한다.
- [ ] **Step 3: 사용자에게 보인다.** 다섯과 거리를 한 장의 견본으로 보인다. 넣기 전에 사용자의 답을 기다린다.
- [ ] **Step 4: 자르고 넣는다.** `py tools/walk-sheet.py <받은 그림> <낼 그림> 524`(꼬마는 360), 얼굴 180 × 180을 위쪽에서. 거리는 1920 × 640 webp. `node tools/godot-data.mjs`, `$GODOT --headless --path godot --import`.
- [ ] **Step 5: 적고 커밋.** 발주서와 THIRD-PARTY에 출처를 적는다. `git commit -m "Myeongdong art: five people and the street without the old vendor"`

### Task 6: 명동의 시연, 웹, 넘김

**Files:**
- Modify: `godot/click.gd`(`_demo` 를 쪽마다), `docs/godot-web/`, `docs/넘김.md`, `docs/기획서-일본-할머니의-수첩.md`(9절의 명동 줄)

- [ ] **Step 1: 시연.** 쪽마다 시연의 차례를 둔다(골목은 지금 것). 명동: 첫 화면 → 3번 → 돌아옴 → 안내도 → 6번 → 아주머니 → 사진을 탑에(아직 아님) → 만 원을 언니에게 → 샘플을 아주머니에게(엇나감) → 천 원 다발을 아주머니에게 → 아주머니 → 사진을 탑에 → `down` → 가족에게 3번 → 답장. 끝 줄 `print("click demo: chapter=", chapter, " place=", place, " flags=", state.flags, " bag=", state.bag, " ask_fits=", ask_bottom <= 1040.0)`.
- [ ] **Step 2: 돌리고 본다.** `$GODOT --path godot -- --click-demo=myeongdong`. Expected: `got:` 넷, `wrongExit`, `helpedFamily`, `ask_fits=true`. 화면을 하나하나 본다. 골목 시연과 홍대 시연도 다시 돌린다.
- [ ] **Step 3: 웹.** 뽑고, `http://localhost:8319/godot-web/?click=myeongdong` 을 앱 안의 브라우저(컴퓨터 크기)에서 진짜 누르기로 출구 → 잔돈 → 단서까지 한다. `?click` 과 이름 없는 주소도 연다.
- [ ] **Step 4: 문서.** 넘김 문서에 무엇을 지었는지, 여는 법, 확인한 것과 흠, 사용자에게 보아 달라고 할 것. 기획서 9절의 명동 줄에 사람과 사슬을 적는다.
- [ ] **Step 5: 커밋** `git commit -m "Myeongdong chapter: demo, web build, handoff"`
