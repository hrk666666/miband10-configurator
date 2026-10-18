import React, { useEffect, useRef, useState } from "react";
import { useConfig } from "../store.js";
import { COLORWAYS, BANDS, PRESETS } from "../data.js";

const BAND_SWATCH = {
  tpu: "#232327",
  leather: "#6b4a35",
  woven: "#8a6b52",
  metal: "#b9bbbd",
  mesh: "#b0b2b4",
};

export default function Panel() {
  const {
    bodyColor, setBodyColor, bandType, setBandType, bandColor, setBandColor,
    setCustomScreenImage, cameraPreset, setCameraPreset, bend, setBend,
  } = useConfig();
  const fileRef = useRef(null);
  const [toast, setToast] = useState("");
  const [uploadName, setUploadName] = useState("");

  useEffect(() => {
    const cw = COLORWAYS.find((c) => c.id === bodyColor);
    if (cw) setBandColor(cw.band);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyColor]);

  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setCustomScreenImage(img);
      setUploadName(f.name);
      notify("表盘已应用");
    };
    img.src = url;
  };

  const shot = () => {
    if (!window.__shot) return;
    const url = window.__shot();
    const a = document.createElement("a");
    a.href = url;
    a.download = `miband10-${Date.now()}.png`;
    a.click();
    notify("截图已保存");
  };

  return (
    <aside className="panel">
      <header className="brand">
        <div className="brand-mark">10</div>
        <div>
          <h1>Xiaomi Smart Band 10</h1>
          <p>1.72″ AMOLED · 212×520 · 2.5D 玻璃</p>
        </div>
      </header>

      <section>
        <h2>配色 <span>Colourway</span></h2>
        <div className="swatches">
          {COLORWAYS.map((c) => (
            <button
              key={c.id}
              className={`swatch ${bodyColor === c.id ? "on" : ""}`}
              onClick={() => setBodyColor(c.id)}
              title={`${c.name} / ${c.en}`}
            >
              <i style={{ background: c.swatch }} />
              <b>{c.name}</b>
              <em>{c.en}</em>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>表带 <span>Strap</span></h2>
        <div className="bands">
          {BANDS.map((b) => (
            <button
              key={b.id}
              className={`band ${bandType === b.id ? "on" : ""}`}
              onClick={() => {
                setBandType(b.id);
                setBandColor(BAND_SWATCH[b.id]);
              }}
            >
              <b>{b.name}</b>
              <em>{b.note}</em>
            </button>
          ))}
        </div>
        <label className="color-row">
          <span>表带颜色</span>
          <input type="color" value={bandColor} onChange={(e) => setBandColor(e.target.value)} />
          <code>{bandColor.toUpperCase()}</code>
        </label>
        <label className="range">
          <span>佩戴松紧 · 135–210 mm</span>
          <input
            type="range" min="-1" max="1" step="0.02" value={bend}
            onChange={(e) => setBend(parseFloat(e.target.value))}
          />
        </label>
      </section>

      <section>
        <h2>表盘 <span>Watch face</span></h2>
        <div className="upload-row">
          <button className="btn" onClick={() => fileRef.current?.click()}>上传图片…</button>
          {uploadName && (
            <button className="btn ghost" onClick={() => { setCustomScreenImage(null); setUploadName(""); }}>
              还原官方
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <p className="hint">
          PNG / JPG，纵向 1:2.45 最佳（如 424×1040），会等比铺满 16.49×40.46 mm 显示区。
          {uploadName && <> 当前：{uploadName}</>}
        </p>
      </section>

      <section>
        <h2>机位 <span>Camera</span></h2>
        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={cameraPreset === p.id ? "on" : ""}
              onClick={() => setCameraPreset(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="actions">
        <button className="btn primary" onClick={shot}>保存截图 PNG</button>
        <a className="btn ghost" href="https://github.com/hrk666666/miband10-configurator" target="_blank" rel="noreferrer">
          源码 / 参考图
        </a>
      </section>

      <footer>
        <p>几何依据 mi.com 规格页与实测图（references/manifest.md），单位 mm。</p>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </aside>
  );
}
