import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:700,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { document.body.classList.add("capture"); window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await p.waitForTimeout(900);
const shots = {};
async function sample(tag, fn) {
  if (fn) await p.evaluate(fn);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `/tmp/iso_${tag}.png`, clip:{x:330,y:560,width:60,height:60} });
}
await sample("all");
await sample("noGlass", () => window.__setVis((n)=>n==="GlassWindow"||n==="GlassBezel", false));
await sample("noScreen", () => window.__setVis((n)=>n==="Screen", false));
await sample("noBack", () => window.__setVis((n)=>n==="BackCover", false));
await b.close();
