import { chromium } from "playwright-core";
import fs from "node:fs";
const COLORS = ["midnight","glacier","rose","pearl","glimmer"];
const BANDS = ["tpu","leather","woven","metal","mesh"];
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:900,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => document.body.classList.add("capture"));
for (const c of COLORS) for (const band of BANDS) {
  await p.evaluate(({c,band}) => { const s=window.__store.getState(); s.setBodyColor(c); s.setBandType(band); s.setCameraPreset("lug"); window.__snapCamera("lug"); }, {c,band});
  await p.waitForTimeout(320);
  for (const r of ["round-1","round-2"]) {
    const f = `snapshots/${r}/${c}/${band}/lug.png`;
    if (fs.existsSync(f)) await p.screenshot({ path: f });
  }
}
await b.close();
