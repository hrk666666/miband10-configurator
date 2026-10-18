import React, { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useConfig } from "../store.js";
import { COLORWAYS, BANDS } from "../data.js";

const MODEL_URL = `${import.meta.env.BASE_URL}models/miband10.glb`;
const BAND_MAT = { tpu: "BandTPU", leather: "BandLeather", woven: "BandWoven", metal: "BandMetal", mesh: "BandMesh" };

export default function Watch({ onReady }) {
  const { scene, nodes, materials } = useGLTF(MODEL_URL);
  const bodyColor = useConfig((s) => s.bodyColor);
  const bandType = useConfig((s) => s.bandType);
  const bandColor = useConfig((s) => s.bandColor);
  const customScreenImage = useConfig((s) => s.customScreenImage);
  const bend = useConfig((s) => s.bend);
  const baseMap = useRef(null);
  const screenMat = useRef(null);

  const cw = useMemo(() => COLORWAYS.find((c) => c.id === bodyColor) || COLORWAYS[0], [bodyColor]);

  useEffect(() => {
    if (materials.Screen && !baseMap.current) baseMap.current = materials.Screen.emissiveMap;
  }, [materials]);

  // body colours ----------------------------------------------------------------
  useEffect(() => {
    const frame = materials.Frame;
    const back = materials.BackCover;
    if (frame) {
      frame.color = new THREE.Color(cw.frame.color);
      frame.metalness = cw.frame.metalness;
      frame.roughness = cw.frame.roughness;
      if ("clearcoat" in frame) frame.clearcoat = cw.frame.clearcoat ?? 0.12;
      frame.envMapIntensity = 1.1;
    }
    if (back) {
      back.color = new THREE.Color(cw.back);
      back.metalness = cw.id === "pearl" ? 0.0 : 0.22;
      back.roughness = cw.id === "pearl" ? 0.18 : 0.56;
      if ("clearcoat" in back) back.clearcoat = cw.id === "pearl" ? 0.85 : 0.0;
      back.envMapIntensity = 0.9;
    }
  }, [cw, materials]);

  // glass ------------------------------------------------------------------------
  useEffect(() => {
    const bezel = materials.GlassBezel;
    const win = materials.GlassWindow;
    if (bezel) {
      bezel.color = new THREE.Color("#050506");
      bezel.roughness = 0.05;
      bezel.metalness = 0.0;
      bezel.envMapIntensity = 0.45;
      if ("clearcoat" in bezel) { bezel.clearcoat = 1; bezel.clearcoatRoughness = 0.02; }
      bezel.needsUpdate = true;
    }
    if (win) {
      // transparent cover glass over the emissive panel. KHR_materials_transmission is present in the
      // GLB, but a plain transparent layer is cheaper and deterministic in headless WebGL.
      // cover glass: thin transparent layer + strong specular. transmission is disabled at
      // runtime because the full-screen transmission pass is 3x slower in headless WebGL and
      // the visual difference over an emissive panel is negligible (see CHANGELOG round 1).
      // reflection-only cover glass: additive blending with a black base means the layer
      // contributes just its specular lobe instead of veiling the panel in grey.
      // thin cover glass: mostly transparent with a narrow specular lobe
      win.transparent = true;
      win.opacity = 0.032;
      win.color = new THREE.Color("#0b0c0e");
      win.blending = THREE.NormalBlending;
      win.roughness = 0.045;
      win.metalness = 0.0;
      win.depthWrite = false;
      win.envMapIntensity = 0.75;
      win.side = THREE.FrontSide;
      if ("transmission" in win) win.transmission = 0;
      if ("clearcoat" in win) win.clearcoat = 1.0;
      win.needsUpdate = true;
    }

  }, [materials]);

  // band visibility + colour ------------------------------------------------------
  useEffect(() => {
    for (const b of BANDS) {
      for (const side of ["R", "L"]) {
        const n = nodes[`Band_${b.id}_${side}`];
        if (n) n.visible = b.id === bandType;
        const c = nodes[`Collar_${b.id}_${side}`];
        if (c) c.visible = b.id === bandType;
      }
    }
    const mat = materials[BAND_MAT[bandType]];
    if (mat) {
      mat.color = new THREE.Color(bandColor);
      if (bandType === "tpu" || bandType === "leather" || bandType === "woven") mat.metalness = 0.0;
    }
  }, [bandType, bandColor, nodes, materials]);

  // bend via skeletons -------------------------------------------------------------
  const rest = useRef({});
  useEffect(() => {
    for (const b of BANDS) {
      for (const side of ["R", "L"]) {
        for (let i = 0; i < 9; i++) {
          const key = `Bone_${b.id}_${side}_${i}`;
          const n = nodes[key];
          if (!n) continue;
          if (!rest.current[key]) rest.current[key] = n.quaternion.clone();
        }
      }
    }
  }, [nodes]);

  useEffect(() => {
    // opening (+bend) allows 1.9 deg per bone, closing is limited to 0.95 deg so the tail
    // never presses into the strap (checked by tools/selfintersect.mjs)
    const step = THREE.MathUtils.degToRad(bend >= 0 ? bend * 1.9 : bend * 0.95);
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    for (const b of BANDS) {
      for (const side of ["R", "L"]) {
        for (let i = 0; i < 9; i++) {
          const key = `Bone_${b.id}_${side}_${i}`;
          const n = nodes[key];
          const base = rest.current[key];
          if (!n || !base) continue;
          // mirrored halves need opposite rotations to move the same way
          q.setFromAxisAngle(axis, step * (i === 0 ? 0.3 : 1) * (side === "L" ? -1 : 1));
          n.quaternion.copy(base).multiply(q);
          n.updateMatrixWorld(true);
        }
      }
    }
  }, [bend, nodes]);

  // user screen image --------------------------------------------------------------
  // The panel is unlit (MeshBasicMaterial): an OLED emits its own light and must not pick up
  // specular from the studio lights, otherwise black turns grey. The cover glass above adds
  // the reflection instead.
  useEffect(() => {
    const mesh = nodes.Screen;
    if (!mesh) return;
    if (!screenMat.current) {
      screenMat.current = new THREE.MeshBasicMaterial({
        map: baseMap.current,
        color: 0xffffff,
        toneMapped: true,
      });
      mesh.material = screenMat.current;
    }
    const mat = screenMat.current;
    if (customScreenImage) {
      const tex = new THREE.Texture(customScreenImage);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      mat.map = tex;
    } else {
      mat.map = baseMap.current;
    }
    mat.needsUpdate = true;
  }, [customScreenImage, nodes]);

  useEffect(() => {
    if (scene) onReady?.();
  }, [scene, onReady]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_URL);
