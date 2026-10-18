import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:760,height:820} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { window.__store.getState().setCameraPreset("macro"); window.__snapCamera("macro"); });
await p.waitForTimeout(800);
await p.screenshot({ path: "/tmp/g_on.png", clip:{x:0,y:0,width:760,height:640} });
await p.evaluate(() => { window.__setVis((n)=>n==="GlassWindow", false); });
await p.waitForTimeout(400);
await p.screenshot({ path: "/tmp/g_off.png", clip:{x:0,y:0,width:760,height:640} });
const v = await p.evaluate(() => { const o=window.__scene.getObjectByName("GlassWindow"); return { pos: o.geometry.attributes.position.count, idx: o.geometry.index.count, uvMinMax: (()=>{const a=o.geometry.attributes.uv.array;let mn=[9,9],mx=[-9,-9];for(let i=0;i<a.length;i+=2){mn[0]=Math.min(mn[0],a[i]);mn[1]=Math.min(mn[1],a[i+1]);mx[0]=Math.max(mx[0],a[i]);mx[1]=Math.max(mx[1],a[i+1]);}return [mn,mx];})() }; });
console.log(JSON.stringify(v));
await b.close();
