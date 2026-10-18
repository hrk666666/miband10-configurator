#!/usr/bin/env python3
"""Reproducible pixel measurements of Mi Smart Band 10 reference photos.

Every number published in docs/dimensions.md that is marked "pixel-derived"
comes from this script. Run:  python3 references/measure.py
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

BODY_L = 46.57   # mm, mi.com official spec
BODY_W = 22.54
BODY_T = 10.95

out = {}

# ---------------------------------------------------------------- T06 back, flat lay
img = Image.open("references/img/T06_back_full.jpg").convert("L")
a = np.array(img).astype(int)
mask = a < 120
ys, xs = np.nonzero(mask)
x0, x1, y0, y1 = 248, 376, 92, 360          # body bbox isolated by hand from contact sheet
W, H = x1 - x0 + 1, y1 - y0 + 1
mmpp = BODY_W / W
out["T06"] = {
    "body_px": [int(W), int(H)],
    "mm_per_px_calibrated_on_width": round(mmpp, 4),
    "measured_length_mm": round(H * mmpp, 2),
    "official_length_mm": BODY_L,
    "length_error_pct": round((H * mmpp - BODY_L) / BODY_L * 100, 2),
    "aspect_measured": round(H / W, 3),
    "aspect_official": round(BODY_L / BODY_W, 3),
}

# ---- plan silhouette -> superellipse exponent
g = np.abs(np.diff(a.astype(float), axis=1))
pts = []
for y in range(y0 + 4, y0 + 80):
    row = g[y, x0 - 12:x1 + 12]
    off = int(np.argmax(row)) - 12
    if 0 < off < 60:
        pts.append((y - y0, (x1 - x0 + 1) / 2 - off))
b_half, a_half = W / 2, H / 2
best = None
for n in np.arange(1.6, 5.0, 0.01):
    err = 0.0
    for s, hw in pts:
        pred = b_half * (1 - ((a_half - s) / a_half) ** n) ** (1 / n)
        err += (pred - hw) ** 2
    if best is None or err < best[0]:
        best = (err, n)
out["T06"]["superellipse_exponent"] = round(float(best[1]), 2)
out["T06"]["superellipse_fit_rmse_px"] = round((best[0] / len(pts)) ** 0.5, 2)

# ---- back features (bright elements on the black back cover)
body = a[y0:y1 + 1, x0:x1 + 1]
lab, n = ndimage.label(body > 105)
feats = []
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    yy, xx = sl
    area = int(((lab[sl] == i).sum()))
    w, h = xx.stop - xx.start, yy.stop - yy.start
    if area < 60 or w > 40:      # skip specular streaks / big highlights
        continue
    feats.append({
        "w_mm": round(w * mmpp, 2),
        "h_mm": round(h * mmpp, 2),
        "cx_mm": round((xx.start + xx.stop) / 2 * mmpp - BODY_W / 2, 2),
        "cy_mm": round((yy.start + yy.stop) / 2 * mmpp - BODY_L / 2, 2),  # + = toward bottom end
        "area_px": area,
    })
feats.sort(key=lambda f: f["cy_mm"])
out["T06"]["back_features"] = feats

# ---------------------------------------------------------------- R01 front, lit screen
a2 = np.array(Image.open("references/img/front_on_white_tpu_official.jpg").convert("L")).astype(int)
row = a2[340].astype(float)
dark = np.nonzero(row < 60)[0]
black_l, black_r = int(dark.min()), int(dark.max())
grad = np.abs(np.diff(row))
# walk outward from the black area, take the last strong edge within 30 px (= metal frame chamfer)
def outer_edge(start, step):
    last = start
    for k in range(1, 30):
        i = start + step * k
        if grad[i] > 55:
            last = i
    return last
left_edge = outer_edge(black_l, -1)
right_edge = outer_edge(black_r, +1) + 1
black_w = black_r - black_l + 1
body_w_px = right_edge - left_edge
out["R01"] = {
    "black_area_width_px": black_w,
    "body_width_px_on_same_row": body_w_px,
    "body_edges_px": [int(left_edge), int(right_edge)],
    "black_to_body_ratio": round(black_w / body_w_px, 3),
    "black_area_width_mm": round(BODY_W * black_w / body_w_px, 2),
}

# active display area derived from official numbers (1.72", 212x520)
diag_mm = 1.72 * 25.4
aspect = 520 / 212
w_act = diag_mm / np.sqrt(1 + aspect ** 2)
h_act = w_act * aspect
out["display_derived"] = {
    "diag_mm": round(diag_mm, 2),
    "active_w_mm": round(w_act, 2),
    "active_h_mm": round(h_act, 2),
    "black_border_mm_each_side": round((out["R01"]["black_area_width_mm"] - w_act) / 2, 2),
    "official_bezel_claim_mm": 2.0,
}

# ---------------------------------------------------------------- T10/T11 side profile
for tag, fn in (("T10", "T10_side_a.jpg"), ("T11", "T11_side_b.jpg")):
    aa = np.array(Image.open(f"references/img/{fn}").convert("L")).astype(int)
    m = aa < 110
    yy, xx = np.nonzero(m)
    keep = (yy > 170) & (yy < 290) & (xx > 150) & (xx < 500)
    yy, xx = yy[keep], xx[keep]
    if len(yy) == 0:
        continue
    out[tag] = {
        "silhouette_len_px": int(xx.max() - xx.min() + 1),
        "silhouette_thick_px": int(yy.max() - yy.min() + 1),
        "thickness_to_length": round((yy.max() - yy.min() + 1) / (xx.max() - xx.min() + 1), 4),
        "official_ratio": round(BODY_T / BODY_L, 4),
    }

print(json.dumps(out, indent=2, ensure_ascii=False, default=int))
with open("references/measurements.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False, default=int)
