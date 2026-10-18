/**
 * Final acceptance: 8 pseudo-random camera angles on the default configuration.
 * Deterministic seed so the set can be reproduced.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = "snapshots/acceptance";
fs.mkdirSync(OUT, { recursive: true });
const angles = [];
let s = 20251018;
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = 0; i < 8; i++) {
  angles.push({
    az: Math.round(rnd() * 360),
    el: Math.round(-25 + rnd() * 65),
    dist: Math.round(150 + rnd() * 70),
  });
}

const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:800,height:800} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => document.body.classList.add("capture"));

for (let i = 0; i < angles.length; i++) {
  const a = angles[i];
  await p.evaluate(({ a }) => {
    const az = (a.az * Math.PI) / 180, el = (a.el * Math.PI) / 180;
    const target = [0, 0, -14];
    const pos = [
      Math.sin(az) * Math.cos(el) * a.dist,
      Math.sin(el) * a.dist,
      Math.cos(az) * Math.cos(el) * a.dist - 14,
    ];
    window.__setView(pos, target, 26);
  }, { a });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/angle-${i + 1}.png` });
}
fs.writeFileSync(`${OUT}/angles.json`, JSON.stringify(angles, null, 2));
console.log("shot", angles.length, "angles:", JSON.stringify(angles));
await b.close();
