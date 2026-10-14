# 눌러 푸는 어드벤처의 맛보기: 짓는 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홍대 뒷골목에서 유이가 누른 자리로 걷고, 가방의 물건을 건네 연습실의 문을 여는 5 → 8분짜리 맛보기를 Godot에 짓는다.

**Architecture:** 규칙을 고르고 상태를 바꾸는 일은 그림 없는 `click_rules.gd` 에 두어 머리 없이(headless) 시험한다. 장면, 걷기, 가방, 대화는 `click.gd` 가 맡고 `click_rules.gd` 가 돌려준 명령(말하기, 고르기, 장면 넘기기, 끝)을 화면에 옮긴다. 줄거리는 모두 `godot/data/click.json` 에 있다.

**Tech Stack:** Godot 4.7.2(GDScript), 웹 뽑기(`export_presets.cfg` 의 "Web"), 글꼴 도구 `tools/godot-fonts.py`(Python).

**Spec:** `docs/superpowers/specs/2026-10-14-click-adventure-design.md`

## Global Constraints

- `godot/game.gd` 에서 고치는 것은 맛보기로 바꾸는 몇 줄뿐이다. `?click` 이나 `--click` 이 없으면 지금 판이 그대로 뜬다.
- 화면은 지금 판과 같다: 기준 720 × 1040, 위에 그림 틀 720 × 720, 긴 그림의 너비 2160.
- 말은 한국어만. 글은 `click.json` 에 바로 적는다(열쇠를 거치지 않는다).
- 저장, 소리, 네 나라 말은 넣지 않는다.
- 밝고 따뜻하게. 어둑한 빛을 쓰지 않는다. 인물을 야하게 그리지 않는다. 실제 가게와 상표의 이름을 쓰지 않는다.
- 엇나간 건네기에는 벌이 없다. 우스운 대꾸만 나온다.
- 확인이 안 된 사실은 말에서 빼거나 "가게마다 다르긴 해"처럼 누그러뜨린다.
- Godot: 사용자의 내려받기 폴더에 있는 `Godot_v4.7.2-stable_win64_console.exe` (아래에서 `$GODOT`)
- 커밋 작성자 주소는 `13573570+destory1984@users.noreply.github.com`. 깃허브에 올리는 것은 이 계획에 없다.
- 문서에 틸드를 쓰지 않는다. 범위는 → 로 적는다.

## Review Focus

1. 걷는 중에 다른 곳을 누르거나, 말이 떠 있는 동안 그림을 누르면 두 반응이 겹치지 않고 마지막 것 하나만 돈다. → Task 4의 시연에 걷는 중 다시 누르기를 넣는다.
2. 물건을 들고 빈 데를 누르면 물건이 내려지고 유이는 그리로 걷는다(건네기가 아니다). → Task 4 Step 5.
3. 순서를 바꿔(기사 먼저, 음료 나중, 또는 음료 없이) 가도 끝에 닿는다. → Task 3의 `test_paths`.
4. 이미 한 일을 다시 누르면(음료를 또 사려 함, 안내판을 다시 읽음) 상태가 두 번 바뀌지 않고 다른 말이 나온다. → Task 3의 `test_repeat`.
5. 손전화의 좁은 화면에서 가방의 칸과 고를 말이 손가락으로 누를 만큼 크다(칸 하나가 88 × 88 이상, 고를 말의 높이 80 이상). → Task 6 Step 2.

---

### Task 1: 배우는 것 셋을 확인한다

**Files:**
- Modify: `docs/재주-목록.md`(3절 표 끝, 4절 4-2의 표 끝에 줄을 더한다)
- Modify: `docs/superpowers/specs/2026-10-14-click-adventure-design.md`(3절 "배우는 것" 표의 확인 칸)

- [ ] **Step 1: 찾아본다.** 셋을 공식 자료 먼저, 없으면 믿을 만한 안내 글로 본다.
  - 편의점에서 티머니 같은 교통카드로 물건값을 낼 수 있는가(티머니 누리집).
  - 처음 찾아갈 때 음료 상자를 사 가는 버릇(한국관광공사 또는 안내 글).
  - 지하의 호수를 "B01", "B1"처럼 적는 표기(도로명주소 안내 또는 실제 건물 안내판의 예).
- [ ] **Step 2: 적는다.** 재주-목록에 셋을 더하고(번호를 잇고, "맡는 곳"은 홍대, "근거"에 확인한 곳과 날), 설계서의 확인 칸을 채운다. 확인 못 한 것은 "확인 못 함"으로 적고 Task 3의 말을 누그러뜨린다.
- [ ] **Step 3: 커밋**

