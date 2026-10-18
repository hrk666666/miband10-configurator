import { chromium } from "playwright-core";
import fs from "node:fs";
const OUT = process.argv[2] || "snapshots/clean";
const W = 900, H = 900;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:W,height:H} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => document.body.classList.add("capture"));
for (const preset of ["front","back","left","angle","macro","lug"]) {
  await p.evaluate((x) => { window.__store.getState().setCameraPreset(x); window.__snapCamera(x); }, preset);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${preset}.png` });
}
await b.close();
