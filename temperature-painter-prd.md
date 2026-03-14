# PRD — Temperature Painter
### Water Cycle Interactive Prototype

---

## 1. Concept

A single-screen interactive prototype where the user's finger (or mouse) acts as the sun. Dragging across a water surface generates heat, causing water particles to evaporate, rise, cluster into clouds, and eventually fall as rain — completing the water cycle. No buttons. No instructions. Just touch and cause-and-effect.

---

## 2. Goal

Build a tactile, visually satisfying prototype that makes the water cycle feel physical and intuitive. The user should understand what is happening without reading anything.

---

## 3. Interaction Design

### 3.1 Touch / Drag
- On mousedown + mousemove (desktop) or touchstart + touchmove (mobile), emit heat particles from the cursor/finger position
- Particles only emit when the cursor/finger is over or near the water surface zone
- e.preventDefault() must be applied to touch events to prevent page scrolling

### 3.2 Evaporation
- Heat particles rise upward from the emission point
- Each particle drifts slightly left or right as it climbs (organic, not mechanical)
- Particles slow down as they gain altitude (simulating cooling)

### 3.3 Cloud Formation
- When enough particles cluster in the upper zone, they merge visually into a cloud mass
- The cloud grows darker and denser as more particles join
- Threshold: approximately 40–60 particles in the upper zone trigger cloud formation

### 3.4 Rain
- Once the cloud reaches full density, rain begins automatically — no user trigger needed
- Raindrops fall at varied speeds and angles (slight randomness)
- Each raindrop that hits the water surface creates a small ripple animation
- After rain completes, the cycle resets to its initial calm state

---

## 4. Visual Design

| Element | Style |
|---|---|
| Background | Deep navy (#0a0f1e) |
| Water surface | Calm, semi-transparent blue-teal layer at bottom 30% of screen |
| Heat particles | Glowing cyan (#00e5ff), small dots with soft blur |
| Steam trails | Wispy, semi-transparent white, fading as they rise |
| Cloud mass | Dark blue-grey (#1e2d45), grows and darkens with density |
| Rain | Thin white lines, slight angle, varied opacity |
| Ripples | Circular expanding rings on water surface, fade quickly |

The aesthetic should feel like a physics simulation — precise and atmospheric, not cartoonish.

---

## 5. Sound Design

| Trigger | Sound |
|---|---|
| Dragging on water surface | Soft sizzle / hiss (low volume, looped while dragging) |
| Particles rising | Faint airy whoosh |
| Cloud forming | Low rumble building up slowly |
| Rain falling | Gentle, layered rain patter, intensity matches rainfall density |
| Raindrop hitting water | Subtle individual drip sounds (randomised pitch slightly) |

All sounds use the Web Audio API — no external audio files needed.

---

## 6. File Structure

```
temperature-painter/
├── index.html
├── style.css
└── main.js
```

- **index.html** — canvas element, links to style.css and main.js
- **style.css** — background, canvas sizing, full-screen layout, font if needed
- **main.js** — all canvas logic, particle system, event listeners, Web Audio API

No frameworks. No dependencies. Vanilla HTML, CSS, and JavaScript only.

---

## 7. Technical Requirements

- Canvas element fills 100% of viewport
- Works on both desktop (mouse) and mobile (touch)
- Particle system handles up to 200 active particles without performance drop
- Smooth 60fps animation using requestAnimationFrame
- Touch events use e.preventDefault() to block scroll interference
- No external libraries or CDN dependencies

---

## 8. Out of Scope

- Score, timer, or game mechanics
- Multiple screens or navigation
- User settings or controls
- Responsive breakpoints beyond full-screen canvas
- Educational text overlays or labels
- Backend or data storage of any kind

---

## 9. Success Criteria

A user who has never seen this prototype should, within 5 seconds of touching the screen, understand that their finger causes something to happen. Within 30 seconds, they should witness a full cycle — evaporation, cloud, rain — without any instruction.

---

*Part of AI Proto Lab — built with AI, curiosity, and great amounts of tea.*
