"""Godot 견본에 넣을 글꼴 조각을 고른다.

개구(Gaegu) 글꼴은 웹용으로 89조각(woff2)으로 나뉘어 있다(docs/assets/fonts/gaegu/). Godot 은 기기의 글꼴을
웹에서 쓰지 못하므로 글꼴을 게임에 묶어 넣어야 한다. 이 도구는 godot/ 의 스크립트와 장면에 적힌 글자를 모아
그 글자가 든 조각만 godot/fonts/ 에 베끼고, 조각의 차례를 godot/fonts.gd 에 적는다.
화면에 나오는 글을 바꾼 뒤에는 다시 돌린다.

    python tools/godot-fonts.py
"""
import json
import re
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / 'docs/assets/fonts/gaegu'
target = root / 'godot/fonts'

text = ''.join((root / 'godot' / name).read_text(encoding='utf-8') for name in ('main.gd', 'main.tscn', 'game.gd'))
# 게임의 글은 data/text.json 에 있다(tools/godot-data.mjs 가 뽑는다). game.gd 가 따옴표로 부르는 열쇠와,
# 걸음마다 붙여 부르는 열쇠(hd 로 시작하는 것, item 으로 시작하는 것)의 글자를 더한다.
# 지금은 한국어만 넣는다. 다른 세 나라 말은 그 말의 글꼴을 고른 뒤에 더한다.
words = json.loads((root / 'godot/data/text.json').read_text(encoding='utf-8'))['ko']
called = set(re.findall(r'"(\w+)"', (root / 'godot/game.gd').read_text(encoding='utf-8')))
text += ''.join(value for key, value in words.items() if key in called or key.startswith(('hd', 'item')))
wanted = {ord(ch) for ch in text if not ch.isspace()} | set(range(0x20, 0x7f))

slices = []
for block in (source / '400.css').read_text(encoding='utf-8').split('@font-face')[1:]:
    name = re.search(r'files/([\w-]+\.woff2)', block).group(1)
    spans = []
    for part in re.search(r'unicode-range:\s*([^;]+);', block).group(1).split(','):
        low, _, high = part.strip()[2:].partition('-')
        spans.append((int(low, 16), int(high or low, 16)))
    covered = {code for code in wanted if any(low <= code <= high for low, high in spans)}
    if covered:
        slices.append((name, len(covered)))

# 글자가 가장 많이 든 조각이 바탕이 되고 나머지는 그 뒤를 받친다.
slices.sort(key=lambda one: -one[1])
target.mkdir(exist_ok=True)
for old in target.glob('*.woff2'):
    if old.name not in {name for name, _ in slices}:
        old.unlink()
        Path(str(old) + '.import').unlink(missing_ok=True)
for name, _ in slices:
    shutil.copy(source / 'files' / name, target / name)
shutil.copy(source / 'LICENSE.txt', target / 'LICENSE.txt')

lines = ',\n'.join(f'\tpreload("res://fonts/{name}")' for name, _ in slices)
(root / 'godot/fonts.gd').write_text(
    '# tools/godot-fonts.py 가 쓴 파일이다. 손으로 고치지 않는다.\n'
    '# 개구(Gaegu) 글꼴에서 이 견본의 글자가 든 조각들. 첫 조각이 바탕이고 나머지가 뒤를 받친다.\n'
    f'const SLICES: Array[FontFile] = [\n{lines},\n]\n', encoding='utf-8', newline='\n')
size = sum((target / name).stat().st_size for name, _ in slices)
print(f'조각 {len(slices)}개, {size / 1024:.0f}KB')
