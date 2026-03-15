# Temperature Painter — Detailed Task List

Tasks are ordered so **each task depends only on what appears above it**. Complete in order from top to bottom.

---

## 1. Create project folder and files *(no dependencies)*
- Create `temperature-painter/` (or use project root).
- Add `index.html`, `style.css`, and `main.js`.
- Use only vanilla HTML, CSS, and JavaScript — no frameworks or CDN dependencies.

## 2. Set up index.html — *Depends on: 1*
- Add a single full-viewport `<canvas>` element.
- Link `style.css` and `main.js`.
- Ensure no extra UI (buttons, instructions, overlays).

## 3. Set up style.css — *Depends on: 1*
- Set background to deep navy `#0a0f1e`.
- Make the canvas fill 100% of the viewport (width/height 100%, no margins).
- Use full-screen layout so the canvas is the only visible content.

## 4. Initialize canvas in main.js — *Depends on: 2, 3*
- Get canvas and 2D context in `main.js`.
- Set canvas width/height to `window.innerWidth` and `window.innerHeight`.
- Handle `resize` to keep canvas full-viewport on resize.

## 5. Implement animation loop — *Depends on: 4*
- Use `requestAnimationFrame` for the main loop.
- Target smooth 60fps; clear canvas each frame and redraw.
- Structure so update logic and draw logic can be extended (particles, clouds, rain).

## 6. Define water surface zone — *Depends on: 4*
- Treat bottom 30% of the screen as the “water surface” zone.
- Store zone bounds (e.g. y range) for use by input and particle emission.
- Optionally draw a calm, semi-transparent blue-teal layer in that zone (can refine later).

## 7. Water surface layer — *Depends on: 5, 6*
- Draw calm, semi-transparent blue-teal layer in bottom 30% of screen.
- Ensure it layers behind where heat particles, rain, and ripples will be drawn.

## 8. Add mouse input — *Depends on: 4, 6*
- On `mousedown` + `mousemove`, track cursor position.
- Emit heat only when cursor is over or near the water surface zone.
- Stop emitting on `mouseup` / `mouseleave`.

## 9. Add touch input — *Depends on: 4, 6*
- On `touchstart` + `touchmove`, track finger position(s).
- Use `e.preventDefault()` on touch events to prevent page scrolling.
- Emit heat only when touch is over or near the water surface zone.
- Stop emitting on `touchend` / `touchcancel`.

## 10. Touch scroll prevention — *Depends on: 9*
- Ensure `e.preventDefault()` is called on `touchstart` / `touchmove` where needed so the page doesn’t scroll.

## 11. Unify input for emission — *Depends on: 8, 9*
- Create a single “heat source” interface (position + active flag) fed by either mouse or touch.
- Ensure only one emission pipeline uses this (no duplicate particles for same gesture).

## 12. Define heat particle data — *Depends on: 5*
- Each particle: position (x, y), velocity (vx, vy), optional age/life, active flag.
- Cap total active particles (e.g. up to 200) for performance.

## 13. Emit heat particles — *Depends on: 11, 12*
- While dragging over water surface, spawn particles at cursor/finger position.
- Spawn rate and count should allow 40–60 particles in upper zone to trigger clouds (tune later).
- Particles start with upward velocity; small random horizontal drift.

## 14. Update heat particles (evaporation) — *Depends on: 12*
- Each frame: move particles by velocity; apply gravity or drag so they slow as they rise (cooling).
- Add slight left/right drift as they climb (organic, not mechanical).
- Remove or mark inactive particles that leave the top of the screen or exceed max count.

## 15. Render heat particles — *Depends on: 12, 14*
- Draw as small glowing cyan dots (`#00e5ff`) with soft blur (e.g. shadowBlur).
- Optional: add wispy, semi-transparent white “steam” trails that fade as they rise.

## 16. Particle limit and cleanup — *Depends on: 12, 13, 14*
- Enforce max ~200 active particles; recycle or drop oldest when over limit.
- Remove inactive particles promptly to avoid memory growth.

## 17. Define upper zone — *Depends on: 4*
- Define the “upper zone” (e.g. top 25–40% of screen) where particles count toward clouds.

## 18. Count particles in upper zone — *Depends on: 12, 14, 17*
- Each frame, count active heat particles whose y is in the upper zone.
- When count reaches threshold (about 40–60 particles), trigger cloud state.

## 19. Cloud state and density — *Depends on: 18*
- Maintain cloud state: none / forming / full.
- “Forming”: particles in upper zone merge visually into a cloud mass.
- “Full”: cloud is dark and dense enough to start rain (define density threshold or time).

## 20. Render cloud mass — *Depends on: 19*
- Draw cloud as dark blue-grey (`#1e2d45`) mass that grows and darkens with density.
- Use particles in upper zone to shape the cloud (e.g. blur, blend, or replace with a single cloud shape driven by particle positions).
- Aesthetic: physics simulation, atmospheric, not cartoonish.

