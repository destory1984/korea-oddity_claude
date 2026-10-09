# 그래픽 발주서 7: 장면의 그림체 시안 5장

장면 그림의 그림체를 다시 고르려고, 한 장면을 그림체만 바꿔 다섯 장 받았다. 사용자의 말(2026.10.10): "그림체가 .. 음... 시안 5개", "장면 얘기야".

- 쓴 날: 2026.10.10. 받은 날: 2026.10.10
- 그리는 손: 챗GPT의 그림 그리기. Codex CLI로 넣었다(`tools/art-order.sh`).
- 주문한 것: 서울역 광장의 장면 5장. 모두 한 번에 받았다.
- 견본: `docs/art/scene-style-sheet.jpg`. 맨 처음이 지금의 그림체(색종이 오리기)이고 P1 → P5가 시안이다. 장면마다 왼쪽 아래에 유이(픽셀 그림)를 게임에서처럼 세워 어울림을 함께 보게 했다.

**이것은 시안이다. 어느 그림체로 할지는 사용자가 정한다. 정하기 전에는 장면을 더 주문하지 않는다.**

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

## 3. 다시 주문하는 법

주문 문장과 받은 원본은 `assets/codex/order7*/` 에 있다. 이 폴더들은 커밋하지 않는다.

```bash
bash tools/art-order.sh assets/codex/order7-scene-p2 assets/codex/order7/scene-p2.txt scene-p2.png assets/codex/order6-seoul-station/seoul-station.png
```

견본을 다시 만든다(`tools/scene-sheet.py`).

```bash
py tools/scene-sheet.py docs/art/scene-style-sheet.jpg docs/art/yui/yui-a5-192.png "NOW  paper cut-out=assets/codex/order6-seoul-station/seoul-station.png" "P1  watercolour picture book=assets/codex/order7-scene-p1/scene-p1.png" "P2  hand-painted animation background=assets/codex/order7-scene-p2/scene-p2.png" "P3  flat travel poster=assets/codex/order7-scene-p3/scene-p3.png" "P4  coloured pencil diary=assets/codex/order7-scene-p4/scene-p4.png" "P5  pixel art=assets/codex/order7-scene-p5/scene-p5.png"
```
