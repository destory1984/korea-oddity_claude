# 밖에서 가져온 것과 그 출처

이 저장소에 든 것 가운데 이 저장소에서 처음 만든 것이 아닌 것을 모두 적는다. 새로 가져오면 같은 커밋에서 이 표에 한 줄을 더한다. 공개할 때 저작권 표시가 여기서 나온다.

## 다른 사람과 기관의 자료

| 이 저장소의 파일 | 무엇 | 어디서 | 가져온 날 | 조건 |
|---|---|---|---|---|
| `docs/assets/coast.js` | 한반도 둘레의 육지 모양. 원본 10MB에서 동경 120 → 135, 북위 30 → 42만 잘라 성기게 만들었다(`tools/make-coast.mjs`). 원본은 저장소에 없다 | Natural Earth, 1:10m Physical Vectors, Land. https://www.naturalearthdata.com/ . 받은 곳: https://github.com/nvkelso/natural-earth-vector 의 `geojson/ne_10m_land.geojson` (판 5.2.0-pre) | 2026.10.7 | 저작권 없음(public domain). 출처 표시는 하지 않아도 된다. 적을 때는 "Made with Natural Earth." |
| `data/names.json`, `data/places.json`, `docs/assets/squares.js` 의 좌표와 일본어, 중국어, 영어, 한자 이름(영어는 `tools/add-en-names.mjs` 로 2026.10.7에 더했다. 손으로 적은 30칸은 해당하지 않는다). `docs/이름표.md` 의 "위키" 줄 | 문서 제목, 언어 사이 연결, 첫머리의 한자와 읽기, 좌표 | 한국어, 일본어, 중국어 위키백과의 API (`tools/make-names.mjs`). 읽은 문서 제목은 `data/names-wanted.json`, `data/squares-wiki-titles.json` 에 있다 | 2026.10.7 | 위키백과의 글은 CC BY-SA 4.0. 여기서 쓴 것은 이름과 좌표라는 사실이지만, 출처로 위키백과를 적는다 |
| `data/places.json` 의 `fromWikidata` 가 붙은 값 | 좌표(P625), 일본어와 중국어 이름표 | 위키데이터 API. 항목 번호는 줄마다 `wikidata` 에 있다 | 2026.10.7 | CC0 (저작권 없음) |
| `docs/assets/sun.js` 의 계산식 | 해의 적위, 균시차, 뜨고 지는 시각, 높이와 방위 | 미국 해양대기청(NOAA) Global Monitoring Laboratory 의 Solar Calculator 계산식(Jean Meeus, Astronomical Algorithms 에 바탕). https://gml.noaa.gov/grad/solcalc/calcdetails.html . 식을 기억에서 옮겨 적었고 코드는 새로 썼다 | 2026.10.7 | 미국 정부 저작물, 저작권 없음. 식은 저작권의 대상이 아니다 |
| `docs/assets/scenes/*.webp` 7장, `docs/art/order1-sheet.jpg` | 두 칸의 겹 그림. 주문한 문장은 `docs/art-order-1.md` 에 있다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI 0.160.0으로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.7 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다 |
| `docs/trip/art/*.webp` 9장 | 새 기획의 첫 쪽(인천공항 → 서울역)의 그림 9장(10장을 받아 1988년의 사진 한 장은 쓰지 않는다). 주문한 문장은 `docs/art-order-6.md` 에 있다. 가게와 사람은 지어낸 것이다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.10 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다. 처음 받은 그림(색종이 오리기)을 참고로 넣어 색연필 그림체로 다시 받은 것이다(`docs/art-order-7.md` 3절). 입국장 그림의 줄무늬 차양이 실제 편의점 상표의 색과 닮았던 것은 다시 받으며 고른 초록으로 바꾸었다 |
| `docs/trip/data/fares.json` 의 요금과 역 | 공항철도 일반열차의 역간 기준운임(인천공항1터미널 → 서울역 4,750원 들), 1회용 교통카드의 추가 100원과 보증금 500원, 직통열차의 운임 13,000원과 43분, 표 사는 곳, 일반열차가 서는 역 | 공항철도 누리집 https://www.airportrailroad.com 의 일반열차 운임안내, 일반열차 승차권 안내, 직통열차 소개, 직통열차 이용안내 | 2026.10.10 | 공개된 요금 안내의 숫자를 옮겼다. 화면에 본 날과 출처를 밝힌다. 요금은 바뀐다 |
| `docs/trip/` 의 위쪽 단추 줄과 설정 창 | 유리 단추, 아이콘, 설정 창의 톤과 갈래, 말 고르기의 차례(한국어, English, 日本語, 中文) | 1권의 `style.css`, `index.html`, `public/assets/ui/`. 시험판(`docs/overlay-proto.html`)에 옮겨 둔 것을 다시 옮겼다 | 2026.10.10 | MIT |
| `docs/art/scene-style-sheet.jpg` | 장면의 그림체 시안 다섯을 지금의 그림과 나란히 놓은 견본. 주문한 문장은 `docs/art-order-7.md` 에 있다. 게임에는 아직 쓰지 않는다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.10 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다 |
| `docs/art/yui-drafts-sheet.jpg`, `docs/art/yui-hair-sheet.jpg`, `docs/art/yui-jacket-sheet.jpg`, `docs/art/yui/yui-*-192.png` 15장 | 새 기획의 주인공(일본 소녀 유이)의 시안 다섯. 주문한 문장은 `docs/art-order-5.md` 에 있다. 그림체의 참고로 1권의 소라 그림 한 장(`idle-1.png`)을 넣었다. 게임에는 아직 쓰지 않는다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.10 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다. 견본에는 소라의 그림이 함께 실려 있다(권리 유보, `LICENSE` 2부) |
| `docs/assets/scenes/seongsu-*.webp` 7장, `docs/assets/scenes/hongdae-*.webp` 5장 | 비교 시제품 셋째 판의 그림 12장(성수동 빵집의 네 계절과 1979년의 모습, 홍대 골목의 세 지점, 두 곳의 가는 길과 먹는 장면). 주문한 문장은 `docs/art-order-4.md` 에 있다. 가게는 지어낸 것이고 실제 가게의 이름이나 상표를 넣지 않았다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.10 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다 |
| `docs/assets/scenes/bus2-*.webp` 4장, `docs/assets/scenes/sobaek-*.webp` 3장 | 비교 시제품 둘째 판의 그림 7장(부석사의 네 계절, 소백산 천문대의 세 지점). 주문한 문장은 `docs/art-order-3.md` 에 있다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI 0.160.0으로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.10 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다 |
| `docs/assets/scenes/seong-*.webp` 13장, `docs/assets/scenes/cheom-tree.webp` | 비교 시제품의 겹 그림 6장과, 거기서 색만 바꿔 만든 철의 그림 8장. 주문한 문장은 `docs/art-order-2.md` 에 있다 | 챗GPT의 그림 그리기(OpenAI). Codex CLI 0.160.0로 넣었다(`tools/art-order.sh`). 사용자의 ChatGPT 계정으로 로그인한 것이다 | 2026.10.9 | OpenAI의 이용 약관에 따라 만든 사람(사용자)이 쓴다. 공개 전에 약관의 그 대목을 다시 확인한다. AI로 만든 그림임을 밝힌다 |
| `docs/assets/fonts/pretendard/` | Pretendard Variable(화면의 글씨). 글자를 나눠 받는 woff2 묶음 | Kil Hyung-jin, https://github.com/orioncactus/pretendard . 2권의 `play/fonts/pretendard/` 에서 그대로 가져왔다 | 2026.10.7 | SIL Open Font License 1.1. 전문이 그 폴더의 `LICENSE.txt` 에 있다 |
| `docs/assets/fonts/gaegu/` | 개구(Gaegu, 소라의 말풍선) | JIKJI SOFT. npm 의 @fontsource/gaegu 5.3.0(구글 글꼴이 주는 파일 그대로). 2권의 `play/fonts/gaegu/` 에서 가져왔다 | 2026.10.7 | SIL Open Font License 1.1. 전문이 그 폴더의 `LICENSE.txt` 에 있다 |
| `docs/assets/fonts/nanum-pen-script/` | 나눔손글씨 펜(Nanum Pen Script, 할머니의 손글씨) | NAVER. npm 의 @fontsource/nanum-pen-script. 2권의 `play/fonts/nanum-pen-script/` 에서 가져왔다 | 2026.10.7 | SIL Open Font License 1.1. 전문이 그 폴더의 `LICENSE.txt` 에 있다 |
| 글꼴(파일은 저장소에 없다. 시험판이 구글 글꼴 서버에서 받는다) | Yomogi(일본어 손글씨), Ma Shan Zheng(중국어 손글씨). 임시로 고른 것이다 | https://fonts.google.com/ | 2026.10.7 | SIL Open Font License 1.1. 중국에서는 구글 글꼴 서버가 닿지 않는다(기획서 14절 1번). 굳히면 파일을 함께 싣고 OFL 전문을 붙인다 |

