import { create } from "zustand";

export const useConfig = create((set, get) => ({
  // ---- required state shape
  bodyColor: "midnight",
  bandType: "tpu",
  bandColor: "#232327",
  customScreenImage: null,
  cameraPreset: "angle",
  // ---- extras
  bend: 0,              // -1 open .. +1 tight, 0 = 180 mm wrist
  autoRotate: false,
  showGrid: false,

  setBodyColor: (id) => {
    const c = id;
    set({ bodyColor: c });
  },
  setBandType: (t) => set({ bandType: t }),
  setBandColor: (c) => set({ bandColor: c }),
  setCustomScreenImage: (img) => set({ customScreenImage: img }),
  setCameraPreset: (p) => set({ cameraPreset: p }),
  setBend: (v) => set({ bend: v }),
  setAutoRotate: (v) => set({ autoRotate: v }),
}));
