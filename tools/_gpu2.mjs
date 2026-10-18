import { chromium } from "playwright-core";
const br = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  args: ["--no-sandbox","--enable-unsafe-swiftshader","--disable-gpu-sandbox"] });
const p = await br.newPage();
await p.goto("chrome://gpu");
await p.waitForTimeout(4000);
const txt = await p.evaluate(() => document.body.innerText);
console.log("len", txt.length);
console.log(txt.slice(0, 3000));
await br.close();
