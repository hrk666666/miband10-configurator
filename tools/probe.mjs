import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = process.argv[2] || "snapshots/_probe";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1160, height: 820 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForFunction(() => window.__app?.ready === true, null, { timeout: 180000 });
await page.waitForTimeout(2000);

for (const preset of ["front", "back", "left", "angle", "macro", "lug"]) {
  await page.evaluate((p) => { window.__store.getState().setCameraPreset(p); window.__snapCamera(p); }, preset);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${preset}.png`, clip: { x: 0, y: 0, width: 1160, height: 820 } });
}
console.log(logs.slice(0, 12).join("\n"));
console.log("info", JSON.stringify(await page.evaluate(() => window.__rendererInfo?.())));
await browser.close();