```bash
git add docs/재주-목록.md docs/superpowers/specs/2026-10-14-click-adventure-design.md
git commit -m "Skills: three for the studio-door trial, with sources"
```

### Task 2: 규칙을 고르고 상태를 바꾸는 조각

**Files:**
- Create: `godot/click_rules.gd`
- Create: `godot/tests/test_click_rules.gd`

**Interfaces:**
- Produces (`click_rules.gd`, `extends RefCounted`, 모두 `static`, `class_name` 을 쓰지 않고 `preload` 로 부른다):
  - 상태: `{ "flags": Array[String], "bag": Array[String] }`
  - `has(state: Dictionary, cond: String) -> bool` — `"bag:drinks"` 는 가방에 있는가, 나머지는 표시가 섰는가.
  - `find(rules: Array, act: String, target: String, item: String, state: Dictionary) -> Dictionary` — `act` 는 `"tap"` 또는 `"give"`. 줄의 `on`, `target` 이 같고, `give` 이면 `item` 도 같고, `need` 가 모두 서 있고 `not` 이 하나도 안 선 첫 줄. 없으면 `{}`.
  - `run(actions: Array, state: Dictionary) -> Array` — 할 일을 차례로 돈다. `["give", item]`, `["take", item]`, `["set", flag]` 는 상태만 바꾸고(같은 물건이나 표시를 두 번 넣지 않는다), `["say", who, words]`, `["ask", [[label, actions], ...]]`, `["goto", place]`, `["end"]` 는 그대로 돌려줄 명령의 줄에 넣는다.
  - `fallback(data: Dictionary, act: String, target: String, item: String) -> Array` — `tap` 이면 `data.idle[target]`, `give` 이면 `data.wrong[item + ">" + target]`, 없으면 `data.wrong["*"]`. 모두 `["say", who, words]` 하나를 담은 명령의 줄이다.

- [ ] **Step 1: 시험을 쓴다.** `godot/tests/test_click_rules.gd` 는 `extends SceneTree`, `_init()` 에서 시험을 돌리고 실패 수를 세어 `quit(fails)` 한다. 시험들:
  - `test_has`: 상태 `{flags:["a"], bag:["card"]}` 에서 `has(s,"a")` 참, `has(s,"bag:card")` 참, `has(s,"b")` 거짓.
  - `test_find_first_match`: 같은 `on/target` 의 줄 둘 가운데 `need` 가 맞는 것이 고르고, 둘 다 맞으면 위의 것.
  - `test_find_give_needs_item`: `give` 줄은 `item` 이 다르면 안 맞는다.
  - `test_find_not`: `not:["bag:drinks"]` 인 줄은 가방에 음료가 있으면 안 맞는다.
  - `test_run_state`: `[["give","drinks"],["give","drinks"],["set","x"],["take","card"]]` 뒤에 가방이 `["drinks"]`, 표시가 `["x"]`, 돌려준 명령이 빈 줄.
  - `test_run_commands`: `[["say","y","안녕"],["goto","open"]]` 이 그대로 같은 차례로 돌아온다.
  - `test_fallback`: `idle.cat`, `wrong["drinks>cat"]`, `wrong["*"]` 를 차례로 고른다.
- [ ] **Step 2: 돌려서 실패를 본다.**
  Run: `$GODOT --headless --path godot --script res://tests/test_click_rules.gd`
  Expected: `click_rules.gd` 가 없어 불러오기에서 실패한다.
- [ ] **Step 3: `click_rules.gd` 를 짓는다.** 위 Interfaces의 다섯 함수.
- [ ] **Step 4: 돌려서 통과를 본다.** 같은 명령. Expected: 시험마다 `ok` 한 줄, 끝에 `0 failed`, 끝남 코드 0.
- [ ] **Step 5: 커밋**

```bash
git add godot/click_rules.gd godot/tests/test_click_rules.gd
git commit -m "Click trial: rule matching and state, with headless tests"
```

### Task 3: 골목의 줄거리(자료)

**Files:**
- Create: `godot/data/click.json`
- Create: `godot/tests/test_click_story.gd`

