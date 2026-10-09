"""Lays character drafts side by side on one sheet, next to Sora for comparison.

The drafts come from an art order on a flat #ff00ff ground. This keys the ground out,
trims each figure, and makes two rows: the drafts as they came (scaled to one height),
and the same drafts brought down to the game's sprite size (192 x 256, nearest
neighbour, then shown at 2x) so that one sees what survives at that size.

    python tools/char-sheet.py <out.jpg> <sprites out dir> <compare.png> <draft.png> ...

Each draft is also written to <sprites out dir>/<name>-192.png (192 x 256, transparent).
The full-size originals stay in the order's work folder, which is not committed.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

LOW, HIGH = 50, 150          # how magenta a pixel is: below LOW kept, above HIGH gone
ROW, PAD, GROUND = 420, 28, (244, 238, 224)
SPRITE = (192, 256)


def keyed(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = np.minimum(r, b) - g
    alpha = np.clip(1 - (magenta - LOW) / (HIGH - LOW), 0, 1)
    spill = np.clip(magenta, 0, None) * (alpha < 1)
    out = np.dstack([r - spill, g, b - spill, alpha * 255]).clip(0, 255).astype(np.uint8)
    image = Image.fromarray(out, 'RGBA')
    return image.crop(image.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def sprite(figure):
    """The figure standing on the foot of a 192 x 256 cell, as the game's sprites do."""
    scale = min(SPRITE[0] / figure.width, (SPRITE[1] - 8) / figure.height)
    small = figure.resize((max(1, round(figure.width * scale)), max(1, round(figure.height * scale))), Image.NEAREST)
    alpha = small.getchannel('A').point(lambda v: 255 if v > 127 else 0)   # the game's sprites have no soft edge
    small.putalpha(alpha)
    cell = Image.new('RGBA', SPRITE, (0, 0, 0, 0))
    cell.paste(small, ((SPRITE[0] - small.width) // 2, SPRITE[1] - 7 - small.height), small)
    return cell


def main(out, sprites, sora_path, drafts):
    os.makedirs(sprites, exist_ok=True)
    sora = Image.open(sora_path).convert('RGBA')
    figures = []
    for path in drafts:
        name = os.path.splitext(os.path.basename(path))[0]
        figure = keyed(path)
        small = sprite(figure)
        small.save(os.path.join(sprites, f'{name}-192.png'))
        colours = len(np.unique(np.asarray(small).reshape(-1, 4), axis=0))
        print(f'{name}: figure {figure.width}x{figure.height}, at 192x256 {colours} colours')
        figures.append((name, figure, small))

    cell = 300
    width = PAD + (len(figures) + 1) * (cell + PAD)
    sheet = Image.new('RGB', (width, PAD * 4 + ROW + SPRITE[1] * 2 + 40), GROUND)
    draw = ImageDraw.Draw(sheet)

    def place(image, column, top, height):
        scale = height / image.height
        resample = Image.NEAREST if scale >= 1 else Image.LANCZOS
        shown = image.resize((round(image.width * scale), height), resample)
        sheet.paste(shown, (PAD + column * (cell + PAD) + (cell - shown.width) // 2, top), shown)

    sora_figure = sora.crop(sora.getbbox())
    place(sora_figure, 0, PAD + 30, ROW)
    draw.text((PAD + 4, PAD), os.path.splitext(os.path.basename(sora_path))[0].upper() + ' (for comparison)', fill=(60, 50, 40))
    place(sora, 0, PAD * 3 + ROW + 30, SPRITE[1] * 2)
    for i, (name, figure, small) in enumerate(figures, start=1):
        draw.text((PAD + i * (cell + PAD) + 4, PAD), name.upper(), fill=(60, 50, 40))
        place(figure, i, PAD + 30, ROW)
        place(small, i, PAD * 3 + ROW + 30, SPRITE[1] * 2)
    draw.text((PAD + 4, PAD * 3 + ROW + 10), 'at sprite size (192 x 256, shown 2x)', fill=(60, 50, 40))
    sheet.save(out, quality=90)
    print(f'{out}: {sheet.width}x{sheet.height}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
