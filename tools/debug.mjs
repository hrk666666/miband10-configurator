import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1160, height: 820 } });
page.on("console", (m) => console.log(`[${m.type()}]`, m.text().slice(0,300)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 500)));
page.on("requestfailed", (r) => console.log("[reqfail]", r.url(), r.failure()?.errorText));
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForTimeout(15000);
console.log("ready:", await page.evaluate(() => window.__app?.ready));
await page.screenshot({ path: "/tmp/debug.png" });
await browser.close();