**Interfaces:**
- Consumes: Task 2의 `find`, `run`, `fallback`.
- Produces (`click.json` 의 꼴, Task 4가 읽는다):
  - `start`: `{ "flags": [], "bag": ["card"] }`
  - `items`: 열쇠 → `{ "name": 글, "color": "#rrggbb" }`. 열쇠는 `card`(교통카드), `drinks`(음료 상자).
  - `places`: `alley`(`{ "art": "hd-street", "kind": "walk", "start": 6 }`), `open`(`{ "art": "hd-door", "kind": "still" }`).
  - `spots`: 곳마다 `[{ "id", "x", "y", "w", "h", "label"? }]`. 자리는 그림 너비와 높이의 %. `alley`: `store`(편의점, `x 21, y 30, w 10, h 42`, 임시 간판 "편의점"), `board`(안내판, 계단 왼쪽 `x 73.5, y 40, w 3.5, h 22`, 임시 간판 "안내판"), `door`(지하 계단, `x 77.3, y 38, w 5, h 34`). `open`: `singer`(문 가운데 `x 35, y 10, w 30, h 85`).
  - `people`: `clerk`(`x 26`, 이름 "편의점 알바"), `rider`(`x 69`, "배달 기사"), `cat`(`x 75`, "고양이"). 모두 `alley` 에 선다. 임시 그림의 색 `color` 를 둔다.
  - `who`: 말하는 사람 → `{ "name", "color" }`. `y`(유이), `clerk`, `rider`, `f`(여자 보컬, 이름은 홍대 판의 `nameF` 와 같은 "서윤"), `cat`, `note`(할머니의 수첩).
  - `rules`: 줄마다 `{ "on", "target", "item"?, "need"?, "not"?, "do" }`.
  - `idle`, `wrong`: Task 2의 `fallback` 이 읽는 꼴.
  - `end`: 끝에 띄울 글 한 줄.
- 표시의 이름: `wantDrink`(할 일이 생김), `askedRoom`(기사가 물음), `rang`(벨을 누름). 물건을 건네 끝나면 `gaveDrinks`.

- [ ] **Step 1: 시험을 쓴다.** `test_click_story.gd`(`extends SceneTree`)는 `click.json` 을 읽고, "누름이나 건네기의 줄"을 Task 2의 함수로 흉내 낸다. `ask` 명령은 주어진 차례의 고를 말을 고른 것으로 치고 그 `actions` 를 `run` 한다. `goto` 는 곳을 바꾼다. `end` 가 나오면 끝.
  - `test_paths`: 세 길이 모두 `end` 에 닿는다.
    - A(설계서의 차례): 문 누름 → 알바 누름 → 알바에게 카드 건넴 → 기사 누름 → 안내판 누름(맞는 줄 고름) → 서윤에게 음료 건넴. 끝의 표시에 `gaveDrinks`.
    - B(기사 먼저): 기사 → 안내판(맞는 줄) → 문이 열림 → 서윤 누름. 끝의 표시에 `gaveDrinks` 없음, 가는 길에 유이가 빈손을 멋쩍어하는 말(`who` 가 `y`)이 하나 있다.
    - C(헤맴): 안내판(기사 전) → 기사 → 안내판에서 틀린 줄 하나 → 맞는 줄 → 서윤에게 음료 없이 누름. 끝에 닿는다.
  - `test_repeat`: 음료를 산 뒤 카드를 다시 건네도 가방의 음료가 하나이고 다른 말이 나온다. 문이 열린 뒤 안내판은 `open` 곳에 없으므로 흉내에서 빠진다.
  - `test_wrong_pairs`: 물건 둘 × 대상(`clerk`, `rider`, `cat`, `board`, `door`, `singer`) 가운데 규칙이 없는 짝마다 `fallback` 이 `wrong["*"]` 가 아닌 제 대꾸를 낸다. 적어도 `drinks>cat`(고양이가 상자에 들어가 눕는다), `drinks>clerk`("환불도 1+1은 안 돼요!"), `card>cat`, `card>rider` 는 제 대꾸가 있다.
  - `test_everyone_speaks`: `idle` 에 `clerk`, `rider`, `cat`, `board`, `door`, `store`, `singer` 가 모두 있다. 고양이의 `idle` 은 둘 이상이고 누를 때마다 돌아간다(Task 4가 돌린다. 여기서는 배열인지와 길이만 본다).
