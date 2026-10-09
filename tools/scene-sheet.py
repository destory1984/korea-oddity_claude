"""Lays scene drafts on one sheet, with a character standing in each, to compare art styles.

    python tools/scene-sheet.py <out.jpg> <character.png> <name=scene.png> ...

Each scene is shown at one size in a grid of three columns, with its name above it and
the character (a transparent sprite) standing at the lower left, as it does beside the
speech bubble in the game. One sees at a glance whether the scene's style and the
character's go together.
"""
import sys

from PIL import Image, ImageDraw

CELL, PAD, LABEL, GROUND = (720, 480), 20, 26, (20, 22, 44)


def main(out, character_path, pairs):
    character = Image.open(character_path).convert('RGBA')
    height = round(CELL[1] * 0.46)
    character = character.resize((round(character.width * height / character.height), height), Image.NEAREST)
    columns = 3
    rows = -(-len(pairs) // columns)
    sheet = Image.new('RGB', (PAD + columns * (CELL[0] + PAD), PAD + rows * (CELL[1] + LABEL + PAD)), GROUND)
    draw = ImageDraw.Draw(sheet)
    for i, pair in enumerate(pairs):
        name, path = pair.split('=', 1)
        x = PAD + (i % columns) * (CELL[0] + PAD)
        y = PAD + (i // columns) * (CELL[1] + LABEL + PAD)
        draw.text((x + 2, y + 4), name, fill=(246, 185, 81))
        scene = Image.open(path).convert('RGB').resize(CELL, Image.LANCZOS)
        sheet.paste(scene, (x, y + LABEL))
        sheet.paste(character, (x + 24, y + LABEL + CELL[1] - height - 10), character)
    sheet.save(out, quality=90)
    print(f'{out}: {sheet.width}x{sheet.height}, {len(pairs)} scenes')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
