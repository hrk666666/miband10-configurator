#!/usr/bin/env python3
"""Generate every texture used by the GLB (procedural, no external downloads).

Outputs to model/tex/*.png
 - screen_face.png       : default watch face (screen UV 0..1)
 - weave_base/normal/rough: woven textile band
 - leather_normal/rough   : leather band
 - brushed_rough/metal    : sandblasted aluminium frame
 - tpu_normal/rough       : TPU strap micro-surface
 - back_rough             : matte plastic back cover
Every pattern is period-tiling so it can repeat on the band strips.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = "model/tex"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def save(name, arr):
    Image.fromarray(arr.astype(np.uint8)).save(os.path.join(OUT, name))


def normal_from_height(h, strength=1.0):
    gy, gx = np.gradient(h)
    n = np.dstack((-gx * strength, -gy * strength, np.ones_like(h)))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def tile_noise(n, freq, octaves=4, seed=0):
    r = np.random.default_rng(seed)
    acc = np.zeros((n, n))
    amp = 1.0
    for o in range(octaves):
        f = freq * 2 ** o
        base = r.random((f, f))
        base = np.vstack([base, base[:1]])
        base = np.hstack([base, base[:, :1]])
        img = Image.fromarray((base * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC)
        acc += amp * (np.asarray(img, dtype=float) / 255.0)
        amp *= 0.5
    acc -= acc.min()
    return acc / acc.max()


# ---------------------------------------------------------------- woven textile
def weave():
    n = 512
    yy, xx = np.mgrid[0:n, 0:n] / n
    period = 76.0 / n
    warp = np.sin(xx * 2 * np.pi / period) ** 2          # vertical threads
    weft = np.sin(yy * 2 * np.pi / period) ** 2          # horizontal threads
    checker = ((np.floor(xx / period) + np.floor(yy / period)) % 2)
    h = np.where(checker > 0.5, warp * 0.9 + 0.1 * weft, weft * 0.9 + 0.1 * warp)
    h = 0.8 * h + 0.2 * tile_noise(n, 32, 3, 1)
    save("weave_normal.png", normal_from_height(h, 1.6))
    rough = 0.62 + 0.22 * (1 - h) + 0.06 * tile_noise(n, 64, 2, 2)
    save("weave_rough.png", np.dstack([np.clip(rough, 0, 1)] * 3) * 255)
    base = np.array([138, 107, 82], dtype=float) / 255.0
    shade = (0.72 + 0.5 * h)[..., None]
    col = np.clip(base[None, None, :] * shade, 0, 1) ** (1 / 2.2)
    save("weave_base.png", (col * 255))


# ---------------------------------------------------------------- leather
def leather():
    n = 512
    grain = tile_noise(n, 24, 5, 11)
    cells = tile_noise(n, 48, 2, 12)
    h = 0.7 * grain + 0.3 * cells
    save("leather_normal.png", normal_from_height(h, 1.5))
    rough = 0.55 + 0.2 * (1 - h) + 0.05 * tile_noise(n, 96, 2, 13)
    save("leather_rough.png", np.dstack([np.clip(rough, 0, 1)] * 3) * 255)


# ---------------------------------------------------------------- brushed / sandblasted metal
def metal():
    n = 512
    yy, xx = np.mgrid[0:n, 0:n] / n
    streak = np.zeros((n, n))
    for k in range(180):
        y0 = rng.integers(0, n)
        w = rng.integers(1, 3)
        streak[max(0, y0 - w):y0 + w + 1, :] += rng.normal(0.5, 0.22)
    streak = streak / max(streak.max(), 1e-6)
    rough = 0.24 + 0.16 * streak + 0.05 * tile_noise(n, 64, 2, 21)
    save("brushed_rough.png", np.dstack([np.clip(rough, 0, 1)] * 3) * 255)
    # fine sandblast grain normal, very low amplitude
    g = tile_noise(n, 128, 1, 22)
    save("sandblast_normal.png", normal_from_height(g, 0.35))


# ---------------------------------------------------------------- TPU
def tpu():
    n = 512
    h = tile_noise(n, 96, 2, 31)
    save("tpu_normal.png", normal_from_height(h, 0.25))
    rough = 0.48 + 0.1 * h
    save("tpu_rough.png", np.dstack([np.clip(rough, 0, 1)] * 3) * 255)


# ---------------------------------------------------------------- back cover plastic
def back():
    n = 256
    h = tile_noise(n, 64, 3, 41)
    save("back_rough.png", np.dstack([np.clip(0.52 + 0.08 * h, 0, 1)] * 3) * 255)
    save("back_normal.png", normal_from_height(h, 0.2))


# ---------------------------------------------------------------- watch face
def screen_face():
    W, H = 424, 1040                      # 212x520 design @2x
    img = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    def font(sz, bold=False):
        for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
            if os.path.exists(p) and (bold or "Bold" not in p):
                return ImageFont.truetype(p, sz)
        return ImageFont.load_default()
    # top status row
    d.text((36, 54), "9:28", font=font(30), fill=(255, 255, 255))
    d.text((W - 116, 54), "80%", font=font(26), fill=(255, 255, 255))
    d.rounded_rectangle([W - 150, 62, W - 124, 80], 5, outline=(255, 255, 255), width=3)
    d.rectangle([W - 146, 66, W - 132, 76], fill=(120, 220, 130))
    # time
    # weather
    d.text((W // 2, 120), "25°", font=font(34), fill=(255, 255, 255), anchor="ma")
    d.text((26, 300), "09", font=font(126, True), fill=(255, 255, 255))
    d.text((26, 418), "28", font=font(126, True), fill=(255, 255, 255))
    # date
    d.text((30, 620), "8/16 SAT", font=font(34), fill=(190, 196, 205))
    # steps
    d.text((30, 700), "2560 steps", font=font(30), fill=(150, 156, 166))
    d.rounded_rectangle([30, 770, W - 30, 786], 8, fill=(28, 30, 34))
    d.rounded_rectangle([30, 770, 30 + int((W - 60) * 0.62), 786], 8, fill=(255, 214, 64))
    # heart
    d.text((30, 840), "72 bpm", font=font(30), fill=(255, 92, 108))
    # activity ring segment arc at the bottom
    d.arc([70, 900, W - 70, 1010], 200, 340, fill=(120, 220, 130), width=10)
    img.save(os.path.join(OUT, "screen_face.png"))


def mesh_band():
    n = 512
    yy, xx = np.mgrid[0:n, 0:n] / n
    per = 52.0 / n
    a = np.sin(xx * 2 * np.pi / per) ** 2
    b = np.sin(yy * 2 * np.pi / per) ** 2
    h = np.maximum(a, b) * (0.6 + 0.4 * ((np.floor(xx / per) + np.floor(yy / per)) % 2))
    h = 0.5 * h + 0.5 * tile_noise(n, 64, 2, 77)
    save("mesh_normal.png", normal_from_height(h, 1.4))
    rough = 0.26 + 0.18 * h
    save("mesh_rough.png", np.dstack([np.clip(rough, 0, 1)] * 3) * 255)


weave()
leather()
mesh_band()
metal()
tpu()
back()
screen_face()
print("textures written:", sorted(os.listdir(OUT)))


# ---------------------------------------------------------------- back cover marking
def back_tex():
    W, H = 1024, 496
    img = Image.new("RGB", (W, H), (26, 26, 28))
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    # "xiaomi" wordmark sits between the latch button and the sensor housing (ref T06/T12)
    d.text((W * 0.5, H * 0.5 - 118), "xiaomi", font=ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44), fill=(44, 44, 48), anchor="mm")
    # faint product text ring around the sensor (illegible in the reference, so kept abstract)
    for i, line in enumerate([
        "Xiaomi Smart Band 10   M2457B1",
        "5V 1A  233mAh  IP68/5ATM",
        "Made in China",
    ]):
        d.text((W * 0.5, H * 0.5 + 150 + i * 26), line, font=fs, fill=(38, 38, 42), anchor="mm")
    img.save(os.path.join(OUT, "back_tex.png"))


back_tex()
print("back_tex ok")
