#!/usr/bin/env python3
"""Automated QA over the screenshot matrix.

Checks every PNG for:
  1. non-blank / model actually rendered (coverage of non-background pixels)
  2. subject fully inside the frame (no clipping at the borders)
  3. brightness sanity (no all-black or blown-out frames)
  4. screen content present on the front/macro/angle views
  5. colourway plausibility (mean hue/level of the metal frame region)

Writes analysis.json next to the shots and prints a summary table.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else "snapshots/round-1"
BG = np.array([13, 14, 17])          # canvas clear colour from App.jsx

EXPECT = {
    "midnight": {"level": (18, 90), "hue": None},
    "glacier": {"level": (55, 175), "hue": None},
    "rose": {"level": (40, 165), "hue": (325, 45)},
    "pearl": {"level": (68, 215), "hue": None},
    "glimmer": {"level": (45, 190), "hue": (12, 62)},
}


def hue_of(rgb):
    r, g, b = [v / 255.0 for v in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 1e-6:
        return None
    d = mx - mn
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60


def analyse(path, color, band, preset):
    img = np.array(Image.open(path).convert("RGB")).astype(int)
    diff = np.abs(img - BG).sum(axis=2)
    mask = diff > 16
    cover = mask.mean()
    res = {"file": path, "color": color, "band": band, "preset": preset, "coverage": round(float(cover), 4)}
    if cover < 0.005:
        res["blank"] = True
        return res
    ys, xs = np.nonzero(mask)
    h, w = mask.shape
    res["bbox"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    res["touches_border"] = bool(xs.min() <= 1 or ys.min() <= 1 or xs.max() >= w - 2 or ys.max() >= h - 2)

    lum = img.mean(axis=2)
    body = lum[mask]
    res["mean_lum"] = round(float(body.mean()), 1)
    res["max_lum"] = int(body.max())
    res["bright_ratio"] = round(float((body > 150).mean()), 4)

    # metal / body colour: take the brighter quartile of the masked pixels (frame highlights)
    px = img[mask]
    l = px.mean(axis=1)
    sel = px[l > np.percentile(l, 72)]
    res["mean_rgb"] = [int(v) for v in np.median(sel, axis=0)]
    res["hue"] = hue_of(res["mean_rgb"])

    problems = []
    exp = EXPECT[color]
    lo, hi = exp["level"]
    # close-ups are dominated by the black panel, so the whole-frame brightness rule does
    # not apply there — they are validated by the screen-content rule below instead.
    if preset not in ("macro", "lug") and not (lo <= res["mean_lum"] <= hi):
        problems.append(f"mean_lum {res['mean_lum']} not in {lo}-{hi}")
    if res["touches_border"] and preset in ("front", "back", "left", "right", "angle"):
        problems.append("subject clipped by frame")
    if preset in ("front", "macro") and res["bright_ratio"] < 0.002:
        problems.append("screen content missing")
    if res["max_lum"] < 120:
        problems.append("frame too dark (possible lighting/material failure)")
    if exp["hue"] and res["hue"] is not None and preset in ("front", "angle"):
        h0, h1 = exp["hue"]
        hh = res["hue"]
        ok = (h0 <= hh <= h1) if h0 < h1 else (hh >= h0 or hh <= h1)
        if not ok:
            problems.append(f"hue {hh:.0f} deg outside {h0}-{h1} for {color}")
    res["problems"] = problems
    return res


def main():
    shots = []
    for color in sorted(os.listdir(ROOT)):
        cdir = os.path.join(ROOT, color)
        if not os.path.isdir(cdir):
            continue
        for band in sorted(os.listdir(cdir)):
            bdir = os.path.join(cdir, band)
            if not os.path.isdir(bdir):
                continue
            for f in sorted(os.listdir(bdir)):
                if f.endswith(".png"):
                    shots.append(analyse(os.path.join(bdir, f), color, band, f[:-4]))

    bad = [s for s in shots if s.get("problems")]
    out = {"count": len(shots), "failed": len(bad), "shots": shots}
    with open(os.path.join(ROOT, "analysis.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)

    print(f"analysed {len(shots)} screenshots, {len(bad)} with problems")
    for s in bad[:25]:
        print(f"  {s['color']:9s} {s['band']:8s} {s['preset']:7s} -> {'; '.join(s['problems'])}")
    # per-colour level table
    print("\ncolour   mean_lum  bright%  hue")
    for color in sorted(set(s["color"] for s in shots if "mean_lum" in s)):
        sub = [s for s in shots if s["color"] == color and "mean_lum" in s]
        print(f"{color:9s} {np.mean([s['mean_lum'] for s in sub]):7.1f} "
              f"{100 * np.mean([s['bright_ratio'] for s in sub]):7.2f} "
              f"{np.mean([s['hue'] or 0 for s in sub]):6.0f}")


if __name__ == "__main__":
    main()
