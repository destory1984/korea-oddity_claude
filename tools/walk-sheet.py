"""Cuts a row of walk frames, drawn on a flat #ff00ff ground, into a sprite sheet.

The frames come from an art order side by side on one picture. This keys the ground
out, finds each figure by the empty columns between them, scales them all by one
factor so the tallest is <height> pixels, and sets each in a cell of the same size
with the feet on the bottom edge and the head centred. One figure makes a one-cell
sheet (a standing pose).

    python tools/walk-sheet.py <in.png> <out.png> [height]

The size of one cell is printed: the page's CSS needs it for the aspect ratio.
"""
import sys

import numpy as np
from PIL import Image

LOW, HIGH = 50, 150          # how magenta a pixel is: below LOW kept, above HIGH gone
GAP = 12                     # empty columns that separate two figures
PAD = 4


def keyed(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = np.minimum(r, b) - g
    alpha = np.clip(1 - (magenta - LOW) / (HIGH - LOW), 0, 1)
    spill = np.clip(magenta, 0, None) * (alpha < 1)
    return np.dstack([r - spill, g, b - spill, alpha * 255]).clip(0, 255).astype(np.uint8)


def figures(rgba):
    """The figures from left to right, each trimmed to what is drawn."""
    filled = (rgba[..., 3] > 40).sum(axis=0) > 2
    spans, start, empty = [], None, 0
    for x, on in enumerate(filled):
        if on:
            if start is None:
                start = x
            empty = 0
        elif start is not None:
            empty += 1
            if empty > GAP:
                spans.append((start, x - empty + 1))
                start = None
    if start is not None:
        spans.append((start, len(filled)))
    out = []
    for left, right in spans:
        if right - left < 20:          # a speck, not a figure
            continue
        part = rgba[:, left:right]
        rows = np.where((part[..., 3] > 40).any(axis=1))[0]
        out.append(part[rows[0]:rows[-1] + 1])
    return out


def head_centre(figure):
    """The middle of the head: the top third of the figure."""
    top = figure[:figure.shape[0] // 3, :, 3] > 40
    columns = np.where(top.any(axis=0))[0]
    return (columns[0] + columns[-1]) / 2


def main(src, dst, height=256):
    cut = figures(keyed(src))
    scale = height / max(f.shape[0] for f in cut)
    small = []
    for f in cut:
        size = (max(1, round(f.shape[1] * scale)), max(1, round(f.shape[0] * scale)))
        image = Image.fromarray(f, 'RGBA').resize(size, Image.LANCZOS)
        small.append((image, head_centre(f) * scale))
    left = max(centre for _, centre in small)
    right = max(image.width - centre for image, centre in small)
    cell = (int(np.ceil(left + right)) + PAD * 2, height + PAD)
    sheet = Image.new('RGBA', (cell[0] * len(small), cell[1]), (0, 0, 0, 0))
    for i, (image, centre) in enumerate(small):
        sheet.alpha_composite(image, (i * cell[0] + PAD + round(left - centre), cell[1] - image.height))
    sheet.save(dst)
    print(f'{dst}: {len(small)} cells of {cell[0]} x {cell[1]}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], *(int(v) for v in sys.argv[3:4]))