- [ ] **Step 2: 돌려서 실패를 본다.** Run: `$GODOT --headless --path godot --script res://tests/test_click_story.gd`. Expected: `click.json` 이 없어 실패.
- [ ] **Step 3: `click.json` 을 쓴다.** 설계서 3절의 사슬을 따른다. 고정된 말:
  - 수첩의 한 줄(`note`): "남의 곳에 처음 갈 때는 마실 것 한 상자."
  - 알바의 버릇: 첫마디는 늘 "1+1이에요!"로 시작한다. 교통카드로 낼 수 있다고 일러 준다(Task 1의 확인에 맞춘다).
  - 기사: 짜장면 두 그릇을 들고 B01호를 찾는다. 찾아 주면 "고마워요!" 하고 벨을 누른다. 짜장면은 밴드가 시킨 것이다.
  - 안내판의 고를 말 셋: "B01 두 정거장", "B02 두부 공방", "1F 정거장 카페". 유이의 앞말: "글자가 느려… '두 정거장'을 찾자." 틀린 줄을 고르면 기사가 우스운 대꾸를 하고 다시 고르게 한다.
  - 서윤에게 음료를 건네면 웃는다. 빈손이면 유이가 멋쩍어하고 서윤이 괜찮다고 한다. 둘 다 `end`.
  - `end`: "맛보기는 여기까지. 연습실 안은 홍대 판에 있다."
  - 장면 넘기기: `rang` 이 서면 `["goto","open"]`.
- [ ] **Step 4: 돌려서 통과를 본다.** 같은 명령. Expected: `0 failed`.
- [ ] **Step 5: 커밋**

```bash
git add godot/data/click.json godot/tests/test_click_story.gd
git commit -m "Click trial: the alley story as data; three paths reach the end"
```

### Task 4: 장면, 걷기, 가방, 대화

**Files:**
- Create: `godot/click.gd`, `godot/click.tscn`(뿌리 하나, `game.tscn` 과 같은 꼴)
- Modify: `godot/game.gd:134-144`(`_ready` 맨 앞)
- Modify: `tools/godot-fonts.py:17-24`(읽는 글에 `click.gd` 와 `click.json` 의 글을 더한다)

**Interfaces:**
- Consumes: Task 2의 함수들, Task 3의 `click.json`.
- Produces: `click.gd` 의 `press(at: Vector2)`(그림 위의 자리를 누른 것), `pick(item: String)`(가방의 칸을 누른 것), `choose(index: int)`(고를 말을 고른 것), `place`(지금 곳의 열쇠), `state`. Task 5의 시연이 이것들을 부른다.

- [ ] **Step 1: 들어가는 길.** `game.gd` 의 `_ready` 맨 앞에서, `"--click" in OS.get_cmdline_user_args()` 이거나(`--click-demo` 도 포함) 웹에서 `JavaScriptBridge.eval("location.search")` 에 `click` 이 들었으면 `get_tree().change_scene_to_file.call_deferred("res://click.tscn")` 하고 돌아간다. 그 밖의 줄은 고치지 않는다.
- [ ] **Step 2: 장면.** `game.gd` 의 `_build_stage`, `_walk`, `_still`, `_light_up`, `_ring_at`, `_box`, `_talk_row`, `_button` 과 같은 방법으로 세운다(필요한 것만 베끼고 줄여 쓴다. 상수 `VIEW`, `WORLD`, `STILL`, `SPEED`, `FEET`, 빛깔들은 같은 값). 빛은 `game.gd` 의 `LIGHT["hdStreet"]` 와 `LIGHT["hd-door"]` 의 값을 옮겨 쓴다. 임시 인물은 둥근 모서리의 색 덩어리(유이 키의 0.9배, 고양이는 0.3배)에 이름표. 누를 곳에는 지금 판의 흰 고리.
- [ ] **Step 3: 걷기와 누르기.** 빈 데를 누르면 그 x로 걷는다. 누를 곳(자리, 사람)을 누르면 그 앞(사람이면 110 비켜서)까지 걷고 닿으면 `tap` 이나 `give` 로 규칙을 찾는다(`find` → 없으면 `fallback`) → `run` → 돌려받은 명령을 차례로 화면에 옮긴다. 걷는 중에 다시 누르면 앞의 목적지를 버린다. 말이나 고를 말이 떠 있는 동안(`busy`)에는 그림을 눌러도 아무 일이 없다.
- [ ] **Step 4: 명령 옮기기.** `say` 는 아래 칸에 말풍선(얼굴 자리에는 `who` 의 색 동그라미와 이름), 다음 명령은 "다음" 단추로. `ask` 는 고를 말을 단추로(높이 80 이상). `goto` 는 곳을 바꿔 다시 그린다. `end` 는 끝 글과 "처음부터" 단추. 고양이의 `idle` 은 누를 때마다 다음 것을 낸다.
- [ ] **Step 5: 가방.** 그림 틀의 오른쪽 위에 칸 넷(칸 하나 88 × 88, 지금 판의 `dots` 자리). 칸에는 물건의 색 동그라미와 이름. 칸을 누르면 집어 들고(칸 테두리가 `GOLD` 로 빛난다), 같은 칸을 다시 누르면 내려놓는다. 들고 누를 곳을 누르면 `give`, 빈 데를 누르면 내려놓고 걷는다. 물건이 들어오면 칸이 한 번 통통 튄다.
- [ ] **Step 6: 글꼴.** `tools/godot-fonts.py` 가 `click.gd` 와 `click.json` 의 모든 글을 더해 읽게 하고 돌린다. Run: `python tools/godot-fonts.py`. Expected: 조각의 수가 23과 같거나 많다.
- [ ] **Step 7: 살핀다.** Run: `$GODOT --headless --path godot --check-only --script res://click.gd` 와 같은 명령으로 `game.gd`. Expected: 오류 없음. Task 2, 3의 시험도 다시 돌려 `0 failed`.
- [ ] **Step 8: 커밋**

