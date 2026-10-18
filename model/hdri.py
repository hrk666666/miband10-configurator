#!/usr/bin/env python3
"""Generate a studio HDRI (Radiance .hdr, uncompressed) used for reflections.

Layout is a classic product studio: dark gradient room, one large key softbox top-left,
a tall strip light on the right and a dim fill in front. Values are in linear radiance.
"""
import math
import os
import numpy as np

W, H = 1024, 512
os.makedirs("public/hdri", exist_ok=True)

u = (np.arange(W) + 0.5) / W          # 0..1 azimuth
v = (np.arange(H) + 0.5) / H          # 0..1, 0 = zenith
UU, VV = np.meshgrid(u, v)

# base gradient: dark ceiling, soft horizon glow, dark floor
elev = (0.5 - VV) * math.pi           # +pi/2 at top, -pi/2 at bottom
base = np.zeros((H, W, 3))
sky = np.stack([np.full_like(UU, 0.010), np.full_like(UU, 0.011), np.full_like(UU, 0.013)], axis=2)
horizon = np.exp(-((VV - 0.52) ** 2) / 0.004) * 0.05
floor = np.clip((VV - 0.60) / 0.40, 0, 1) ** 2 * 0.006
base += sky
base += horizon[..., None] * np.array([0.9, 0.95, 1.05])
base += floor[..., None]


def softbox(u0, u1, v0, v1, intensity, tint=(1, 1, 1), feather=0.02):
    du = np.minimum(np.abs(UU - u0), np.abs(UU - u1))
    du = np.minimum(du, np.minimum(np.abs(UU - u0 + 1), np.abs(UU - u1 + 1)))
    inside_u = (UU > u0) & (UU < u1)
    if u1 < u0:  # wraps the seam
        inside_u = (UU > u0) | (UU < u1)
    mask_u = inside_u.astype(float)
    # feather edges
    mask_u = np.clip(mask_u + np.exp(-(du ** 2) / (feather ** 2)) * 0.8, 0, 1)
    mask_v = np.clip((VV - v0) / feather, 0, 1) * np.clip((v1 - VV) / feather, 0, 1)
    m = mask_u * mask_v
    return m[..., None] * np.array(tint) * intensity


# key light: big softbox upper-left-back
base += softbox(0.06, 0.31, 0.09, 0.31, 6.5, (1.0, 0.98, 0.95), 0.07)
# tall strip on the right
base += softbox(0.65, 0.74, 0.15, 0.63, 3.2, (0.92, 0.96, 1.0), 0.045)
# front fill (slightly warm, low)
base += softbox(0.40, 0.60, 0.38, 0.56, 0.30, (1.0, 0.97, 0.94), 0.14)
# small rim behind
base += softbox(0.85, 0.93, 0.28, 0.42, 1.6, (1.0, 1.0, 1.0), 0.05)

# subtle vignette so the environment is not perfectly flat
base *= (1.0 - 0.25 * np.clip((VV - 0.75) / 0.25, 0, 1))[..., None]


def rgbe(arr):
    mx = arr.max(axis=2)
    out = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    e = np.zeros_like(mx)
    nz = mx > 1e-6
    e[nz] = np.floor(np.log2(mx[nz])) + 1
    scale = np.zeros_like(mx)
    scale[nz] = 256.0 / (2.0 ** e[nz])
    out[..., 0] = np.clip(arr[..., 0] * scale, 0, 255).astype(np.uint8)
    out[..., 1] = np.clip(arr[..., 1] * scale, 0, 255).astype(np.uint8)
    out[..., 2] = np.clip(arr[..., 2] * scale, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(e + 128, 0, 255).astype(np.uint8)
    return out


def rle_channel(vals):
    """Radiance new-style RLE for one channel of one scanline."""
    out = bytearray()
    i = 0
    n = len(vals)
    while i < n:
        run = 1
        while i + run < n and vals[i + run] == vals[i] and run < 127:
            run += 1
        if run >= 4:
            out += bytes([128 + run, int(vals[i])])
            i += run
        else:
            j = i
            lit = bytearray()
            while j < n and len(lit) < 128:
                r = 1
                while j + r < n and vals[j + r] == vals[j] and r < 4:
                    r += 1
                if r >= 4 and len(lit) > 0:
                    break
                lit.append(int(vals[j]))
                j += 1
            out += bytes([len(lit)]) + lit
            i = j
    return bytes(out)


px = rgbe(base)
with open("public/hdri/studio.hdr", "wb") as f:
    f.write(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n")
    f.write(f"-Y {H} +X {W}\n".encode())
    for y in range(H):
        f.write(bytes([2, 2, (W >> 8) & 0xFF, W & 0xFF]))
        for c in range(4):
            f.write(rle_channel(px[y, :, c]))
print("hdri written", os.path.getsize("public/hdri/studio.hdr"))
