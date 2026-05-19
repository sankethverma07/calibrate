/* ════════════════════════════════════════════════════════════════════
   Cinematic — DSLR-grade post-processing pipeline.

   Pipeline order:
     1. DepthOfField  — true scene-depth bokeh (not faked in shader)
     2. Bloom         — physically-plausible glow on bright pixels
     3. ChromaticAberration — RGB split for "real lens" feel
     4. Noise         — film grain
     5. Vignette      — corner darkening

   Each parameter is wired to a Leva slider in App.jsx so we can
   tune it live.

   © 2026 Sanketh Verma · MIT
   ════════════════════════════════════════════════════════════════════ */
import React from 'react';
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';

export default function Cinematic({
  enableDOF = true,
  focusDistance = 0.035,
  focalLength = 0.02,
  bokehScale = 2.0,
  bloom = 0.4,
  chromaticAberration = 0.0006,
  noise = 0.05,
  vignette = 0.45,
}) {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      {enableDOF ? (
        <DepthOfField
          focusDistance={focusDistance}
          focalLength={focalLength}
          bokehScale={bokehScale}
          height={720}
        />
      ) : null}
      {/* Bloom tuned for HDR particles: threshold high enough that only
          the bright outliers glow, smoothing wide so it feels like real
          lens halation rather than a hard cutoff. */}
      <Bloom
        intensity={bloom * 0.7}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.45}
        mipmapBlur
        radius={0.65}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(chromaticAberration, chromaticAberration)}
        radialModulation={false}
        modulationOffset={0}
      />
      {/* Noise default blend is AVERAGE which gives nice film grain */}
      <Noise opacity={noise} premultiply />
      <Vignette
        eskil={false}
        offset={0.3}
        darkness={vignette}
      />
    </EffectComposer>
  );
}
