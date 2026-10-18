import { chromium } from "playwright-core";
const b = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"],
});
const p = await b.newPage();
await p.setContent("<canvas id=c></canvas>");
const r = await p.evaluate(() => { const c=document.getElementById('c'); const g=c.getContext('webgl2')||c.getContext('webgl'); return g? g.getParameter(g.VERSION)+' | '+g.getParameter(g.RENDERER) : 'none'; });
console.log('=>', r);
await b.close();
