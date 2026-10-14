# 그림 주문 20: 명동 쪽의 사람 다섯과 거리 (2026.10.14)

명동 쪽(`docs/superpowers/specs/2026-10-14-myeongdong-click-design.md`)에 세울 사람과, 수레 앞의 사람을 지운 거리. 그림체는 `docs/art-order-15.md` 의 것(B의 얼굴, 어른 4등신)이고 참고 그림은 밴드의 설정화(`assets/codex/order15-f/band-f.png`)다. 주문한 말은 `assets/codex/order20/*.txt` 다. 여섯 장 모두 한 번에 받았다.

| 넣은 곳 | 누구 | 크기 | 원본 |
|---|---|---|---|
| `godot/art/md-ajumma.png`, `-face.png` | 계란빵 아주머니. 짧은 갈색 파마, 붉은 앞치마와 흰 토시, 집게 | 227 × 528 | `order20-ajumma/md-ajumma.png` |
| `godot/art/md-clerk.png`, `-face.png` | 화장품 가게 언니. 높이 묶은 머리, 연분홍 앞치마, 두 손 가득 샘플 | 233 × 528 | `order20-clerk/md-clerk.png` |
| `godot/art/md-mom.png`, `-face.png` | 일본 손님 엄마. 트렌치코트, 지도와 만 원짜리 | 214 × 528 | `order20-mom/md-mom.png` |
| `godot/art/md-dad.png`, `-face.png` | 일본 손님 아빠. 안경, 남색 점퍼, 카메라 | 220 × 528 | `order20-dad/md-dad.png` |
| `godot/art/md-kid.png`, `-face.png` | 일본 손님 꼬마. 노란 모자, 3등신 | 134 × 304 | `order20-kid/md-kid.png` |
| `docs/water/art/md-street-b.webp` | 명동 거리에서 수레 앞의 모자 쓴 남자만 지운 판. 1920 × 640 | | `order20-street/md-street-b.png` |

- 자르는 법: `py tools/walk-sheet.py <받은 그림> <낼 그림> 524`(꼬마는 300). 얼굴 180 × 180은 선 모습의 위쪽에서 잘랐다.
- 거리는 웹판의 `md-street.webp` 를 덮어쓰지 않고 `md-street-b.webp` 로 따로 두었다. 웹판의 명동 거리는 앞의 그림 그대로다.
- 엄마가 든 만 원짜리에 사람 얼굴 같은 그림이 작게 그려졌다. 글자는 없다.
