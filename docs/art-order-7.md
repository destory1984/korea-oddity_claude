# 그래픽 발주서 7: 장면의 그림체 시안 5장

장면 그림의 그림체를 다시 고르려고, 한 장면을 그림체만 바꿔 다섯 장 받았다. 사용자의 말(2026.10.10): "그림체가 .. 음... 시안 5개", "장면 얘기야".

- 쓴 날: 2026.10.10. 받은 날: 2026.10.10
- 그리는 손: 챗GPT의 그림 그리기. Codex CLI로 넣었다(`tools/art-order.sh`).
- 주문한 것: 서울역 광장의 장면 5장. 모두 한 번에 받았다.
- 견본: `docs/art/scene-style-sheet.jpg`. 맨 처음이 지금의 그림체(색종이 오리기)이고 P1 → P5가 시안이다. 장면마다 왼쪽 아래에 유이(픽셀 그림)를 게임에서처럼 세워 어울림을 함께 보게 했다.

**P4(색연필과 크레용의 그림일기)로 정했다.** 사용자의 말(2026.10.10): "P4로 하자. 자켓은 J1". 앞으로 장면은 모두 이 그림체로 받는다. 공항에서 서울역까지의 장면을 이 그림체로 다시 받은 것은 4절에 적었다.

## 1. 다섯 시안

| 시안 | 그림체 | 주문한 말 |
|---|---|---|
| 지금 | 색종이 오리기 | 납작한 색종이를 오려 겹친 그림. 발주서 3 → 6의 그림체 |
| P1 | 수채 그림책 | 연필의 가는 선 위에 맑은 수채. 색이 번지고 종이의 결이 보인다 |
| P2 | 손으로 그린 애니메이션의 배경화 | 포스터 물감으로 꼼꼼하고 풍성하게. 뭉게구름, 나뭇잎 사이의 햇빛, 광장의 나무 그림자 |
| P3 | 납작한 도형의 여행 포스터 | 윤곽선 없이 큰 도형과 고른 면. 색을 대여섯 가지로 줄이고 장식을 덜어 낸다 |
| P4 | 색연필과 크레용의 그림일기 | 칠한 결과 흰 틈이 보이는 손그림. 굵은 갈색 선 |
| P5 | 픽셀 그림 | 16비트 게임의 배경처럼 큼직한 픽셀, 남색 윤곽선, 네모난 구름 |

다섯 모두 `seoul-station.png` 를 참고 그림으로 넣고 "구도와 건물과 사람의 자리를 그대로 두고 그림체만 바꿔"라고 썼다. 받은 다섯은 구도가 지금의 그림과 같다. 글자와 상표는 없다.

## 2. 만드는 쪽에서 본 것 (고르는 데 참고만 한다)

- 유이가 픽셀 그림이라, 유이와 가장 한 식구로 보이는 것은 P5다. 나머지는 유이만 그림체가 달라 스티커를 붙인 듯 보인다. 유이를 장면의 그림체에 맞춰 다시 받는 길도 있다(그 시안 다섯이 `assets/codex/order5-yui-s1` → `s5` 에 있다. 장면이 아니라 유이의 그림체를 묻는 줄 알고 먼저 받은 것이다).
- P2가 가장 풍성하고 "가 보고 싶다"는 마음이 든다. 다만 장면마다 빛과 구름의 품이 들어 장면 사이의 결을 맞추기가 가장 어렵다.
- P3는 표지판, 기계 화면, 노선도 같은 화면의 글과 가장 잘 어울리고 파일이 가볍다. 대신 장소의 맛이 덜하다.
- P1과 P4는 "할머니의 수첩"이라는 손으로 적은 물건과 어울린다.
- 지금까지 받은 장면 28장(둘째 판 7, 셋째 판 12, 공항 쪽 9)은 색종이 오리기다. 그림체를 바꾸면 새 기획에 쓰는 21장(성수동과 홍대 12, 공항 쪽 9)을 다시 받는다. 받은 그림을 참고로 넣으면 구도는 지켜진다.

## 3. 그림체를 정한 뒤: 공항에서 서울역까지의 장면 9장을 다시 받았다

P4로 정한 날(2026.10.10)에 새 기획의 첫 쪽에 쓰는 장면을 모두 이 그림체로 바꾸었다. `docs/trip/art/` 의 9장이 그것이다.

