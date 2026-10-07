"""받은 겹 그림 한 장에서 철마다의 그림 넉 장을 만든다.

기획서 4절: "땅 그림은 레이어라 색판만 갈면 계절이 바뀐다." 그림은 한낮의 풀빛(여름)으로 받았다. 여기서 풀과 나무와
먼 산의 색만 골라 봄, 가을, 겨울의 색으로 바꾼다. 돌, 기와, 기둥, 흙은 그대로 둔다. 윤곽은 한 픽셀도 바뀌지 않으므로
넉 장을 겹쳐 녹여도 어긋나지 않는다.

    py tools/season-layers.py <겹.webp> [<겹.webp> ...]

<겹>-spring.webp, <겹>-summer.webp, <겹>-autumn.webp, <겹>-winter.webp 를 같은 폴더에 쓴다.
"""
import colorsys
import sys

import numpy as np
from PIL import Image


def hsv(rgb):
    """rgb: (..., 3) 0..1 → h(0..1), s, v"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc))
    h = (h / 6) % 1
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return h, s, mx


def rgb_of(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    choices = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate(choices):
        mask = i == k
        out[mask] = np.stack([r, g, b], -1)[mask]
    return out


def smooth(lo, hi, x):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def seasons(rgb):
    """풀빛(색상 70 → 170도)과 먼 산의 푸른빛(170 → 250도)을 가려 철마다 바꾼다."""
    h, s, v = hsv(rgb)
    deg = h * 360
    # 풀과 나무: 색상이 풀빛이고 채도가 있는 곳. 가장자리는 부드럽게 넘어간다.
    green = smooth(60, 80, deg) * (1 - smooth(165, 185, deg)) * smooth(0.12, 0.25, s)
    # 먼 산: 푸른빛. 풀보다 덜 바뀐다.
    blue = smooth(165, 185, deg) * (1 - smooth(250, 265, deg)) * smooth(0.08, 0.2, s)

    def blend(target, weight):
        w = weight[..., None]
        return rgb * (1 - w) + target * w

    out = {'summer': rgb}

    # 봄: 풀빛이 노랗고 밝다. 먼 산은 조금 옅다.
    spring = rgb_of(np.where(green > 0, (deg - 14) / 360 % 1, h), s * 0.86, np.clip(v * 1.08 + 0.03, 0, 1))
    spring_far = rgb_of(h, s * 0.8, np.clip(v * 1.06, 0, 1))
    out['spring'] = blend(spring_far, blue * 0.8) * (1 - green[..., None]) + spring * green[..., None]

    # 가을: 풀과 나무가 붉고 누렇다. 어두운 풀(나무, 그늘진 비탈)일수록 붉고, 밝은 풀(잔디)은 누런 쪽이다.
    dark = 1 - smooth(0.45, 0.72, v)
    autumn_h = (38 - 24 * dark) / 360
    autumn = rgb_of(np.broadcast_to(autumn_h, h.shape), np.clip(s * 1.12 + 0.08, 0, 1), np.clip(v * 0.98 + 0.02, 0, 1))
    autumn_far = rgb_of((deg + 55) / 360 % 1, s * 0.55, np.clip(v * 1.02, 0, 1))   # 먼 산은 옅은 보랏빛 안개
    out['autumn'] = blend(autumn_far, blue * 0.75) * (1 - green[..., None]) + autumn * green[..., None]

    # 겨울: 풀밭은 눈으로 덮여 희고 푸르스름하다. 어두운 나무는 잿빛 갈색으로 남는다. 먼 산은 희끗하다.
    snow_v = np.clip(0.80 + v * 0.22, 0, 1)
    snow = rgb_of(np.full(h.shape, 215 / 360), np.full(h.shape, 0.07) + dark * 0.08, snow_v - dark * 0.30)
    winter_far = rgb_of(h, s * 0.35, np.clip(v * 0.6 + 0.42, 0, 1))
    out['winter'] = blend(winter_far, blue * 0.9) * (1 - green[..., None]) + snow * green[..., None]
    return out


def main(paths):
    for path in paths:
        image = Image.open(path).convert('RGBA')
        data = np.asarray(image).astype(np.float64) / 255
        rgb, alpha = data[..., :3], data[..., 3:]
        stem = path[:-len('.webp')]
        for name, colours in seasons(rgb).items():
            out = (np.concatenate([np.clip(colours, 0, 1), alpha], -1) * 255).round().astype(np.uint8)
            Image.fromarray(out, 'RGBA').save(f'{stem}-{name}.webp', 'WEBP', quality=88, method=6)
        print(f'{stem}: spring, summer, autumn, winter')


if __name__ == '__main__':
    main(sys.argv[1:])
