import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:1100,height:820} });
const errs=[]; p.on("pageerror", e=>errs.push(e.message));
await p.goto("http://localhost:4173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:180000 });
await p.waitForTimeout(2000);
await p.screenshot({ path: "/workspace/docs/evidence/production-build.png" });
console.log("errors:", errs.length, errs.slice(0,3));
await b.close();
