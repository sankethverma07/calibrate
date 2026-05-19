/* ════════════════════════════════════════════════════════════════════
   ParticleWave · InstancedMesh implementation

   Renders thousands of REAL 3D hexagonal disks in a single GPU draw
   call via THREE.InstancedMesh. Each instance is a CylinderGeometry
   with 6 radial segments (= hexagon) flattened into a thin coin.

   Why this beats gl.POINTS:
     • Real geometry — casts/receives shadows, catches light, has
       PHYSICAL material (transmission, clearcoat, metalness).
     • Single draw call for 4-5k particles via InstancedMesh.
     • Per-instance position, scale, color via instanceMatrix +
       instanceColor — no expensive per-fragment shader work.
     • Naturally hexagonal silhouette = real lens-iris bokeh shape.

   © 2026 Sanketh Verma · MIT
   ════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 3200;        // tuned for perf — 3,200 hex disks
const GRID_W = 16.0;       // x-axis spread
const Z_NEAR = 0.15;
const Z_FAR  = 13.0;
const TRAVEL_FREQ = 1.4;

// Tanner Helland Kelvin → RGB (run once at build time)
function kelvinToRGB(K) {
  const t = K / 100;
  const r = t <= 66 ? 1 : Math.min(1, Math.max(0, Math.pow(t - 60, -0.1332) * 1.292));
  const g = t <= 66
    ? Math.min(1, Math.max(0, 0.39 * Math.log(t) - 0.6318))
    : Math.min(1, Math.max(0, Math.pow(t - 60, -0.0755) * 1.129));
  const b = t >= 66 ? 1 : (t <= 19 ? 0 : Math.min(1, Math.max(0, 0.543 * Math.log(t - 10) - 1.196)));
  return [r, g, b];
}

function gauss() {
  const u = Math.max(1e-9, Math.random());
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function ParticleWave({
  color = new THREE.Color('#ffffff'),
  travelAmp = 0.30,
  travelSpeed = 0.18,
  opacity = 1.0,
  moodTint = 0.30,
  eqBands = [0, 0, 0, 0, 0, 0, 0, 0],
}) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const accentColor = useMemo(() => new THREE.Color(), []);

  // Per-instance attributes generated once
  const seed = useMemo(() => {
    const data = [];
    for (let i = 0; i < COUNT; i++) {
      // Distribute particles bottom-weighted toward center so the visible
      // density matches a real wave (denser near foreground).
      // Center-biased radial distribution.
      const angle = Math.random() * Math.PI * 2;
      const radial = Math.pow(Math.random(), 0.7);   // bias toward center
      const x = Math.cos(angle) * radial * GRID_W * 0.5;
      const z = Z_NEAR + Math.pow(Math.random(), 0.6) * (Z_FAR - Z_NEAR);

      // Log-normal size — most particles small, rare big ones for highlights
      const baseSize = Math.min(0.42, Math.max(0.03, 0.07 * Math.exp(gauss() * 0.7)));

      // Brightness multiplier (log-normal)
      const brightMul = Math.min(2.4, Math.max(0.4, Math.exp(gauss() * 0.45)));

      // Color temperature (Kelvin) — center 5500K ± 1800K
      const k = 5500 + (Math.random() - 0.5) * 3600;
      const [kr, kg, kb] = kelvinToRGB(k);

      data.push({
        baseX: x,
        baseZ: z,
        baseSize,
        brightMul,
        phase: Math.random() * Math.PI * 2,
        wobblePhase: Math.random() * Math.PI * 2,
        kelvin: { r: kr, g: kg, b: kb },
      });
    }
    return data;
  }, []);

  // One-shot setup: write initial matrices + colors to the InstancedMesh
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    for (let i = 0; i < COUNT; i++) {
      const p = seed[i];
      dummy.position.set(p.baseX, 0, p.baseZ);
      dummy.scale.setScalar(p.baseSize);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tmpColor.setRGB(p.kelvin.r, p.kelvin.g, p.kelvin.b);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seed, dummy, tmpColor]);

  // Per-frame: write displaced position + per-instance color tint
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const nT = t * (1.5 + travelSpeed * 3.0);
    accentColor.copy(color);

    for (let i = 0; i < COUNT; i++) {
      const p = seed[i];
      const x = p.baseX;
      const z = p.baseZ;

      // Multi-directional wave field (matches the original Calibrate
      // wave math). Cheaper than the shader version — 6 trig calls.
      const fx = x * TRAVEL_FREQ;
      const fz = z * TRAVEL_FREQ * 0.7;
      let n  = Math.sin(fx + nT) * 1.0;
      n += Math.sin(fz + nT * 0.85) * 0.85;
      n += Math.sin((fx + fz) * 0.7 + nT * 1.2) * 0.55;
      n += Math.cos((fx - fz) * 0.8 + nT * 0.95) * 0.5;
      n = (n / 2.9) * travelAmp;

      // EQ band modulation — sample which band the particle's X sits in
      const xNorm = Math.max(0, Math.min(1, (x / (GRID_W / 2) + 1) * 0.5));
      const bandIdxF = xNorm * 7;
      const lo = Math.floor(bandIdxF);
      const hi = Math.min(7, lo + 1);
      const f = bandIdxF - lo;
      const gain = (eqBands[lo] || 0) * (1 - f) + (eqBands[hi] || 0) * f;
      n *= 1.0 + gain * 0.4;

      // Subtle xy wobble for organic feel
      const wobX = Math.cos(t * 0.3 + p.wobblePhase) * 0.04;

      dummy.position.set(x + wobX, n, z);
      dummy.scale.setScalar(p.baseSize * p.brightMul);
      // Rotate the hex disk so it always faces +Z (toward camera approximately)
      dummy.rotation.set(Math.PI / 2, 0, p.phase);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Per-instance color: mix Kelvin → mood tint
      tmpColor.setRGB(
        p.kelvin.r * (1 - moodTint) + accentColor.r * moodTint,
        p.kelvin.g * (1 - moodTint) + accentColor.g * moodTint,
        p.kelvin.b * (1 - moodTint) + accentColor.b * moodTint,
      ).multiplyScalar(p.brightMul);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    >
      {/* Hex disk: 6-sided cylinder, flattened to 0.1 thickness, then
          rotated to face camera. Acts as a real 3D bokeh shape with
          physical lighting. */}
      <cylinderGeometry args={[0.5, 0.5, 0.1, 6, 1]} />
      <meshPhysicalMaterial
        vertexColors
        transparent
        opacity={opacity * 0.95}
        metalness={0.15}
        roughness={0.35}
        clearcoat={0.55}
        clearcoatRoughness={0.18}
        emissive="#ffffff"
        emissiveIntensity={0.45}
        toneMapped
      />
    </instancedMesh>
  );
}