| 파일 | 어떻게 |
|---|---|
| `seoul-station` | 시안 P4를 그대로 쓴다 |
| `icn-arrivals`, `icn-store`, `icn-gates`, `arex-platform`, `arex-ride`, `seoul-a`, `seoul-c`, `photo-2004` | 발주서 6에서 받은 그림을 첫째 참고 그림(구도), 시안 P4를 둘째 참고 그림(그림체)으로 넣어 다시 받았다 |

앞머리는 `assets/codex/order7/_head-p4.txt` 다. "첫째 참고 그림의 구도, 사물의 자리와 크기, 사람의 자리와 수를 그대로 두고 둘째 참고 그림의 그림체로 그린다"가 뼈대다. 장면마다 지킬 것을 한 줄씩 덧붙였다.

- `icn-gates`: 왼쪽 절반은 파랑, 오른쪽 절반은 주황이 한눈에 보이게.
- `arex-ride`: 소매를 노랑에서 하늘색으로(유이의 겉옷이 하늘색이 되었다).
- `icn-arrivals`: 가게 차양의 초록, 주황, 빨강 줄무늬를 고른 초록으로(실제 편의점 상표의 색과 닮았던 것).
- `photo-2004`: 다른 그림보다 조금 바랜 느낌으로.

받고 확인한 것:

| 확인 | 결과 |
|---|---|
| 구도가 먼저 받은 그림과 같은가 | 여덟 장 모두 같다. 화면이 그림의 자리에 기대는 개찰구(왼쪽 파랑, 오른쪽 주황)도 그대로다 |
| 그림체가 한 식구인가 | 그렇다. 색연필의 비스듬한 결, 갈색 윤곽선, 밝은 색이 아홉 장에서 같다 |
| 글자, 상표가 없는가 | 없다. 입국장의 줄무늬 차양은 고른 초록이 되었다 |
| 소매가 하늘색인가 | 그렇다 |
| 파일의 크기 | 한 장에 330 → 374KB. 색종이 오리기(103 → 204KB)의 두 배쯤이다. 색연필의 결이 잘게 들어가서다 |

**한 번 헛돈 것.** 처음에는 받을 이름을 참고 그림의 이름과 같게 주었다(`icn-gates.png`). 주문 도구가 받을 자리를 비우며 참고 그림을 지워, 여덟 가운데 다섯이 "참고 그림이 없다"는 답만 하고 끝났다. 받을 이름을 `icn-gates-p4.png` 처럼 달리해 다시 넣어 다섯을 받았다. 도구(`tools/art-order.sh`)가 이제 이름이 겹치면 주문하지 않고 알린다.

아직 P4로 받지 않은 것: 셋째 판의 성수동과 홍대 12장(`docs/assets/scenes/`). 새 기획의 "노는 쪽"을 지을 때 다시 받는다. 그 가운데 `seongsu-eat`, `hongdae-eat` 는 소매도 하늘색으로 바꾼다.

## 4. 다시 주문하는 법


주문 문장과 받은 원본은 `assets/codex/order7*/` 에 있다. 이 폴더들은 커밋하지 않는다.

```bash
bash tools/art-order.sh assets/codex/order7-scene-p2 assets/codex/order7/scene-p2.txt scene-p2.png assets/codex/order6-seoul-station/seoul-station.png
```

견본을 다시 만든다(`tools/scene-sheet.py`).

```bash
py tools/scene-sheet.py docs/art/scene-style-sheet.jpg docs/art/yui/yui-a5-192.png "NOW  paper cut-out=assets/codex/order6-seoul-station/seoul-station.png" "P1  watercolour picture book=assets/codex/order7-scene-p1/scene-p1.png" "P2  hand-painted animation background=assets/codex/order7-scene-p2/scene-p2.png" "P3  flat travel poster=assets/codex/order7-scene-p3/scene-p3.png" "P4  coloured pencil diary=assets/codex/order7-scene-p4/scene-p4.png" "P5  pixel art=assets/codex/order7-scene-p5/scene-p5.png"
```

그림체를 정한 뒤의 장면은 참고 그림을 둘 넣고, 받을 이름을 참고 그림과 다르게 준다.

```bash
bash tools/art-order.sh assets/codex/order7-p4-icn-gates assets/codex/order7/p4-icn-gates.txt icn-gates-p4.png assets/codex/order6-icn-gates/icn-gates.png assets/codex/order7-scene-p4/scene-p4.png
```
