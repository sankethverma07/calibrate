# Calibrate · Smart Equalizer Hero Film
## Gemini Veo / Sora / Runway prompt — full 28-second product video

---

## Product context (for the AI's understanding)

**Calibrate** is a desktop biofeedback equalizer. It silently reads your typing
rhythm and mouse precision, infers your current focus state ("mood"), and
re-tunes the operating system's audio EQ to match. Four moods:

- **Cruising** — calm focus · teal `#2dd4bf`
- **Locked In** — deep focus · blue `#60a5fa`
- **Drifting** — distracted · magenta `#c084fc`
- **Restless** — agitated · orange `#fb923c`

The film's central visual metaphor: **a 3D ocean of glowing photonic dust**
where each particle is a tiny light. The wave IS the equalizer — it responds
to slider changes and mood shifts. A frosted glass control card with eight EQ
sliders (bands at 60 / 170 / 310 / 600 / 1K / 3K / 6K / 12K Hz) floats above
the ocean. Bringing the slider up makes that band's section of the ocean
bloom higher.

---

## Visual style (consistent across all shots)

### Aesthetic
Macro-photography quality. Razor-sharp focal plane with creamy hexagonal bokeh.
Premium product aesthetic — Apple Vision Pro reveal + Samsung Galaxy Unpacked
films are the reference. Apple-level restraint, no music-video maximalism.

### Cinematography
- 50mm normal lens character on wide shots, 85mm on close-ups
- Cinema-prime lens behavior (Cooke S4/i, ARRI Master Primes)
- 6-blade aperture → hexagonal bokeh
- Subtle film grain (6%), 40% corner vignette
- ACES filmic tone mapping
- True 0 IRE black with faint mood-color radial gradient

### Particle rendering
Each particle is a tiny photonic point with:
- **In focus:** cool-white core (RGB ~ 0.94, 0.97, 1.02), warm-ish halation,
  tiny 4-point diffraction spike, sub-pixel hot center
- **Defocused (bokeh):** hexagonal disc shape with bright "soap bubble" rim
  (spherical aberration character), Kelvin temperature variance (4000K-7000K
  spread across the field, NOT uniform white), slight LoCA chromatic fringing
  (red shifted outward, cyan inward at the disc edge)
- HDR intensities (sharp cores peak > 1.0 to feed bloom naturally)
- Log-normal brightness distribution: most particles dim, rare bright outliers
  drive the glow signature

### NO chrome
The glass card is FROSTED translucent dark glass — NO mirror reflections, NO
clearcoat varnish, NO environment-map shine. Matches Apple's visionOS Liquid
Glass aesthetic, not a polished metal panel.

### Background mood tint
Scene background lerps to a deep, near-black version of the current mood color:
- Cruising → `#02060a` (near-black with slight teal undertone)
- Locked In → `#020610` (near-black with slight blue)
- Drifting → `#070310` (near-black with slight magenta)
- Restless → `#0a0602` (near-black with slight warm orange)

### Camera movement language
Apple/Samsung restraint. Slow dollies, motion-control smoothness. RACK FOCUS
moves (focal plane sweeps through depth) wherever possible instead of panning.
Cuts on motion settles, never mid-motion. One smash cut (Shot 5).

---

## SHOT BREAKDOWN — 28 seconds, 10 shots

### Shot 1 · 0:00 – 0:03.5 · "Inside the ocean"
Locked-off camera, slightly above the horizontal wave surface looking down at
~12° pitch. 50mm equivalent lens, f/2 character. Wave of glowing teal-white
photonic dust fills the lower 2/3 of frame, centered horizontally.

Focal plane DEEP in the field (~8m). Background particles razor sharp.
Foreground a creamy hexagonal bokeh wall — soft circular discs with bright
soap-bubble rims and slight chromatic fringing.

Mood: Cruising teal `#2dd4bf`. Particles read as cool teal-white with
Kelvin temperature variance — some warmer (4000K), some cooler (7000K).
Wave drifts on a multi-directional sine wave field, amplitude small (0.3),
slow gentle motion. Subtle horizontal drift across the frame.

