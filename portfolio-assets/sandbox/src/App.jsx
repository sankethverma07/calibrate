import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Stats,
  PerspectiveCamera,
  TransformControls,
} from '@react-three/drei';
import { Leva, useControls } from 'leva';
import * as THREE from 'three';

import ParticleWave from './components/ParticleWave.jsx';
import EQCard from './components/EQCard.jsx';
import Cinematic from './components/Cinematic.jsx';
import { runTimeline, resetTimeline, director, MOOD_NAMES, tickDirector } from './timeline.js';

const MOODS = {
  cruising: { color: '#2dd4bf', amp: 0.30, speed: 0.18 },
  locked:   { color: '#60a5fa', amp: 0.55, speed: 0.32 },
  drift:    { color: '#c084fc', amp: 0.85, speed: 0.45 },
  restless: { color: '#fb923c', amp: 1.20, speed: 0.65 },
};

const EQ_ZERO_STATIC = [0, 0, 0, 0, 0, 0, 0, 0];

function CameraSaver() {
  const { camera } = useThree();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 's' || e.key === 'S') {
        const p = camera.position;
        const t = camera.getWorldDirection(new THREE.Vector3()).add(p);
        // eslint-disable-next-line no-console
        console.log('[shot] camPos:', p.toArray().map(n => +n.toFixed(2)),
                    'lookAt:', t.toArray().map(n => +n.toFixed(2)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera]);
  return null;
}

// Per-frame: applies FOV, exposure, and (optionally) auto-focuses on a target
function CameraDriver({ fov, exposureMul, autofocus, focusTarget, onAutoFocus }) {
  const { camera, gl } = useThree();
  useFrame(() => {
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    gl.toneMappingExposure = exposureMul;
    if (autofocus && focusTarget && onAutoFocus) {
      // Distance from camera to the focus target (the card center)
      const d = camera.position.distanceTo(focusTarget);
      onAutoFocus(d);
    }
  });
  return null;
}

/* In play mode, the Director takes over: it writes camera position +
   lookAt + scene uniforms every frame. React state mirrors only the
   things that components key on (mood preset, build values). */
// Mood → background tint. Deep, very-low-luminance versions of the mood
// color give the scene a SUBTLE warmth/coolness without overpowering.
const BG_MOOD = {
  cruising: new THREE.Color('#02060a'),    // near-black with slight teal
  locked:   new THREE.Color('#020610'),    // near-black with slight blue
  drift:    new THREE.Color('#070310'),    // near-black with slight magenta
  restless: new THREE.Color('#0a0602'),    // near-black with slight warm orange
};
const _bgTarget = new THREE.Color('#04060a');

function DirectorSync({ enabled, onTick }) {
  const { camera, scene } = useThree();
  const lastTick = useRef({ cardBuild: -1, slidersBuild: -1, moodIdx: -1, waveOpacity: -1, textReveal: -1 });
  useFrame((state, dt) => {
    if (!enabled) return;
    tickDirector(performance.now());
    camera.position.copy(director.camPos);
    camera.lookAt(director.camLook);

    // Animate scene background toward the current mood — slow lerp so it
    // feels like a room's lighting subtly shifting, not a snap.
    const moodKey = ['cruising', 'locked', 'drift', 'restless'][director.moodIdx] || 'cruising';
    _bgTarget.copy(BG_MOOD[moodKey]);
    if (scene.background && scene.background.isColor) {
      scene.background.lerp(_bgTarget, Math.min(1, dt * 0.6));
    }
    const t = lastTick.current;
    if (Math.abs(director.cardBuild - t.cardBuild) > 0.005 ||
        Math.abs(director.slidersBuild - t.slidersBuild) > 0.005 ||
        Math.abs((director.waveOpacity ?? 1) - t.waveOpacity) > 0.01 ||
        Math.abs((director.textReveal ?? 0) - t.textReveal) > 0.01 ||
        director.moodIdx !== t.moodIdx) {
      t.cardBuild = director.cardBuild;
      t.slidersBuild = director.slidersBuild;
      t.moodIdx = director.moodIdx;
      t.waveOpacity = director.waveOpacity ?? 1;
      t.textReveal = director.textReveal ?? 0;
      onTick({
        cardBuild: director.cardBuild,
        slidersBuild: director.slidersBuild,
        moodIdx: director.moodIdx,
        waveOpacity: director.waveOpacity ?? 1,
        textReveal: director.textReveal ?? 0,
      });
    }
  });
  return null;
}

