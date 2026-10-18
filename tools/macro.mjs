import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:900,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { window.__store.getState().setCameraPreset("macro"); window.__snapCamera("macro"); });
await p.waitForTimeout(900);
await p.screenshot({ path: "/tmp/macro.png", clip: {x:0,y:0,width:900,height:640} });
await b.close();