Pitch-black background with faint teal radial gradient at the center.

---

### Shot 2 · 0:03.5 – 0:07 · "Focus pulls forward"
SAME SHOT. Camera holds position. ABSOLUTELY NO PANNING.

Smooth focus rack from 8m → 4m over 3.5 seconds. The focal plane sweeps
THROUGH the wave — background particles defocus into creamy hexagonal bokeh
while midground particles crystallize into razor-sharp pinpricks. The viewer's
eye follows the moving focal plane.

Mood color seamlessly lerps from Cruising teal toward Locked In blue
(`#60a5fa`) across the shot, τ ≈ 2.5s. Wave amplitude swells slightly to 0.55
as the mood shifts.

---

### Shot 3 · 0:07 – 0:10 · "Lands in the foreground"
Camera lifts 10cm for subtle parallax depth.

Focus continues rack 4m → 2m. Near particles in the foreground crystallize
into pixel-precise pinpoint stars with tiny visible 4-point diffraction spikes.
Everything beyond is creamy hexagonal bokeh — large soft discs filling the
upper 60% of the frame. This is the macro-shot money frame.

Mood: Locked In blue `#60a5fa` fully settled. Background warms slightly to
`#020610`.

---

### Shot 4 · 0:10 – 0:12.5 · "Sliders rise from the wave"
Camera dolly back smoothly and lift to 1.2m height. Focus settles at ~5m.

Eight orange pill-shaped slider handles materialize ONE BY ONE from the wave
surface, staggered 0.15s apart, with a thin dark recessed track capsule
appearing underneath each. Frequency labels (60, 170, 310, 600, 1K, 3K, 6K,
12K) fade in below each track in muted gray small caps.

Mood: Locked In blue. Wave continues below in soft bokeh.

---

### Shot 5 · 0:12.5 – 0:15.5 · "One slider drives the ocean" [SLOW MOTION]
SMASH CUT to extreme close-up. Camera at (-0.4m, 0.65m) looking at the 1K Hz
slider (center-right of the row). 85mm equivalent lens. Slider fills the left
half of frame.

Focus razor sharp on the slider handle. Wave dust behind dissolves to 15%
opacity to remove distraction.

ACTION: The orange handle smoothly rises from center (0 dB) to +3 dB position
over 2.5 seconds with slow-motion physics — exaggerated easing, longer than
real time. As it rises, the wave's amplitude in the corresponding frequency
band visibly BLOOMS — particles in the right half of frame rise higher,
creating a bright crest exactly under the 1K band.

Mood tint shifts subtly to Drifting magenta `#c084fc` during the gesture, as
if the user moving the slider also nudged their focus state. The mood color
casts a faint magenta tint on the metallic handle surface.

Backlight halo behind the slider handle. The card's frosted body is barely
visible in the background, very low opacity.

---

### Shot 6 · 0:15.5 – 0:17.5 · "All bands aligned"
Camera pulls back to a medium shot showing all 8 orange slider handles + their
recessed dark tracks + frequency labels. Sliders crisp; wave behind at moderate
bokeh.

Mood color holds Drifting magenta briefly, then begins crossfade back toward
Locked In blue (the system "resolves").

---

### Shot 7 · 0:17.5 – 0:20.5 · "Glass card forms"
Camera continues smooth dolly back to (0, 1.15m, 6.5m).

A frosted glass card materializes AROUND the sliders — dark translucent body
(opacity 0.72), heavy frost (NO chrome, NO mirror reflections). Inside the
card:
- "CUSTOM EQ" label in orange `#fb923c`, top-left
- "Locked In preset" title in white, large weight 300 serif-adjacent
- "Adjust the 8 bands below. Changes save automatically." subtitle in muted gray
- Four mood pill tabs at top right: Cruising / Locked In / Drifting / Restless,
  with Locked In highlighted via a dark pill behind it
