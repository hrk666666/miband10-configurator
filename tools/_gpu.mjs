import { chromium } from "playwright-core";
const br = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  args: ["--no-sandbox","--enable-unsafe-swiftshader","--disable-gpu-sandbox"] });
const p = await br.newPage();
await p.goto("chrome://gpu");
await p.waitForTimeout(2500);
const txt = await p.evaluate(() => document.body.innerText);
console.log(txt.split("\n").filter(l => /WebGL|GL_RENDERER|Vulkan|SwiftShader|Problems|Disabled|software/i.test(l)).slice(0,40).join("\n"));
await br.close();
