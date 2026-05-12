import { useEffect, useRef } from 'react';
import { VibeInputs, MOOD_CONFIGS, MoodType, OrganismConfig } from '../lib/moodEngine';

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number; life: number; maxLife: number; seed: number;
}

interface Props { mood: MoodType; vibes: VibeInputs; }

export default function LivingOrganism({ mood, vibes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const cfgRef = useRef<OrganismConfig>({ ...MOOD_CONFIGS[mood] });
  const tgtRef = useRef<OrganismConfig>({ ...MOOD_CONFIGS[mood] });
  const vibesRef = useRef(vibes);

  useEffect(() => { tgtRef.current = { ...MOOD_CONFIGS[mood] }; }, [mood]);
  useEffect(() => { vibesRef.current = vibes; }, [vibes]);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const N = 2200;
    let W = 0, H = 0, cx = 0, cy = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const p = canvas.parentElement!;
      W = p.clientWidth; H = p.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    const ps = particlesRef.current;
    if (ps.length === 0) {
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 0.45;
        ps.push({
          x: Math.cos(a) * r, y: Math.sin(a) * r, z: Math.random(),
          vx: (Math.random() - 0.5) * 0.002, vy: (Math.random() - 0.5) * 0.002, vz: (Math.random() - 0.5) * 0.0008,
          size: 0.4 + Math.random() * 1.6, life: Math.random() * 300,
          maxLife: 200 + Math.random() * 500, seed: Math.random(),
        });
      }
    }

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const v = vibesRef.current;

      // Smooth config
      const c = cfgRef.current, tg = tgtRef.current, s = 0.04;
      for (const k of Object.keys(tg) as (keyof OrganismConfig)[]) {
        (c as any)[k] = lerp(c[k] as number, tg[k] as number, s);
      }

      // Live overrides
      const lCoh = lerp(c.cohesion, 0.05, v.tension * 0.8);
      const lSpd = lerp(c.speed, 1.2, v.tension * 0.4);
      const lTurb = lerp(c.turbulence, 0.75, v.tension);
      const lOrb = lerp(c.orbitalStrength, 0.00001, v.tension * 0.9);
      const lWarm = Math.min(1, c.warmth + v.tension * 0.6);

      // Breathing
      const breath = Math.sin(t * c.pulseRate) * 0.5 + 0.5;

      // Color
      const hBase = lWarm > 0.5 ? lerp(lerp(c.hueA, c.hueB, 0.5), 25, (lWarm - 0.5) * 2) : lerp(c.hueA, c.hueB, lWarm * 0.5);
      const sSat = lerp(c.saturation, 58, lWarm);

      // Clear with trails
      const bgH = lerp((c.hueA + c.hueB) / 2, 22, lWarm * 0.3);
      ctx.fillStyle = `hsla(${bgH}, ${5 + lWarm * 8}%, 3%, ${1 - c.trailAlpha})`;
      ctx.fillRect(0, 0, W, H);

      // Core glow
      const coreR = Math.min(W, H) * (0.12 + c.density * 0.22 + breath * 0.04);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      const cA = 0.04 + v.focus * 0.05 + breath * 0.02;
      cg.addColorStop(0, `hsla(${hBase}, ${sSat + 10}%, ${15 + c.brightness * 0.15}%, ${cA})`);
      cg.addColorStop(0.5, `hsla(${hBase}, ${sSat}%, 8%, ${cA * 0.3})`);
      cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);

      // Sort by z
      ps.sort((a, b) => a.z - b.z);
      const scale = Math.min(W, H) * 0.44;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.life++;

        const dx = -p.x, dy = -p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

        // Attraction
        p.vx += (dx / dist) * lCoh * 0.0009;
        p.vy += (dy / dist) * lCoh * 0.0009;

        // Repulsion
        if (dist < c.repelRadius) {
          const rep = 0.001 / (dist * dist + 0.001);
          p.vx -= (dx / dist) * rep;
          p.vy -= (dy / dist) * rep;
        }

        // Orbital
        p.vx += -dy * lOrb;
        p.vy += dx * lOrb;

        // Turbulence (seeded per particle for stable chaos)
        p.vx += (Math.sin(t * 3.3 + p.seed * 100 + p.y * 7) * 2 - 1) * lTurb * 0.0012;
        p.vy += (Math.cos(t * 2.9 + p.seed * 80 + p.x * 8) * 2 - 1) * lTurb * 0.0012;
        p.vz += Math.sin(t * 0.4 + p.seed * 50) * 0.00004;

        // Damping
        const damp = 0.985 - lSpd * 0.007;
        p.vx *= damp; p.vy *= damp; p.vz *= 0.992;

        p.x += p.vx * (1 + lSpd);
        p.y += p.vy * (1 + lSpd);
        p.z += p.vz;
        if (p.z < 0) p.z = 1; if (p.z > 1) p.z = 0;

        // Respawn
        if (dist > 1.4 || p.life > p.maxLife) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.02 + Math.random() * 0.2 * (1 - lCoh);
          p.x = Math.cos(a) * r; p.y = Math.sin(a) * r;
          p.z = Math.random();
          p.vx = (Math.random() - 0.5) * 0.003;
          p.vy = (Math.random() - 0.5) * 0.003;
          p.life = 0; p.maxLife = 180 + Math.random() * 450;
        }

        // === RENDER with strong DoF contrast ===
        const sx = cx + p.x * scale;
        const sy = cy + p.y * scale;

        const focusCenter = 0.5;
        const focusW = 0.1 + lCoh * 0.06;
        const zDist = Math.abs(p.z - focusCenter);
        const inFocus = Math.max(0, 1 - zDist / focusW);

        // DoF: in-focus = tiny bright sharp. Out-of-focus = large dim soft bokeh
        const bokehScale = 1 + (1 - inFocus) * 5;
        const drawSz = (p.size + breath * 0.2) * bokehScale * (0.3 + p.z * 0.7);

        // Life alpha
        const lifeA = p.life < 25 ? p.life / 25 : (p.life > p.maxLife - 35 ? (p.maxLife - p.life) / 35 : 1);

        // DRAMATIC brightness difference: in-focus = bright, out-of-focus = very dim
        const focusBright = inFocus * c.focusBrightness;
        const dimFactor = lerp(c.bokehDimming, 1.0, inFocus);
        const alpha = lifeA * dimFactor * (0.1 + focusBright * 0.8);

        if (alpha < 0.01) continue; // skip invisible

        const pH = hBase + (p.seed - 0.5) * 22 + Math.sin(p.z * 8) * 6;
        const pS = Math.min(100, sSat + 12 + inFocus * 18);
        const pL = 30 + inFocus * 40 + p.seed * 14;

        if (drawSz < 1 && inFocus < 0.2) {
          // Distant pixel
          ctx.fillStyle = `hsla(${pH}, ${pS * 0.4}%, ${pL * 0.5}%, ${alpha * 0.35})`;
          ctx.fillRect(sx, sy, 1, 1);
        } else if (inFocus > 0.6) {
          // IN-FOCUS: bright sharp core with tight glow
          const gr = drawSz * 2;
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
          grd.addColorStop(0, `hsla(${pH}, ${Math.min(100,pS + 15)}%, ${Math.min(98,pL + 30)}%, ${Math.min(1,alpha * 1.1)})`);
          grd.addColorStop(0.15, `hsla(${pH}, ${pS + 8}%, ${pL + 18}%, ${alpha * 0.6})`);
          grd.addColorStop(0.5, `hsla(${pH}, ${pS}%, ${pL}%, ${alpha * 0.15})`);
          grd.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.fillStyle = grd;
          ctx.arc(sx, sy, gr, 0, Math.PI * 2); ctx.fill();
          // Hard bright core
          ctx.beginPath();
          ctx.fillStyle = `hsla(${pH}, ${Math.min(100,pS + 20)}%, ${Math.min(98, pL + 38)}%, ${Math.min(1,alpha * 1.05)})`;
          ctx.arc(sx, sy, drawSz * 0.3, 0, Math.PI * 2); ctx.fill();
        } else {
          // OUT-OF-FOCUS: large soft dim bokeh disc
          const gr = drawSz * 2.8;
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
          grd.addColorStop(0, `hsla(${pH}, ${pS * 0.8}%, ${pL * 0.65}%, ${alpha * 0.4})`);
          grd.addColorStop(0.4, `hsla(${pH}, ${pS * 0.6}%, ${pL * 0.45}%, ${alpha * 0.12})`);
          grd.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.fillStyle = grd;
          ctx.arc(sx, sy, gr, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Bloom
      const bR = Math.min(W, H) * 0.14;
      const bl = ctx.createRadialGradient(cx, cy, 0, cx, cy, bR);
      bl.addColorStop(0, `hsla(${hBase}, ${Math.min(100,sSat + 18)}%, 72%, ${0.03 + breath * 0.02})`);
      bl.addColorStop(1, 'transparent');
      ctx.fillStyle = bl; ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" data-testid="organism-canvas" />;
}
