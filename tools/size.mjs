import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:900,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => document.body.classList.add("capture"));
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  return JSON.stringify({ css:[r.width,r.height], buffer:[c.width,c.height], dpr: window.devicePixelRatio, viewport:[innerWidth,innerHeight], stage: document.querySelector('.stage').getBoundingClientRect().height });
}));
await b.close();