## 21. Start rain — *Depends on: 19*
- When cloud reaches full density, start rain automatically (no user trigger).
- Spawn raindrops from the cloud region (e.g. from random x under the cloud, y at cloud bottom).

## 22. Raindrop physics and rendering — *Depends on: 21*
- Each raindrop: position, velocity (downward with slight angle and speed variance).
- Draw as thin white lines with slight angle and varied opacity.
- Update positions each frame; remove when they hit water surface or leave screen.

## 23. Particle and steam visuals — *Depends on: 15*
- Refine heat particles: size, blur, cyan `#00e5ff`.
- Add or refine wispy semi-transparent white steam trails that fade as they rise.

## 24. Cloud and rain visuals — *Depends on: 20, 22*
- Final pass on cloud: shape, blur, dark blue-grey `#1e2d45`, density darkening.
- Final pass on rain: line thickness, angle, opacity variation.

## 25. Ripple data and spawn — *Depends on: 6, 22*
- When a raindrop hits the water surface (y within water zone), create a ripple at (x, water surface y).
- Ripple: center (x, y), radius, max radius, opacity or life.

## 26. Update and render ripples — *Depends on: 25*
- Each frame: expand radius, fade opacity.
- Draw as circular expanding rings on the water surface; remove when faded or at max radius.
- Keep ripple count bounded for performance.

## 27. Draw order and atmosphere — *Depends on: 7, 15, 20, 22, 26*
- Fix draw order: background → water surface → particles → cloud → rain → ripples (adjust as needed).
- Ensure overall look is precise and atmospheric, not cartoonish.

## 28. Rain end and cycle reset — *Depends on: 21, 22, 25, 26*
- When rain “completes” (e.g. after N drops or a short duration), stop spawning rain.
- After last raindrops hit the water, reset to initial calm state: clear particles, reset cloud, stop rain.
- Loop: user can trigger evaporation again.

## 29. Web Audio setup — *Depends on: none*
- Create AudioContext in `main.js` (resume on first user interaction if needed).
- Use only Web Audio API — no external audio files.

## 30. Drag sound — *Depends on: 11*
- While dragging on water surface: soft sizzle/hiss, low volume, looped.
- Stop when drag ends.

## 31. Particles rising sound — *Depends on: 13*
- Faint airy whoosh (e.g. filtered noise or oscillator) when particles are rising; optional or tied to emission.

## 32. Cloud forming sound — *Depends on: 19*
- Low rumble that builds slowly as cloud forms (e.g. low-frequency oscillator or noise).

## 33. Rain sound — *Depends on: 21*
- Gentle, layered rain patter; intensity matches rainfall density.
- Start when rain starts; stop when rain ends.

## 34. Drip sound — *Depends on: 25*
- On raindrop hit water: subtle drip sound with slightly randomised pitch.
- Throttle if many drops hit in one frame to avoid clutter.

## 35. Cross-device testing — *Depends on: 1–34*
- Test on desktop (mouse) and mobile (touch).
- Verify full-screen canvas, no layout breaks, and smooth 60fps where possible.

## 36. First-touch clarity — *Depends on: 1–34*
- Verify: within ~5 seconds of touching the screen, a user can tell their finger causes something (heat/particles).

## 37. Full cycle without instructions — *Depends on: 1–34*
- Verify: within ~30 seconds, a user can see a full cycle — evaporation, cloud formation, rain, reset — with no text or buttons.

## 38. Out-of-scope check — *Depends on: 1–34*
- Confirm no score, timer, multiple screens, user settings, educational overlays, or backend.

---

## Dependency summary

| Order | Task summary                    | Depends on   |
|-------|---------------------------------|--------------|
| 1–3   | Project setup, HTML, CSS        | —            |
| 4–6   | Canvas, loop, water zone        | 1–3, 4       |
| 7     | Water surface layer             | 5, 6         |
| 8–11  | Mouse, touch, prevent scroll, unify | 4, 6, 8, 9 |
| 12–16 | Particle data, emit, update, render, limit | 5, 11–14 |
| 17–20 | Upper zone, count, cloud state, render cloud | 4, 12, 14, 17–19 |
| 21–22 | Start rain, raindrop physics   | 19, 21       |
| 23–24 | Particle/steam and cloud/rain polish | 15, 20, 22 |
| 25–28 | Ripples, draw order, reset     | 6, 22, 25–26, 7, 15, 20, 21–22 |
| 29–34 | Web Audio and all sounds       | 11, 13, 19, 21, 25 |
| 35–38 | Testing and validation         | Full app     |

---

*Derived from PRD — Temperature Painter (Water Cycle Interactive Prototype).*