- All 8 sliders + tracks remain visible through the now-formed card
- "SHOWING EVIDENCE-BASED DEFAULT" footer text bottom-left in tracked small caps
- Two pill buttons bottom-right: "Save & apply" (primary, slightly lighter)
  and "Reset" (secondary)

Card body fades in via opacity ramp over 2.5 seconds. Wave behind reads through
the frosted glass at low opacity, mood-tinted.

Mood: Locked In blue settled.

---

### Shot 8 · 0:20.5 – 0:22.5 · "Subtle orbit"
Slow lateral orbit ~30° around the glass card. Frosted-glass refraction
becomes visible from the new angle — the card's translucent depth shows.

Wave particles behind create a soft Locked-In-blue halo that catches and
diffuses through the glass. Sliders and UI elements remain readable.

---

### Shot 9 · 0:22.5 – 0:24.5 · "Held hero"
Camera locks back to front view, slightly higher and farther (0, 1.2m, 7m).
Glass card centered at rule-of-thirds — slightly above frame center, occupying
the upper third. Wave fills the lower half of frame, breathing slowly
(amplitude oscillation cycle ~3 seconds).

ACTION: A single bright specular highlight slowly travels across the card's
top bevel, left to right over the 2 seconds. Subtle micro-camera-shake
(<0.5px) for organic feel.

---

### Shot 10 · 0:24.5 – 0:28 · "Smart Equalizer."
Glass card and wave both fade to black over 0.8 seconds.

The text "Smart Equalizer." materializes letter by letter in 3D world space,
large (filling ~60% of frame width). Each letter animates from:

- **Start state:** `translateY(80px)` + `rotateY(-90deg)` + `rotateZ(-8deg)` +
  `scale(0.45)` + `opacity 0`
- **End state:** identity transform + opacity 1
- **Duration:** 1.4s per letter
- **Easing:** `cubic-bezier(0.34, 1.32, 0.55, 1)` — slight overshoot bounce
- **Stagger:** 0.09s between letters with ±15ms irregularity
- **Color:** light off-white `#f5f5f4`
- **Halo:** cool-blue radial glow behind, 200px radius, 22% intensity

Subtitle "AUDIO THAT READS HOW YOU FOCUS" in tracked small caps, letter-spacing
0.42em, weight 400, gray-white. Fades in 1.6s after first letter lands with
1.2s opacity+translateY animation.

Total reveal lands by ~3 seconds in. Hold the composition 0.5s.

Background: pure black with faint radial Locked-In-blue glow at the center, 5%
intensity. NO particles in frame during the title.

Typography: PP Neue Montreal or similar geometric humanist sans-serif, weight 200,
letter-spacing -0.025em on the main title.

---

## What NOT to do

- NO lens flare horizontal anamorphic streaks
- NO chrome reflections on the glass card
- NO crushed-black banding (preserve smooth gradients, add 1% film grain)
- NO hard drop shadows under floating objects
- NO oversaturated accent colors (mood saturation max ~50%)
- NO whip-pans or hand-held shake (motion-control smooth always)
- NO music-video maximalism (Apple restraint at all times)
- NO synced cuts on motion peaks — cut on settles or luma matches
- NO mid-shot panning the camera unnaturally — prefer rack focus

---

## Reference films

- Apple Vision Pro reveal (parallax floating UI panels in void)
- Apple HomePod "Welcome Home" by Spike Jonze (environment responds to product)
- Apple AirPods Pro 2 launch film (single-glint chamfer rotation)
- Samsung Galaxy Z Fold 7 reveal (Bolt-arm precision orbits on infinite-void
  cyclorama, complementary color washes)
- Samsung Galaxy S25 Ultra (exploded-materialize sequence)
- Apple iPhone 16 Pro launch film (macro-into-lens push + radial explosion)
- Macro photography of dewdrops, flowers (one subject razor-sharp, rest creamy
  bokeh)

---

© 2026 Sanketh Verma — Calibrate hero film prompt
