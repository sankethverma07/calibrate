/* ════════════════════════════════════════════════════════════════════
   EQCard — hybrid 2D/3D card.

   Layers (back → front):
     1. Card body (RoundedBox, frosted physical glass)
     2. Canvas-texture plane on front face — backdrop, labels, slider
        TRACKS, gain readouts, frequency labels, status text. Anything
        flat that doesn't need depth.
     3. 3D meshes raised in front: slider HANDLES (orange pills),
        active mood tab background, Reset + Save buttons.

   Why hybrid: the static UI is sharper and easier to maintain as
   pixels in a canvas, but the interactive elements get real depth so
   you see them stick up when the camera moves around. Side view
   reveals raised handles + button caps like a hardware mixer.

   © 2026 Sanketh Verma · MIT
   ════════════════════════════════════════════════════════════════════ */
import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ─── TextureLabel — text rendered to a small canvas, applied to a plane.
   No font-loading network dependency, always renders. ─── */
function makeLabelTexture(text, options = {}) {
  const {
    fontPx = 64,
    weight = 500,
    color = '#f5f5f4',
    paddingPx = 24,
  } = options;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `${weight} ${fontPx}px "PP Neue Montreal", "Inter", sans-serif`;
  const metrics = measure.measureText(text);
  const w = Math.ceil(metrics.width) + paddingPx * 2;
  const h = fontPx + paddingPx;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.font = `${weight} ${fontPx}px "PP Neue Montreal", "Inter", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, w, h };
}

function TextureLabel({ text, position = [0, 0, 0], worldHeight, color, weight = 500, opacity = 1 }) {
  const { tex, w, h } = useMemo(
    () => makeLabelTexture(text, { color, weight }),
    [text, color, weight]
  );
  const worldW = worldHeight * (w / h);
  return (
    <mesh position={position} renderOrder={2}>
      <planeGeometry args={[worldW, worldHeight]} />
      <meshBasicMaterial
        map={tex}
        transparent
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
        opacity={opacity}
      />
    </mesh>
  );
}

/* ─── Pill geometry — extruded 2D pill so front face is rounded
   while sides stay FLAT (no cylinder-from-side effect). ─── */
function makePillGeometry(width, height, depth, bevelSize = 0.004) {
  const r = height / 2;
  const w = width;
  const h = height;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: Math.min(bevelSize, depth * 0.35),
    bevelThickness: Math.min(bevelSize * 0.8, depth * 0.30),
    bevelSegments: 3,
    curveSegments: 24,
  });
  // ExtrudeGeometry extrudes along +Z starting from z=0. Recenter so the
  // mesh's local origin is at the pill's geometric center.
  geom.translate(0, 0, -depth / 2);
  return geom;
}

/* Pill mesh — same look as Pill3D but flat-sided */
function Pill({ width, height, depth, color, emissive = '#000000',
                emissiveIntensity = 0, metalness = 0.10, roughness = 0.32,
                clearcoat = 0.6, clearcoatRoughness = 0.18, opacity = 1 }) {
  const geom = useMemo(
    () => makePillGeometry(width, height, depth),
    [width, height, depth]
  );
  return (
    <mesh geometry={geom}>
      <meshPhysicalMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

const FREQS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K'];
const DEFAULT_GAINS = [-1.0, 0.0, 1.0, 2.0, 2.0, 1.0, 0.0, -1.0];
const GAIN_MIN = -6;
const GAIN_MAX =  6;

// ── Card geometry ──
const CARD_W = 4.4;
const CARD_H = 2.8;
const CARD_D = 0.10;
const CARD_RADIUS = 0.12;

// ── Canvas texture resolution ──
const TEX_W = 2048;
const TEX_H = 1304;

// ── 3D layout (world units, all in card-local space, +z is "out of card") ──
const FRONT_Z = CARD_D / 2;       // card front face
const TEX_Z   = FRONT_Z + 0.001;  // canvas texture sits on front face
const RAISE_Z = FRONT_Z + 0.025;  // 3D handles/buttons sit proud of texture

// Sliders — must match what the canvas paints
const SLIDERS_AREA_LEFT_PX  = 130;
const SLIDERS_AREA_RIGHT_PX = TEX_W - 130;
const SLIDERS_Y_PX          = 380;
const SLIDERS_H_PX          = 540;

// Convert texture-pixel coords → world coords on the card front face
function px2world(px, py) {
  // Canvas plane is CARD_W*0.985 × CARD_H*0.97
  const planeW = CARD_W * 0.985;
  const planeH = CARD_H * 0.97;
  const x = ((px / TEX_W) - 0.5) * planeW;
  const y = (0.5 - (py / TEX_H)) * planeH;   // y flipped
  return [x, y];
}

// Slider handle dimensions in world units (matches canvas pixels for visual continuity)
const HANDLE_W_WORLD = (110 / TEX_W) * (CARD_W * 0.985);
const HANDLE_H_WORLD = (38  / TEX_H) * (CARD_H * 0.97);
const HANDLE_D_WORLD = 0.045;

const TAB_W_WORLD = 0.78;
const TAB_H_WORLD = 0.30;
const TAB_D_WORLD = 0.030;

const BTN_W_WORLD = 0.85;
const BTN_W_WIDE  = 1.05;
const BTN_H_WORLD = 0.34;
const BTN_D_WORLD = 0.040;

// Palette
const ACCENT_HEX = '#fb923c';
const TEXT_HEX   = '#f5f5f4';
const SUBTLE_HEX = '#9ca3af';

/* ─── 2D backdrop drawing (text + tracks only — no handles or buttons) ─── */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Tab layout — measured ONCE on a shared offscreen canvas so the 3D pill
// can use the SAME pixel positions the backdrop uses. No estimation.
const TABS = ['Cruising', 'Locked In', 'Drifting', 'Restless'];
let _tabLayoutCache = null;
function getTabLayout() {
  if (_tabLayoutCache) return _tabLayoutCache;
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  mctx.font = '500 30px "PP Neue Montreal", "Inter", sans-serif';
  const layout = {};
  let tabRight = TEX_W - 110;
  for (let i = TABS.length - 1; i >= 0; i--) {
    const label = TABS[i];
    const labelW = mctx.measureText(label).width + 60;
    const tabLeft = tabRight - labelW;
    layout[label] = { leftPx: tabLeft, widthPx: labelW, centerPx: tabLeft + labelW / 2 };
    tabRight = tabLeft - 14;
  }
  _tabLayoutCache = layout;
  return layout;
}

function drawBackdrop(ctx, { gains, activeMood }) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // CUSTOM EQ label
  ctx.font = '600 44px "PP Neue Montreal", "Inter", sans-serif';
  ctx.fillStyle = ACCENT_HEX;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CUSTOM   EQ', 110, 100);

  // Mood tab labels — INACTIVE only (active tab is fully 3D: pill + text)
  const layout = getTabLayout();
  ctx.font = '500 30px "PP Neue Montreal", "Inter", sans-serif';
  ctx.textAlign = 'center';
  for (const label of TABS) {
    if (label === activeMood) continue;        // skip — 3D pill paints it
    ctx.fillStyle = SUBTLE_HEX;
    ctx.fillText(label, layout[label].centerPx, 100);
  }

  // Preset title
  ctx.textAlign = 'left';
  ctx.font = '300 78px "PP Neue Montreal", "Inter", sans-serif';
  ctx.fillStyle = TEXT_HEX;
  ctx.fillText(`${activeMood} preset`, 110, 220);

  // Subtitle
  ctx.font = '400 28px "PP Neue Montreal", "Inter", sans-serif';
  ctx.fillStyle = SUBTLE_HEX;
  ctx.fillText('Adjust the 8 bands below. Changes save automatically.', 110, 290);

  // Slider tracks are now 3D meshes (SliderTrack component) tied to
  // per-slider alpha, not baked into this canvas. Just paint the
  // numeric labels (gain readout above, freq label below) so they
  // appear with the card backdrop.
  const slidersAreaW = SLIDERS_AREA_RIGHT_PX - SLIDERS_AREA_LEFT_PX;
  const sliderPitch = slidersAreaW / 8;

  for (let i = 0; i < 8; i++) {
    const cx = SLIDERS_AREA_LEFT_PX + sliderPitch * (i + 0.5);
    const gain = gains[i];

    // Gain readout above
    ctx.font = '500 32px "PP Neue Montreal", "Inter", sans-serif';
    ctx.fillStyle = TEXT_HEX;
    ctx.textAlign = 'center';
    ctx.fillText(gain >= 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1), cx, SLIDERS_Y_PX - 28);

    // Frequency label below
    ctx.font = '400 24px "PP Neue Montreal", "Inter", sans-serif';
    ctx.fillStyle = SUBTLE_HEX;
    ctx.fillText(FREQS[i], cx, SLIDERS_Y_PX + SLIDERS_H_PX + 50);
  }

  // Bottom status text (left)
  const bottomY = TEX_H - 110;
  ctx.font = '500 22px "PP Neue Montreal", "Inter", sans-serif';
  ctx.fillStyle = SUBTLE_HEX;
  ctx.textAlign = 'left';
  ctx.fillText('SHOWING EVIDENCE-BASED DEFAULT', 110, bottomY);

  // Subtle separator line above bottom row
  ctx.strokeStyle = 'rgba(156, 163, 175, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(110, bottomY - 60);
  ctx.lineTo(TEX_W - 110, bottomY - 60);
  ctx.stroke();
}

/* ─── Slider handle positions (world coords) ─── */
function getHandleWorld(index, gain) {
  const slidersAreaW = SLIDERS_AREA_RIGHT_PX - SLIDERS_AREA_LEFT_PX;
  const sliderPitch = slidersAreaW / 8;
  const cxPx = SLIDERS_AREA_LEFT_PX + sliderPitch * (index + 0.5);
  const norm = (gain - GAIN_MIN) / (GAIN_MAX - GAIN_MIN);
  const handleYPx = SLIDERS_Y_PX + SLIDERS_H_PX * (1 - norm);
  return px2world(cxPx, handleYPx);
}

/* ─── 3D pill helper ─── */
function Pill3D({ position, args, radius, color, emissive = '#000000', emissiveIntensity = 0, metalness = 0.15, roughness = 0.32, children }) {
  return (
    <group position={position}>
      <RoundedBox args={args} radius={radius} smoothness={4}>
        <meshPhysicalMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          clearcoat={0.6}
          clearcoatRoughness={0.18}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </RoundedBox>
      {children}
    </group>
  );
}

/* ─── Active mood tab pill ─── */
function ActiveMoodTab({ activeMood, opacity = 1 }) {
  // Use the SHARED layout cache (same pixel math as the canvas backdrop)
  const layout = getTabLayout();
  const entry = layout[activeMood];
  const [tx, ty] = px2world(entry.centerPx, 100);
  const tabW = (entry.widthPx / TEX_W) * (CARD_W * 0.985);

  return (
    <group position={[tx, ty, RAISE_Z]} scale={opacity > 0 ? 1 : 0}>
      <Pill
        width={tabW}
        height={TAB_H_WORLD}
        depth={TAB_D_WORLD}
        color="#262b34"
        metalness={0.10}
        roughness={0.35}
        opacity={opacity}
      />
      <TextureLabel
        text={activeMood}
        position={[0, 0, TAB_D_WORLD / 2 + 0.002]}
        worldHeight={TAB_H_WORLD * 0.55}
        color={TEXT_HEX}
        weight={500}
        opacity={opacity}
      />
    </group>
  );
}

/* ─── Slider track — visible when handle is visible (independent of cardBuild) ─── */
const TRACK_W_WORLD = (60 / TEX_W) * (CARD_W * 0.985);          // matches canvas track
const TRACK_H_WORLD = (SLIDERS_H_PX / TEX_H) * (CARD_H * 0.97);

function SliderTrack({ index, opacity = 1 }) {
  // Track centered on slider X, mid-Y of the slider area
  const slidersAreaW = SLIDERS_AREA_RIGHT_PX - SLIDERS_AREA_LEFT_PX;
  const sliderPitch = slidersAreaW / 8;
  const cxPx = SLIDERS_AREA_LEFT_PX + sliderPitch * (index + 0.5);
  const cyPx = SLIDERS_Y_PX + SLIDERS_H_PX / 2;
  const [x, y] = px2world(cxPx, cyPx);
  return (
    <group position={[x, y, RAISE_Z - 0.02]}>
      {/* Recessed dark capsule track */}
      <Pill
        width={TRACK_W_WORLD}
        height={TRACK_H_WORLD}
        depth={0.018}
        color="#15181d"
        metalness={0.10}
        roughness={0.55}
        clearcoat={0.20}
        opacity={0.92 * opacity}
      />
      {/* White center indicator (0 dB midline) */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[TRACK_W_WORLD * 0.78, 0.004]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.45 * opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ─── Slider handle — flat-sided extruded pill ─── */
function SliderHandle({ index, gain, opacity = 1 }) {
  const [x, y] = getHandleWorld(index, gain);
  const scale = 0.7 + opacity * 0.3;
  return (
    <group position={[x, y, RAISE_Z]} scale={scale}>
      <Pill
        width={HANDLE_W_WORLD}
        height={HANDLE_H_WORLD}
        depth={HANDLE_D_WORLD}
        color={ACCENT_HEX}
        metalness={0.10}
        roughness={0.30}
        clearcoat={0.85}
        clearcoatRoughness={0.10}
        emissive={ACCENT_HEX}
        emissiveIntensity={0.25 * opacity}
        opacity={opacity}
      />
      <mesh position={[0, HANDLE_H_WORLD * 0.18, HANDLE_D_WORLD / 2 + 0.001]}>
        <planeGeometry args={[HANDLE_W_WORLD * 0.82, HANDLE_H_WORLD * 0.18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.22 * opacity} />
      </mesh>
    </group>
  );
}

/* ─── Bottom button — flat-sided extruded pill ─── */
function Button3D({ position, label, primary = false, width = BTN_W_WORLD, opacity = 1 }) {
  return (
    <group position={position}>
      <Pill
        width={width}
        height={BTN_H_WORLD}
        depth={BTN_D_WORLD}
        color={primary ? '#1c2128' : '#0f1318'}
        metalness={0.20}
        roughness={0.32}
        clearcoat={0.70}
        clearcoatRoughness={0.18}
        opacity={opacity}
      />
      <TextureLabel
        text={label}
        position={[0, 0, BTN_D_WORLD / 2 + 0.002]}
        worldHeight={BTN_H_WORLD * 0.45}
        color={TEXT_HEX}
        weight={500}
        opacity={opacity}
      />
    </group>
  );
}

/* Smooth 0-1 ease */
function smooth(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/* ─── EQCard ─── */
export default function EQCard({
  opacity = 1,
  roughness = 0.25,
  // Build animation — 0=hidden, 1=fully formed
  cardBuild = 1,     // glass body + labels + buttons + active tab + tracks
  slidersBuild = 1,  // 0..1 staggers handle appearance across the 8 sliders
  // unused — kept for prop compat
  thickness, ior, moodColor, distortion,
  gains = DEFAULT_GAINS,
  activeMood = 'Cruising',
}) {
  if (opacity <= 0 && cardBuild <= 0 && slidersBuild <= 0) return null;

  // Card body / canvas backdrop / buttons / active tab all share cardBuild
  const cardAlpha = smooth(cardBuild);
  // Individual slider reveal — each handle appears as slidersBuild crosses i/8
  const handleAlphaFor = (i) => {
    // From slot 0.. slot 7, each takes ~0.16 width to fade in
    const start = (i / 8) * 0.85;
    const end = start + 0.18;
    return smooth((slidersBuild - start) / (end - start));
  };

  // Canvas texture for backdrop
  const uiTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    drawBackdrop(ctx, { gains, activeMood });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [gains, activeMood]);

  // Bottom button positions — Save & apply LEFT, Reset RIGHT (swapped)
  const bottomY = -CARD_H / 2 + 0.30;
  const resetCX = CARD_W / 2 - 0.15 - BTN_W_WORLD / 2;
  const saveCX  = resetCX - BTN_W_WORLD / 2 - 0.18 - BTN_W_WIDE / 2;

  return (
    <group>
      {/* Card body — NO chrome / clearcoat. Translucent dark glass that
          lets the wave read through, matching the app's backdrop-filter
          look. Higher roughness kills environment reflections. */}
      {cardAlpha > 0.01 && (
        <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={CARD_RADIUS} smoothness={5}>
          <meshPhysicalMaterial
            color="#0a0d12"
            roughness={0.85}
            metalness={0.0}
            clearcoat={0}
            transparent
            opacity={0.72 * opacity * cardAlpha}
            envMapIntensity={0}
          />
        </RoundedBox>
      )}

      {/* Canvas-texture backdrop on front face — fades in with cardBuild */}
      {cardAlpha > 0.01 && (
        <mesh position={[0, 0, TEX_Z]}>
          <planeGeometry args={[CARD_W * 0.985, CARD_H * 0.97]} />
          <meshBasicMaterial map={uiTexture} transparent toneMapped={false} opacity={cardAlpha} />
        </mesh>
      )}

      {/* 3D active mood tab pill — fades in with cardBuild */}
      {cardAlpha > 0.05 && <ActiveMoodTab activeMood={activeMood} opacity={cardAlpha} />}

      {/* 3D slider tracks + handles — tied to slidersBuild, NOT cardBuild.
          This means during the slider-reveal shot, handles appear WITH
          their tracks underneath (no more floating-handle look). */}
      {gains.map((g, i) => {
        const a = handleAlphaFor(i);
        if (a <= 0.01) return null;
        return (
          <React.Fragment key={`s-${i}`}>
            <SliderTrack index={i} opacity={a} />
            <SliderHandle index={i} gain={g} opacity={a} />
          </React.Fragment>
        );
      })}

      {/* 3D buttons — fade in with cardBuild */}
      {cardAlpha > 0.05 && (<>
      <Button3D
        position={[resetCX, bottomY, RAISE_Z]}
        label="Reset"
        width={BTN_W_WORLD}
        opacity={cardAlpha}
      />
      <Button3D
        position={[saveCX, bottomY, RAISE_Z]}
        label="Save & apply"
        primary
        width={BTN_W_WIDE}
        opacity={cardAlpha}
      />
      </>)}
    </group>
  );
}
