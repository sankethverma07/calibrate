# CALIBRATE — Profile Card "Snap Into Monitor"
## 2-second cinematic UI animation · Kling prompt

> Use the attached image as the literal final frame after the card has
> seated into the monitor. Animate the Profile card floating tilted in
> mid-air, with its counters and bars filling in, then snap it cleanly
> into a real monitor displaying the Calibrate UI. **No special effects,
> no particles, no bloom, no glow trails.** Pure clean product motion —
> floating card, count-up animation, snap-to-monitor.

---

## THE SCENE

A bright, clean **all-white studio environment** — soft volumetric white
backdrop, like an Apple product photo set. No texture, no grid lines. Just
a smooth seamless white space with very soft ambient light and gentle floor
falloff.

Centered in the lower half of frame sits a **slim white modern monitor** —
thin bezel, matte aluminum stand, screen-on but currently showing the
Calibrate UI **with the Profile section's central card slot EMPTY**: the
"CALIBRATE" wordmark top-left, Auto sense + EQ ON toggles top-right, the
section legend on the right ("01 MOOD · 02 SCHEDULE · 03 NOW PLAYING · 04
PROFILE highlighted · 05 CUSTOM EQ · 06 PLAYGROUND"), the Stats for nerds
button, the bottom-right pills (Click feedback · LOCAL · PRIVATE · APO:
CONNECTED), and the faint photonic-dust texture in the background — all
visible on screen, but the centered Profile card itself is missing, leaving
a dark transparent placeholder rectangle where it will land.

Floating above and slightly in front of the monitor, in mid-air, is the
**Profile card** — the same card shown in the final frame, but tilted in
3D space, hovering as a free-floating UI panel.

---

## THE CARD (final state, as shown in the image)

Floating Profile card with:

- Tracked-small-caps label **"PROFILE"** top-left.
- Headline **"46% focused this week"**.
- Subtitle: *You're on a 2-minute focus streak. Longest ever: 78 min.*
- Top-right pill **"2 MIN STREAK"** with a small orange dot.
- Four metric tiles: **FOCUS TODAY 3h 20m** · **FOCUS THIS WEEK 5h 25m** ·
  **LONGEST STREAK 1h 18m** · **RECOVERIES 0**.
- **MOOD SPLIT · LAST 7 DAYS** horizontal bar split into four colored
  segments: Cruising teal **18 %** · Locked In blue **28 %** · Drifting
  magenta **51 %** · Restless orange **2 %**. Legend row beneath with
  matching colored dots and labels.
- **ACHIEVEMENTS** 4 × 2 grid (Day one · First focus · Deep work · Marathon ·
  Recovery · Steady three faded · Flow hour · Week on faded). Tiles are
  static — they do not animate.

Brand colors: teal `#2dd4bf`, blue `#60a5fa`, magenta `#c084fc`, orange
`#fb923c`. Card body is the deep midnight glass surface from the screenshot.

---

## THE 2-SECOND SEQUENCE

### 0.00 – 0.20 s · Establish
Open on the card hovering in the white studio above the monitor.

- Card is tilted **~22° on the Y-axis** (rotated toward the right) and
  **~10° on the X-axis** (tipped slightly forward, top edge nearer camera),
  floating maybe 30 cm in front of the monitor screen at the height of the
  monitor's vertical center.
- Camera is positioned slightly low and right, at about 50mm equivalent
  lens, framing both the card (filling ~55 % of frame) and the monitor
  partially visible behind/below.
- The card's content is at **zero state**: headline reads "0% focused this
  week", streak pill reads "0 MIN STREAK", subtitle inline numbers read 0
  and 0, all four metric tiles read 0h 00m / 0, the mood split bar is empty
  (thin dark unfilled track at ~15 % opacity), legend percentages all read
  0 %. Achievement tiles are already in their final state.

### 0.20 – 1.40 s · Counters tick + bars grow + camera eases in
**All numeric and bar animations run simultaneously and finish together at
1.40 s.** Smooth ease-out cubic. Integer digits snap at the frame — no
motion blur on numerals.

- Headline 0 % → **46 %**.
- Streak pill 0 → **2**.
- Subtitle streak 0 → **2**, longest 0 → **78**.
- FOCUS TODAY 0h 00m → **3h 20m**.
- FOCUS THIS WEEK 0h 00m → **5h 25m**.
- LONGEST STREAK 0h 00m → **1h 18m**.
- RECOVERIES holds at 0.
- Mood split bar: four colored segments grow left → right simultaneously,
  the bar filling as one continuous animated stripe. Final widths teal
  18 %, blue 28 %, magenta 51 %, orange 2 %. Legend percentage numbers
  count up in sync with their bar segments.

While the counters animate, the camera performs a slow ease-in dolly + tilt
toward the monitor — frame rotates ~12° so we're moving from a slightly
oblique view to a more front-on view of the monitor. Card stays at its
tilted hovering angle (no rotation yet, no parallax pop).

### 1.40 – 1.65 s · Card rotates flat
Counters and bars are now all at final values and hold steady.

The card smoothly rotates from its 22° Y / 10° X tilt to **0° / 0° flat-on**
to the monitor — like a piece of glass settling parallel to the screen
surface — over 0.25 seconds with a soft ease-out. It also translates
forward toward the monitor's screen plane, closing the 30 cm gap to about
2 cm.

Camera continues its slow ease-in dolly through this beat.

### 1.65 – 1.85 s · Snap into the monitor
The card travels the last 2 cm forward and **seats flush into the monitor's
screen surface** — landing exactly in the empty Profile-card slot that's
been waiting on the Calibrate UI. The card scales by a couple of percent to
match the slot dimensions perfectly. Single clean ease-out, no bounce, no
overshoot, no flash. Just a precise dock.

At the instant it seats, the card becomes flush pixels on the monitor — it
is no longer a floating 3D panel, it is part of the displayed UI. The
monitor now shows the complete Calibrate Profile view exactly as in the
attached image.

### 1.85 – 2.00 s · Hold
Camera completes its dolly into a clean, slightly low-angle product hero
framing of the monitor — the Calibrate UI fully visible on screen, the
white studio behind. Composition holds.

The final 0.05 s reads as a held product shot. The monitor display shows
the attached image exactly.

---

## STYLE CONSTANTS

- 60 fps, smooth ease-out cubic for every value transition.
- Digit updates snap at the frame — no motion blur on numerals.
- Bar segment colors: teal `#2dd4bf`, blue `#60a5fa`, magenta `#c084fc`,
  orange `#fb923c`. No gradient changes beyond what's on the card.
- Card surface stays as the deep midnight glass shown in the image —
  translucent edges, soft inner glow already baked into the design. No
  added rim light, no extra reflection, no chrome.
- Monitor is matte white aluminum, thin bezel, no logo visible. Apple-clean
  product-photography style.
- White studio backdrop, soft falloff, gentle floor shadow under the
  monitor.
- Camera moves are motion-controlled smooth, slow ease-in dolly only. No
  whip, no parallax pop, no shake.
- No particles. No bloom flares. No glow trails. No scanlines. No flicker.
  No light streaks.
- Achievement tiles and app chrome on the monitor are completely static.
- Cursor not visible.

Final 0.1 s of the shot must match the attached image as the monitor's
on-screen content.

---

© 2026 Sanketh Verma · Calibrate Profile card "snap into monitor" prompt
