"""Turns the magenta sky of an ordered ground picture into transparency.

The art orders ask for the sky above the horizon to be flat #ff00ff, because the image
model does not reliably give a transparent background. This keys that colour out,
takes the magenta fringe off the edges, and writes a WebP for the game.

    python tools/key-sky.py <in.png> <out.webp>

Prints the size, where the horizon is (as a share of the height from the top) and the
colour of the bottom edge, which go into game/src/art/scenes.js.
"""
import sys

import numpy as np
from PIL import Image

WIDTH, HEIGHT = 1536, 1024
LOW, HIGH = 50, 150   # how magenta a pixel is: below LOW it is kept, above HIGH it is gone


def main(src, dst):
    image = Image.open(src).convert('RGB')
    if image.size != (WIDTH, HEIGHT):
        image = image.resize((WIDTH, HEIGHT), Image.LANCZOS)
    rgb = np.asarray(image).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = np.minimum(r, b) - g
    alpha = np.clip(1 - (magenta - LOW) / (HIGH - LOW), 0, 1)
    # Despill: where red and blue stand above green together, pull them down to it.
    spill = np.clip(magenta, 0, None) * (alpha < 1)
    out = np.dstack([r - spill, g, b - spill, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst, 'WEBP', quality=88, method=6)
    # The horizon is the lowest row the sky reaches, taken over the columns where the sky
    # comes down furthest (buildings and trees stand above it elsewhere).
    sky = alpha < 0.5
    lowest = np.where(sky.any(axis=0), HEIGHT - 1 - np.argmax(sky[::-1], axis=0), 0)
    horizon = float(np.percentile(lowest[lowest > 0], 80)) / HEIGHT if (lowest > 0).any() else 0.55
    cleared = float(sky.mean())
    # The colour of the bottom edge, to carry the ground on below a picture that ends above the screen's foot.
    foot = '#%02x%02x%02x' % tuple(int(v) for v in np.median(rgb[-8:].reshape(-1, 3), axis=0))
    print(f'{dst}: {WIDTH}x{HEIGHT}, horizon {horizon:.3f}, foot {foot}, sky {cleared:.0%} of the picture')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
