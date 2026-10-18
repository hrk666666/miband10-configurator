import React from "react";

export default function Loading({ ready }) {
  return (
    <div className={`loading ${ready ? "done" : ""}`}>
      <div className="spinner" />
      <p>正在载入 3D 模型…</p>
    </div>
  );
}
