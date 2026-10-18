import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:760,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
const info = await p.evaluate(() => {
  const o = window.__scene.getObjectByName("Screen");
  const uv = o.geometry.attributes.uv.array;
  let mn=[9,9], mx=[-9,-9];
  for (let i=0;i<uv.length;i+=2){ mn[0]=Math.min(mn[0],uv[i]); mn[1]=Math.min(mn[1],uv[i+1]); mx[0]=Math.max(mx[0],uv[i]); mx[1]=Math.max(mx[1],uv[i+1]); }
  const mat=o.material;
  return { min: mn, max: mx, emissiveIntensity: mat.emissiveIntensity, emissive: mat.emissive.getHexString(), color: mat.color.getHexString(), map: !!mat.map, emissiveMapSize: mat.emissiveMap? [mat.emissiveMap.image.width, mat.emissiveMap.image.height]:null, flipY: mat.emissiveMap?.flipY, wrapS: mat.emissiveMap?.wrapS };
});
console.log(JSON.stringify(info));
await b.close();