## 우주 한량(1권)과 시간 한량(2권)에서 가져온 것

같은 사람(destory1984)의 저장소다. 1권: https://github.com/destory1984/oddity_claude , 2권: https://github.com/destory1984/time-oddity_claude

| 이 저장소의 파일 | 무엇 | 어디서 | 가져온 날 | 조건 |
|---|---|---|---|---|
| `docs/mock/sora.png` | 소라 그림 | 2권의 `docs/mock/sora.png` (본디 1권의 `public/assets/seora-sprites/`) | 2026.10.7 | 권리 유보. MIT가 아니다(`LICENSE` 2부) |
| `docs/assets/sora/see-hush-1.png` → `see-hush-4.png` | 소라가 "쉬잇" 하는 그림 넉 장 | 1권의 `public/assets/seora-sprites/` | 2026.10.7 | 권리 유보. MIT가 아니다(`LICENSE` 2부) |
| `docs/assets/ui/icon-*.svg` 18개 | 단추 아이콘 | 1권의 `public/assets/ui/` | 2026.10.7 | 1권에서 직접 그린 것. MIT |
| `docs/assets/music.js` 의 마디 짜기와 울리기 | 음 이름을 Hz로 바꾸기(hz, chord, scale), 마디를 짜는 법(chance, tuneFor, tuneOrder, barInOrder, barPlan), 울리는 코드(createMusic). 곡 스물(TUNES)은 여기서 지은 것이라 해당하지 않는다. 1권의 곡 열하나는 2026.10.7에 지웠다 | 1권의 `src/core/music.js` 와 `src/ui/sound.js` 의 tone, padNote, playBar, music, setMusic | 2026.10.7 | 1권에서 직접 만든 것. MIT |
| `docs/compare/ui/sound.js` 의 사진기 소리(tone, hissBurst, snap, shutter) | 초점을 잡는 "삐빅"(3,886Hz 두 음)과 "찰칵"(잡음 세 덩이). 숫자를 그대로 옮겼다. 1권이 녹음 하나(pgtd.tistory.com/283 의 "초점음+써터음 1회")를 재어 지은 소리이고 녹음 파일은 1권에도 여기에도 없다 | 1권의 `src/ui/sound.js` 의 tone, noise, snap, 큐 shutter | 2026.10.10 | 1권에서 직접 만든 것. MIT |
| `tools/art-order.sh`, `tools/key-sky.py` | 그림을 주문하는 스크립트와 자홍색 바탕을 지우는 스크립트 | 2권의 `tools/` | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 다이얼 생김새(`drawDial`) | 밤하늘 유리, 금빛 테, 북두칠성과 별가루, 반짝임, 표시와 딱지, 바늘. 색과 치수와 그리는 차례 | 2권의 `game/src/ui/dialView.js` | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 다이얼 움직임과 눈금 소리 | 한 칸 12픽셀, 미끄러지다 서기, 1,200Hz와 760Hz의 소리 | 2권의 `docs/dial-proto.html` | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 유리 단추 모양, 설정의 언어 고르기, "쉬잇" 움직임의 숫자(1초에 넉 장, 3초) | 화면의 틀 | 1권의 `style.css`, `index.html`, `src/core/sprite.js`, `src/main.js` | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 소라 크기(`layout`) | 화면 모양에 따라 소라의 키를 정하는 셈. 세로로 긴 손전화에서 화면 높이의 20.8%, 넓은 화면에서 34.6% | 1권의 `src/core/pose.js`(heroScaleFor), `src/render/spriteHero.js`(CARD_HEIGHT, CARD_AT) | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 설정 창 톤 | 남색 유리 판(#0d1a3af2), 흐린 뒷배경, 금빛 작은 제목, 고른 단추의 금빛 테와 글자, 금빛 테의 닫는 단추, 갈래가 바뀌어도 같은 창 크기. 색과 치수 | 1권의 `style.css` (dialog, #settings, #settingsTabs, #closeSettings, #newsList) | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 안내 줄(`#hint`, `showGuide`) | 지금 할 일을 한 줄로 알리는 꼴: 몇째인지(2/4), 할 일, 누를 단추. 금빛 테의 유리 판 | 1권의 첫 안내(`index.html` 의 `#guide`, `src/ui/guide.js`, `style.css`) | 2026.10.8 | MIT |
| `docs/overlay-proto.html` 의 시험용 단추 둘(`#testBar`) | 단추의 꼴(점선 테, 높이 15픽셀, 맨 위 가운데), 네 나라 말의 단추 글, 만드는 사람의 기기에서만 보이는 규칙, 초기화는 기록을 지우고 설정을 남기는 것, 완료는 그 전 기록을 열쇠 하나에 남기는 것 | 1권의 `index.html`, `style.css`, `src/main.js`, `src/core/count.js`(isLocalHost), `src/i18n/*.json` | 2026.10.8 | MIT |
| `docs/overlay-proto.html` 의 설정 Help 쪽과 About 쪽 | 갈래 넷의 차례(Options, Help, Changes, About), 작은 제목과 풀이를 나란히 적는 꼴, About 의 항목 이름(만든 사람, 개인정보)과 "모으지 않습니다"로 시작하는 문장의 틀. 글은 여기서 썼다 | 1권의 `index.html`, `src/i18n/en.json` | 2026.10.7 | MIT |
| `docs/overlay-proto.html` 의 설정 갈래와 Changes 쪽 | 갈래 단추, 날짜를 그날의 첫 줄에만 적는 줄 목록, "만들기 시작한 날"과 "오늘로 며칠째" | 1권의 `index.html`, `style.css`, `src/ui/settings.js`(renderNews), `src/core/changes.js`(startedLine, dayLabel) | 2026.10.7 | MIT |
| `translation-test/round2/style-ref.json`, `docs/번역-규칙.md` 의 본보기와 굳은 낱말, 시험판의 "맞았다. 꼼꼼히 읽었구나." 같은 말 | 일본어, 중국어 번역문 | 1권의 `src/i18n/ja.json`, `zh.json` | 2026.10.7 | MIT |

## 아직 가져오지 않았지만 가져올 것

기획서에 적힌 것이다. 가져올 때 위 표로 옮긴다.

| 무엇 | 어디서 | 확인할 것 |
|---|---|---|
| 그림의 구도를 잡을 사진 | 한국관광공사 사진 갤러리(공공누리), 위키미디어 공용 | 공공누리 유형(2차 가공이 되는가, 해외 배포가 되는가). 칸마다 출처를 붙인다 |
| 조석(물때) | 국립해양조사원 | 이용 조건 |
| 한반도 고도 자료 | 정하지 않았다 | 해상도와 이용 조건 |
| 지명의 공식 일본어, 중국어 표기 | 한국관광공사의 일본어, 중국어 누리집 | 이름표를 맞추는 데 쓴다 |
| 한자 표기 | 국가유산청 | 이름표를 맞추는 데 쓴다 |
