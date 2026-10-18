import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import Watch from "./scene/Watch.jsx";
import { useConfig } from "./store.js";
import { PRESETS } from "./data.js";
import Panel from "./ui/Panel.jsx";
import Loading from "./ui/Loading.jsx";

const HDRI = `${import.meta.env.BASE_URL}hdri/studio.hdr`;

/** Smoothly flies the camera to the active preset. */
function CameraRig({ controls }) {
  const { camera } = useThree();
  const preset = useConfig((s) => s.cameraPreset);
  const target = useRef(new THREE.Vector3(0, -2, 0));
  const pos = useRef(new THREE.Vector3(...PRESETS[0].pos));
  const goalPos = useRef(new THREE.Vector3(...PRESETS[0].pos));
  const goalTarget = useRef(new THREE.Vector3(...PRESETS[0].target));
  const animating = useRef(true);
  const [fov, setFov] = useState(26);
  const goalFov = useRef(26);

  const goto = (p) => {
    goalPos.current.set(...p.pos);
    goalTarget.current.set(...p.target);
    goalFov.current = p.fov;
    animating.current = true;
  };

  useEffect(() => {
    const p = PRESETS.find((x) => x.id === preset) || PRESETS[0];
    goto(p);
  }, [preset]);

  useFrame((_, dt) => {
    if (!animating.current) {
      // user is orbiting: keep our tween state in sync, do not touch the camera
      if (controls.current) target.current.copy(controls.current.target);
      pos.current.copy(camera.position);
      return;
    }
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 9);
    pos.current.lerp(goalPos.current, k);
    target.current.lerp(goalTarget.current, k);
    camera.position.copy(pos.current);
    camera.fov += (goalFov.current - camera.fov) * k;
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.copy(target.current);
      controls.current.update();
    }
    if (pos.current.distanceTo(goalPos.current) < 0.05 && Math.abs(camera.fov - goalFov.current) < 0.05) {
      animating.current = false;
    }
  });

  // deterministic helpers for the screenshot tooling
  useEffect(() => {
    window.__snapCamera = (id) => {
      const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
      pos.current.set(...p.pos);
      target.current.set(...p.target);
      goalPos.current.set(...p.pos);
      goalTarget.current.set(...p.target);
      goalFov.current = p.fov;
      camera.position.copy(pos.current);
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
      if (controls.current) {
        controls.current.target.copy(target.current);
        controls.current.update();
      }
      animating.current = false;
    };
    window.__setView = (position, lookAt, fov = 26) => {
      pos.current.set(...position);
      goalPos.current.set(...position);
      target.current.set(...lookAt);
      goalTarget.current.set(...lookAt);
      camera.position.set(...position);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      if (controls.current) {
        controls.current.target.set(...lookAt);
        controls.current.update();
      }
      animating.current = false;
    };
  }, [camera]);
  return null;
}

function CaptureBridge({ onReady }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    window.__shot = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    window.__scene = scene;
    window.__camera = camera;
    window.__setVis = (pred, vis) => {
      scene.traverse((o) => { if (o.isMesh && pred(o.name || "")) o.visible = vis; });
    };
    window.__rendererInfo = () => ({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    onReady?.();
  }, [gl, scene, camera, onReady]);
  return null;
}

export default function App() {
  const controls = useRef();
  const [ready, setReady] = useState(false);
  const preset = useConfig((s) => s.cameraPreset);

  useEffect(() => {
    window.__app = { ready };
  }, [ready]);

  return (
    <div className="app">
      <div className="stage">
        <Canvas
          dpr={[1, 1.75]}
          shadows={false}
          gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" }}
          camera={{ position: [92, 46, 96], fov: 26, near: 1, far: 800 }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            scene.background = new THREE.Color("#0d0e11");
            window.__gl = gl;
          }}
        >
          <Suspense fallback={null}>
            <Environment files={HDRI} background={false} environmentIntensity={0.72} />
            <directionalLight position={[60, 80, 90]} intensity={0.55} color="#ffffff" />
            <directionalLight position={[-70, -20, 40]} intensity={0.25} color="#bcd2ff" />
            <Watch onReady={() => setReady(true)} />
            <ContactShadows position={[0, -34, 0]} opacity={0.28} scale={160} blur={2.6} far={70} resolution={512} color="#000000" />
            <CameraRig controls={controls} />
            <OrbitControls
              ref={controls}
              enablePan={false}
              minDistance={34}
              maxDistance={230}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.75}
              zoomSpeed={0.8}
            />
            <CaptureBridge onReady={() => {}} />
            <AdaptiveDpr pixelated />
          </Suspense>
        </Canvas>
        <Loading ready={ready} />
      </div>
      <Panel />
    </div>
  );
}
