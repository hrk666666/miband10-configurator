import { chromium } from "playwright-core";
import fs from "node:fs";
const OUT = "snapshots/bands"; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:760,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => document.body.classList.add("capture"));
for (const t of ["tpu","leather","woven","metal","mesh"]) {
  await p.evaluate((x) => { window.__store.getState().setBandType(x); window.__store.getState().setCameraPreset("angle"); window.__snapCamera("angle"); }, t);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${t}.png` });
}
await b.close();