export default function App() {
  const [mode, setMode] = useState('edit');
  const [showStats, setShowStats] = useState(false);
  const cameraRef = useRef();
  const cardGroupRef = useRef();
  const waveGroupRef = useRef();

  // Director-driven state — initial values match director defaults
  const [directorTick, setDirectorTick] = useState({
    cardBuild: 0, slidersBuild: 0, moodIdx: 0, waveOpacity: 1.0, textReveal: 0,
  });
  if (typeof window !== 'undefined') window.__directorTick = directorTick;

  /* ─── Mood — single preset switcher drives wave + accent ─── */
  const { preset } = useControls('Mood', {
    preset: { options: Object.keys(MOODS), value: 'cruising' },
  });
  // When playing, mood comes from the director; in edit mode, from Leva
  const effectiveMood = mode === 'play' ? MOOD_NAMES[directorTick.moodIdx] : preset;
  const moodConfig = MOODS[effectiveMood] || MOODS.cruising;
  const moodColor  = new THREE.Color(moodConfig.color);

  /* ─── Glass card material (3 sliders) ─── */
  const glass = useControls('Glass', {
    roughness:   { value: 0.30, min: 0,    max: 1,  step: 0.01 },
    thickness:   { value: 0.18, min: 0.01, max: 1,  step: 0.01 },
    ior:         { value: 1.15, min: 1.0,  max: 1.8, step: 0.01 },
  });

  /* ─── Camera — phone-style controls ───
     Direct the shot with three knobs:
       bokeh     — 0 = everything sharp · 0.5 = portrait mode · 1.0 = super macro
       focus(m)  — where the focal plane sits in meters
       zoom      — 0.5× ultra-wide → 4× telephoto (drives FOV like a phone toggle)
  */
  const cam = useControls('Camera', {
    autofocus:     { value: true, label: 'lock on card' },
    focusM:        { value: 6,    min: 0.3, max: 30,  step: 0.05, label: 'focus (m)' },
    bokeh:         { value: 0.35, min: 0,   max: 1,   step: 0.01, label: 'bokeh' },
    zoom:          { value: 1.0,  min: 0.5, max: 4,   step: 0.05, label: 'zoom (×)' },
    exposure:      { value: 0,    min: -3,  max: 3,   step: 0.1,  label: 'exposure (EV)' },
  });

  /* ─── Post-process effects (separate from camera physics) ─── */
  const post = useControls('Look', {
    bloom:        { value: 0.35, min: 0, max: 2,   step: 0.01 },
    grain:        { value: 0.04, min: 0, max: 0.2, step: 0.005 },
    vignette:     { value: 0.40, min: 0, max: 1,   step: 0.01 },
    envPreset:    { options: ['studio', 'city', 'sunset', 'dawn', 'night',
                              'warehouse', 'apartment'], value: 'apartment' },
    envIntensity: { value: 0.55, min: 0, max: 2,   step: 0.05, label: 'env light' },
  });

  /* ─── Derive renderer params from phone-style controls ───
       In play mode, ignore Leva DSLR values and use the live `director`
       object. In edit mode, use the Leva controls.
  */
  // We rebuild on EVERY render in play mode so the director values flow through
  const liveCam = mode === 'play' ? {
    bokeh: director.bokeh,
    zoom: director.zoom,
    focusM: director.focusM,
    exposure: director.exposure,
  } : cam;
  const { bokehScale, dofFocalLength, focusDistanceNorm, fovDeg, exposureMul, particleAperture } = useMemo(() => {
    const b = Math.pow(liveCam.bokeh, 1.7);     // curve — gentle bottom, aggressive top

    // Post-process bokeh size (0 → 5)
    const bokehSize = 5.0 * b;
    // DOF intensity (thinner focal plane as bokeh climbs)
    const dofFL    = 0.003 + 0.075 * b;
    // Particle-shader aperture — needs to be more aggressive so dust
    // motes form visible discs at the slider's mid-to-high range
    const partAp   = 0.10 + 5.0 * Math.pow(b, 1.3);

    // Zoom (×) → 35mm-equivalent focal length → FOV
    //   1× ≈ 50mm normal
    //   0.5× ≈ 24mm ultra-wide
    //   2× ≈ 85mm portrait
    //   4× ≈ 200mm telephoto
    const focalMM = 50 * liveCam.zoom;
    const fov     = 2 * Math.atan(36 / (2 * focalMM)) * (180 / Math.PI);

    // Focus distance (m) → normalized 0..1 depth for post-process
    const FAR = 200, NEAR = 0.1;
    const focusNorm = Math.max(0, Math.min(1, (liveCam.focusM - NEAR) / (FAR - NEAR)));

    // Exposure compensation
    const expMul = Math.pow(2, liveCam.exposure);

    return {
      bokehScale: bokehSize,
      dofFocalLength: dofFL,
      focusDistanceNorm: focusNorm,
      fovDeg: fov,
      exposureMul: expMul,
      particleAperture: partAp,
    };
  }, [liveCam.bokeh, liveCam.zoom, liveCam.focusM, liveCam.exposure]);

  /* ─── Card Stage — full 6DOF for the EQ card ─── */
  const card = useControls('EQ Card', {
    grab:  { value: false, label: 'grab handles' },
    posX:  { value: 0,    min: -5, max: 5, step: 0.01 },
    posY:  { value: 0.55, min: -3, max: 3, step: 0.01 },
    posZ:  { value: 1.2,  min: -5, max: 5, step: 0.01 },
    rotX:  { value: 0,    min: -Math.PI, max: Math.PI, step: 0.01 },
    rotY:  { value: 0,    min: -Math.PI, max: Math.PI, step: 0.01 },
    rotZ:  { value: 0,    min: -Math.PI, max: Math.PI, step: 0.01 },
    scale: { value: 0.85, min: 0.2, max: 3, step: 0.01 },
  }, { collapsed: true });

  /* ─── Wave Stage — full 6DOF for the particle wave ─── */
  const wave = useControls('Wave', {
    grab:  { value: false, label: 'grab handles' },
    posX:  { value: 0,    min: -5, max: 5, step: 0.01 },
    posY:  { value: -0.9, min: -3, max: 1, step: 0.01 },
    posZ:  { value: 0,    min: -5, max: 5, step: 0.01 },
    rotX:  { value: -0.12, min: -1.5, max: 1.5, step: 0.01, label: 'pitch' },
    rotY:  { value: 0,    min: -Math.PI, max: Math.PI, step: 0.01, label: 'yaw' },
    rotZ:  { value: 0,    min: -Math.PI, max: Math.PI, step: 0.01, label: 'roll' },
    scale: { value: 1.0,  min: 0.2, max: 3, step: 0.01 },
  }, { collapsed: true });

  /* ─── Set (background, helpers) ─── */
  const set = useControls('Set', {
    background:  { value: '#04060a' },
    showHelpers: { value: false, label: 'grid + axes' },
  }, { collapsed: true });

  /* ─── Auto-focus distance (when AF on, mirrors live camera→card distance) ─── */
  const [autoFocusM, setAutoFocusM] = useState(6);
  const effectiveFocusM = cam.autofocus ? autoFocusM : cam.focusM;
  const effectiveFocusNorm = useMemo(() => {
    const FAR = 200, NEAR = 0.1;
    return Math.max(0, Math.min(1, (effectiveFocusM - NEAR) / (FAR - NEAR)));
  }, [effectiveFocusM]);

  /* ─── Mode toggle key bindings ─── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        setDirectorTick({ cardBuild: 0, slidersBuild: 0, moodIdx: 0, waveOpacity: 1.0, textReveal: 0 });
        setMode('play');
        runTimeline();
      }
      if (e.key === 'e' || e.key === 'E') {
        setMode('edit');
        resetTimeline();
      }
      if (e.key === 'r' || e.key === 'R') {
        resetTimeline();
        setTimeout(() => runTimeline({ camera: cameraRef.current }), 50);
      }
      if (e.key === 'h' || e.key === 'H') setShowStats(s => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Leva collapsed={mode === 'play'} hidden={mode === 'play'} />

      {/* Title card — per-letter staggered reveal at end of cinematic.
          Each letter gets its own transition-delay so they cascade in
          with a 0.06s offset — Apple stinger pacing. */}
      <div className={`titlecard ${mode === 'play' && directorTick.textReveal > 0.5 ? 'show' : ''}`}>
        <div className="title">
          {Array.from('Smart Equalizer.').map((ch, i) => (
            ch === ' '
              ? <span key={i} className="ch space" />
              : <span
                  key={i}
                  className="ch"
                  /* Slightly randomized stagger — irregular timing feels
                     more cinematic than perfect metronome cadence */
                  style={{ transitionDelay: `${i * 0.09 + (i % 3) * 0.015}s` }}
                >{ch}</span>
          ))}
        </div>
        <div className="subtitle">Audio that reads how you focus</div>
      </div>

      <div className="hud">
        mode <b>{mode}</b> &nbsp;·&nbsp;
        <kbd>P</kbd> play &nbsp;
        <kbd>E</kbd> edit &nbsp;
        <kbd>R</kbd> replay &nbsp;
        <kbd>S</kbd> log shot &nbsp;
        <kbd>H</kbd> stats
        <br/>
        drag to orbit · scroll to zoom
      </div>

      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: set.background }}
      >
        {/* Scene background as a THREE.Color so DirectorSync can lerp it
            toward the current mood's deep tint. */}
        <color attach="background" args={[set.background]} />

        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          fov={fovDeg}
          near={0.1}
          far={200}
          position={[0, 1.2, 6]}
        />

        <CameraDriver
          fov={fovDeg}
          exposureMul={exposureMul}
          autofocus={mode === 'edit' && cam.autofocus}
          focusTarget={useMemo(() => new THREE.Vector3(card.posX, card.posY, card.posZ), [card.posX, card.posY, card.posZ])}
          onAutoFocus={setAutoFocusM}
        />

        {/* Director takes over in play mode — writes camera/uniforms each frame */}
        <DirectorSync
          enabled={mode === 'play'}
          onTick={setDirectorTick}
        />

        <Suspense fallback={null}>
          <Environment
            preset={post.envPreset}
            background={false}
            environmentIntensity={post.envIntensity}
          />
        </Suspense>

        <ambientLight intensity={0.2} />

        {/* WAVE — full 6DOF */}
        <group
          ref={waveGroupRef}
          position={[wave.posX, wave.posY, wave.posZ]}
          rotation={[wave.rotX, wave.rotY, wave.rotZ]}
          scale={wave.scale}
        >
          <ParticleWave
            color={moodColor}
            travelAmp={moodConfig.amp}
            travelSpeed={moodConfig.speed}
            opacity={mode === 'play' ? directorTick.waveOpacity : 1}
            moodTint={mode === 'play' ? 0.65 : 0.40}
            focalDist={effectiveFocusM}
            aperture={particleAperture}
            eqBands={mode === 'play' ? director.eqBands : EQ_ZERO_STATIC}
          />
        </group>

        {/* CARD — full 6DOF.
            (Halo plane removed — particle bloom now provides the
            atmospheric integration of card into the wave field.) */}
        <group
          ref={cardGroupRef}
          position={[card.posX, card.posY, card.posZ]}
          rotation={[card.rotX, card.rotY, card.rotZ]}
          scale={card.scale}
        >
          <EQCard
            opacity={1}
            moodColor={moodColor}
            thickness={glass.thickness}
            roughness={glass.roughness}
            ior={glass.ior}
            cardBuild={mode === 'play' ? directorTick.cardBuild : 1}
            slidersBuild={mode === 'play' ? directorTick.slidersBuild : 1}
            activeMood={
              mode === 'play'
                ? ({ cruising: 'Cruising', locked: 'Locked In', drift: 'Drifting', restless: 'Restless' })[effectiveMood]
                : 'Cruising'
            }
          />
        </group>

        {/* TRANSFORM GIZMOS — drag the card / wave through 3D space when 'grab' is on */}
        {mode === 'edit' && card.grab && cardGroupRef.current && (
          <TransformControls object={cardGroupRef.current} mode="translate" size={0.7} />
        )}
        {mode === 'edit' && wave.grab && waveGroupRef.current && (
          <TransformControls object={waveGroupRef.current} mode="translate" size={0.7} />
        )}

        {set.showHelpers && mode === 'edit' && (
          <>
            <axesHelper args={[1.5]} />
            <gridHelper args={[10, 10, '#1a1f2e', '#0e1218']} />
          </>
        )}

        {mode === 'edit' && (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            target={[0, 0.5, 0]}
            maxDistance={25}
            minDistance={1.5}
          />
        )}

        <CameraSaver />

        <Cinematic
          enableDOF={true}
          focusDistance={effectiveFocusNorm}
          focalLength={dofFocalLength}
          bokehScale={bokehScale}
          bloom={post.bloom}
          chromaticAberration={0.0003}
          noise={post.grain}
          vignette={post.vignette}
        />

        {showStats && <Stats />}
      </Canvas>
    </>
  );
}