```bash
git add godot/click.gd godot/click.tscn godot/game.gd tools/godot-fonts.py godot/fonts.gd godot/fonts
git commit -m "Click trial: alley scene with tap-to-walk, bag and talk"
```

### Task 5: 손대지 않고 끝까지 돌리기

**Files:**
- Modify: `godot/click.gd`(시연 함수 `_demo()` 와 `_shot(name, wait)`, `game.gd:1036-1121` 의 꼴)

- [ ] **Step 1: 시연을 짓는다.** `--click-demo` 이면 `_ready` 끝에서 `_demo()`. 차례: 첫 화면 → 고양이 두 번 → 문(할 일이 생김) → 걷는 중에 다른 데를 누르고 곧 알바를 누름(Review Focus 1) → 카드를 들고 빈 데를 누름(내려놓고 걷는다, Review Focus 2) → 알바에게 카드 → 고양이에게 음료(엇나간 대꾸) → 기사 → 안내판에서 틀린 줄 → 맞는 줄 → 문이 열림 → 서윤에게 음료 → 끝. 걸음마다 `godot/shots/c01-*.png` 부터 찍는다. 끝에 `print("click demo: place=", place, " flags=", state.flags, " bag=", state.bag)` 하고 나간다.
- [ ] **Step 2: 돌린다.** Run: `$GODOT --path godot -- --click-demo`. Expected: 끝의 줄에 `place=open`, 표시에 `gaveDrinks`, 가방에 `card` 만.
- [ ] **Step 3: 화면을 하나하나 본다.** 볼 것: 말풍선이 겹치지 않는다, 걷는 중 다시 누른 뒤 반응이 하나뿐이다, 가방의 칸과 들어 올린 빛이 보인다, 임시 간판의 글자가 네모로 나오지 않는다, 열린 문의 화면이 어둡지 않다. 흠이 있으면 고치고 Step 2로 돌아간다.
- [ ] **Step 4: 커밋**

```bash
git add godot/click.gd
git commit -m "Click trial: --click-demo runs the alley end to end"
```

### Task 6: 웹으로 뽑아 손전화 크기에서 보고, 넘김 문서에 적는다

**Files:**
- Modify: `docs/godot-web/`(뽑은 것)
- Modify: `docs/넘김.md`(0절의 간추림과 "사용자의 답을 기다리는 것")

- [ ] **Step 1: 뽑는다.** Run: `$GODOT --headless --path godot --import` 뒤에 `$GODOT --headless --path godot --export-release "Web"`. Expected: `docs/godot-web/index.pck` 가 새로 써진다.
- [ ] **Step 2: 손전화 크기에서 눌러 본다.** 띄워 둔 `proto` 서버(포트 8319)로 `http://localhost:8319/godot-web/?click` 을 앱 안의 브라우저에서 열고 375 × 812로 맞춘다. 실제 누르기로 걷기, 가방 집기, 건네기, 고르기를 한 번씩 한다. 가방의 칸과 고를 말이 손가락 크기인지 본다(Review Focus 5). `?click` 없이 열어 지금 판의 첫 화면이 그대로인지도 본다. 다 보면 크기를 desktop으로 돌린다.
- [ ] **Step 3: 넘김 문서에 적는다.** 무엇을 지었는지, 여는 법(`?click`, `--click`, `--click-demo`), 시험을 돌리는 명령 둘, 확인한 것과 흠, 사용자에게 보아 달라고 할 것(손가락으로 할 만한가, 웃긴가, 길이가 맞나).
- [ ] **Step 4: 커밋**

```bash
git add docs/godot-web docs/넘김.md
git commit -m "Click trial on the web at ?click; handoff updated"
```
