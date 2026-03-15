// Temperature Painter — Water Cycle
// Vanilla JavaScript, no dependencies

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Water level (closed system) — declared early so resizeCanvas can set it
const WATER_LEVEL_BASE = 0.7;
const WATER_LEVEL_MAX_DROP = 0.09;   // subtle drop, proportional to airborne
const WATER_LEVEL_SMOOTH_DROP = 0.018;   // gradual when evaporating
const WATER_LEVEL_SMOOTH_RISE = 0.065;   // snappier when rain returns (feels in sync)
const MAX_AIRBORNE_FOR_FULL_DROP = 400;
let currentWaterTop = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  currentWaterTop = canvas.height * WATER_LEVEL_BASE;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Web Audio API — create and resume on first user interaction (required on mobile / iOS)
let audioCtx = null;

function initAudioOnFirstInteraction() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function getAudioContext() {
  return audioCtx;
}

document.addEventListener('mousedown', initAudioOnFirstInteraction, { once: true, capture: true });
document.addEventListener('touchstart', initAudioOnFirstInteraction, { once: true, capture: true });

let dragSoundSource = null;
let dragSoundPlaying = false;
let dragSoundNoiseBuffer = null;
let dragSoundGain = null;
let dragSoundFilter = null;

function getDragSoundNodes() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!dragSoundNoiseBuffer) {
    const duration = 0.12;
    const numSamples = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    dragSoundNoiseBuffer = buffer;
  }
  if (!dragSoundFilter) {
    dragSoundFilter = ctx.createBiquadFilter();
    dragSoundFilter.type = 'bandpass';
    dragSoundFilter.frequency.value = 3200;
    dragSoundFilter.Q.value = 0.6;
  }
  if (!dragSoundGain) {
    dragSoundGain = ctx.createGain();
    dragSoundGain.gain.value = 0.06;
    dragSoundGain.connect(ctx.destination);
  }
  return { buffer: dragSoundNoiseBuffer, filter: dragSoundFilter, gain: dragSoundGain };
}

function startDragSound() {
  const ctx = getAudioContext();
  if (dragSoundPlaying || !ctx || ctx.state !== 'running') return;
  const nodes = getDragSoundNodes();
  if (!nodes) return;
  const { buffer, filter, gain } = nodes;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(filter);
  filter.connect(gain);
  source.start(0);
  dragSoundSource = source;
  dragSoundPlaying = true;
}

function stopDragSound() {
  if (!dragSoundSource) return;
  try { dragSoundSource.stop(0); } catch (_) {}
  dragSoundSource.disconnect();
  dragSoundSource = null;
  dragSoundPlaying = false;
}

// Particles rising: faint airy whoosh when emitting (tied to heat source)
let whooshSoundSource = null;
let whooshSoundPlaying = false;
let whooshNoiseBuffer = null;
let whooshFilter = null;
let whooshGain = null;

function getWhooshSoundNodes() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!whooshNoiseBuffer) {
    const duration = 0.25;
    const numSamples = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
    whooshNoiseBuffer = buffer;
  }
  if (!whooshFilter) {
    whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'highpass';
    whooshFilter.frequency.value = 900;
    whooshFilter.Q.value = 0.5;
  }
  if (!whooshGain) {
    whooshGain = ctx.createGain();
    whooshGain.gain.value = 0.025;
    whooshGain.connect(ctx.destination);
  }
  return { buffer: whooshNoiseBuffer, filter: whooshFilter, gain: whooshGain };
}

function startWhooshSound() {
  const ctx = getAudioContext();
  if (whooshSoundPlaying || !ctx || ctx.state !== 'running') return;
  const nodes = getWhooshSoundNodes();
  if (!nodes) return;
  const { buffer, filter, gain } = nodes;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(filter);
  filter.connect(gain);
  source.start(0);
  whooshSoundSource = source;
  whooshSoundPlaying = true;
}

function stopWhooshSound() {
  if (!whooshSoundSource) return;
  try { whooshSoundSource.stop(0); } catch (_) {}
  whooshSoundSource.disconnect();
  whooshSoundSource = null;
  whooshSoundPlaying = false;
}

// Water surface: closed system — getWaterZone() uses currentWaterTop (updated each frame)
function getWaterZone() {
  return { top: currentWaterTop, bottom: canvas.height };
}

function getBaseWaterTop() {
  return canvas.height * WATER_LEVEL_BASE;
}

function isInWaterZone(x, y) {
  const { top, bottom } = getWaterZone();
  return y >= top && y <= bottom && x >= 0 && x <= canvas.width;
}

// Upper zone: top 30% of screen — clouds form and are drawn here (at the top)
function getUpperZone() {
  const top = 0;
  const bottom = canvas.height * 0.3;
  return { top, bottom };
}

function isInUpperZone(y) {
  const { top, bottom } = getUpperZone();
  return y >= top && y <= bottom;
}

const CLOUD_FORMING_THRESHOLD = 48;   // particles in upper zone to trigger cloud
const CLOUD_FULL_THRESHOLD = 75;     // particle count for "full" (or use forming duration)
const CLOUD_FULL_DURATION_FRAMES = 360; // ~6 sec at 60fps — cloud builds slowly before rain can start

function getParticleCountInUpperZone() {
  return particles.filter(p => p.active && isInUpperZone(p.y)).length;
}

// Cloud state: 'none' | 'forming' | 'full' (reset to none in Task 28 after rain)
let cloudState = 'none';
let cloudFormingFrames = 0;
let cloudDissolveProgress = 0; // 0 = full cloud, 1 = dissolved; increases while it rains
const CLOUD_DISSOLVE_DURATION_FRAMES = 270; // ~4.5 sec at 60fps — cloud fades over rain

// Cloud forming sound: low rumble that builds slowly
let cloudRumbleOsc = null;
let cloudRumbleGain = null;
const CLOUD_RUMBLE_FREQ = 72;
const CLOUD_RUMBLE_GAIN_MAX = 0.04;

function startCloudRumble() {
  const ctx = getAudioContext();
  if (cloudRumbleOsc || !ctx || ctx.state !== 'running') return;
  cloudRumbleOsc = ctx.createOscillator();
  cloudRumbleOsc.type = 'sine';
  cloudRumbleOsc.frequency.value = CLOUD_RUMBLE_FREQ;
  cloudRumbleGain = ctx.createGain();
  cloudRumbleGain.gain.value = 0;
  cloudRumbleOsc.connect(cloudRumbleGain);
  cloudRumbleGain.connect(ctx.destination);
  cloudRumbleOsc.start(0);
}

function stopCloudRumble() {
  if (!cloudRumbleOsc) return;
  try { cloudRumbleOsc.stop(0); } catch (_) {}
  cloudRumbleOsc.disconnect();
  cloudRumbleOsc = null;
  cloudRumbleGain = null;
}

function updateCloudRumbleGain() {
  if (cloudState === 'none') {
    stopCloudRumble();
    return;
  }
  if (cloudState === 'forming') {
    startCloudRumble();
    if (cloudRumbleGain) {
      const t = Math.min(1, cloudFormingFrames / CLOUD_FULL_DURATION_FRAMES);
      cloudRumbleGain.gain.value = 0.008 + t * (CLOUD_RUMBLE_GAIN_MAX - 0.008);
    }
  } else if (cloudState === 'full' && cloudRumbleGain) {
    cloudRumbleGain.gain.value = CLOUD_RUMBLE_GAIN_MAX;
  }
}

function updateCloudState() {
  const count = getParticleCountInUpperZone();
  if (cloudState === 'none') {
    if (count >= CLOUD_FORMING_THRESHOLD) {
      cloudState = 'forming';
      cloudFormingFrames = 0;
    }
  } else if (cloudState === 'forming') {
    cloudFormingFrames++;
    if (count >= CLOUD_FULL_THRESHOLD || cloudFormingFrames >= CLOUD_FULL_DURATION_FRAMES) {
      cloudState = 'full';
      rainActive = true;
      rainHadStarted = true;
      cloudDissolveProgress = 0;
    }
  }
  // 'full' stays until reset (rain end)
}

// Rain sound: gentle layered patter, intensity matches raindrop count
let rainSoundSource = null;
let rainSoundPlaying = false;
let rainSoundBuffer = null;
let rainSoundFilter = null;
let rainSoundGain = null;
const RAIN_GAIN_MIN = 0.02;
const RAIN_GAIN_MAX = 0.08;
const RAIN_DROPS_FOR_MAX = 100;

function getRainSoundNodes() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!rainSoundBuffer) {
    const duration = 0.4;
    const numSamples = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
    rainSoundBuffer = buffer;
  }
  if (!rainSoundFilter) {
    rainSoundFilter = ctx.createBiquadFilter();
    rainSoundFilter.type = 'bandpass';
    rainSoundFilter.frequency.value = 2800;
    rainSoundFilter.Q.value = 0.4;
  }
  if (!rainSoundGain) {
    rainSoundGain = ctx.createGain();
    rainSoundGain.gain.value = RAIN_GAIN_MIN;
    rainSoundGain.connect(ctx.destination);
  }
  return { buffer: rainSoundBuffer, filter: rainSoundFilter, gain: rainSoundGain };
}

function startRainSound() {
  const ctx = getAudioContext();
  if (rainSoundPlaying || !ctx || ctx.state !== 'running') return;
  const nodes = getRainSoundNodes();
  if (!nodes) return;
  const { buffer, filter, gain } = nodes;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(filter);
  filter.connect(gain);
  source.start(0);
  rainSoundSource = source;
  rainSoundPlaying = true;
}

function stopRainSound() {
  if (!rainSoundSource) return;
  try { rainSoundSource.stop(0); } catch (_) {}
  rainSoundSource.disconnect();
  rainSoundSource = null;
  rainSoundPlaying = false;
}

function updateRainSoundGain() {
  if (!rainSoundGain) return;
  const t = Math.min(1, raindrops.length / RAIN_DROPS_FOR_MAX);
  rainSoundGain.gain.value = RAIN_GAIN_MIN + t * (RAIN_GAIN_MAX - RAIN_GAIN_MIN);
}

// Rain: start when cloud is full, spawn from cloud region
let rainActive = false;
const raindrops = [];
const RAIN_SPAWN_RATE = 2;       // drops per frame
const RAIN_DURATION_FRAMES = 300; // ~5 sec of spawning then stop
let rainDurationFrames = 0;
let rainHadStarted = false;
const RAIN_INITIAL_VY_MIN = 4;
const RAIN_INITIAL_VY_MAX = 7;
const RAIN_INITIAL_VX_SPREAD = 0.8;

function spawnRaindrops() {
  if (!rainActive) return;
  rainDurationFrames++;
  if (rainDurationFrames >= RAIN_DURATION_FRAMES) rainActive = false;
  const { bottom } = getUpperZone();
  for (let i = 0; i < RAIN_SPAWN_RATE; i++) {
    raindrops.push({
      x: Math.random() * canvas.width,
      y: bottom,
      vx: (Math.random() - 0.5) * 2 * RAIN_INITIAL_VX_SPREAD,
      vy: RAIN_INITIAL_VY_MIN + Math.random() * (RAIN_INITIAL_VY_MAX - RAIN_INITIAL_VY_MIN),
      opacity: RAIN_OPACITY_MIN + Math.random() * (RAIN_OPACITY_MAX - RAIN_OPACITY_MIN),
      active: true
    });
  }
}

const RAIN_LINE_LENGTH = 12;
const RAIN_OPACITY_MIN = 0.55;
const RAIN_OPACITY_MAX = 0.95;
const RAIN_LINE_WIDTH = 1.4;

const RIPPLES = [];
const MAX_RIPPLES = 50;
const RIPPLE_MAX_RADIUS = 40;
const RIPPLE_INITIAL_OPACITY = 0.6;

function spawnRipple(x, y) {
  if (RIPPLES.length >= MAX_RIPPLES) return;
  RIPPLES.push({
    x,
    y,
    radius: 0,
    maxRadius: RIPPLE_MAX_RADIUS,
    opacity: RIPPLE_INITIAL_OPACITY,
    active: true
  });
}

const RIPPLE_EXPAND_RATE = 2.2;
const RIPPLE_FADE_RATE = 0.028;

function updateRipples() {
  for (const r of RIPPLES) {
    if (!r.active) continue;
    r.radius += RIPPLE_EXPAND_RATE;
    r.opacity -= RIPPLE_FADE_RATE;
    if (r.opacity <= 0 || r.radius >= r.maxRadius) r.active = false;
  }
  for (let i = RIPPLES.length - 1; i >= 0; i--) {
    if (!RIPPLES[i].active) RIPPLES.splice(i, 1);
  }
}

function drawRipples() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
  ctx.lineWidth = 1.2;
  for (const r of RIPPLES) {
    if (!r.active) continue;
    ctx.globalAlpha = r.opacity;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Drip sound on raindrop hit: short tone, randomised pitch, throttled per frame
const MAX_DRIPS_PER_FRAME = 4;
let dripsPlayedThisFrame = 0;
const DRIP_BASE_FREQ = 900;
const DRIP_FREQ_VARIANCE = 400;
const DRIP_DURATION = 0.06;
const DRIP_GAIN = 0.04;

function playDripSound() {
  const ctx = getAudioContext();
  if (dripsPlayedThisFrame >= MAX_DRIPS_PER_FRAME || !ctx || ctx.state !== 'running') return;
  dripsPlayedThisFrame++;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const freq = DRIP_BASE_FREQ + (Math.random() * 2 - 1) * DRIP_FREQ_VARIANCE;
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(DRIP_GAIN, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + DRIP_DURATION);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + DRIP_DURATION);
}

function updateRaindrops() {
  dripsPlayedThisFrame = 0;
  const waterTop = getWaterZone().top;
  for (const d of raindrops) {
    if (!d.active) continue;
    d.x += d.vx;
    d.y += d.vy;
    if (d.y >= waterTop || d.y > canvas.height || d.x < -20 || d.x > canvas.width + 20) {
      if (d.y >= waterTop) {
        spawnRipple(d.x, waterTop);
        playDripSound();
      }
      d.active = false;
    }
  }
  for (let i = raindrops.length - 1; i >= 0; i--) {
    if (!raindrops[i].active) raindrops.splice(i, 1);
  }
}

function drawRain() {
  if (!rainActive) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = RAIN_LINE_WIDTH;
  ctx.lineCap = 'round';
  for (const d of raindrops) {
    if (!d.active) continue;
    ctx.globalAlpha = d.opacity;
    const len = RAIN_LINE_LENGTH;
    const dx = (d.vx / d.vy) * len;
    const dy = len;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + dx, d.y + dy);
    ctx.stroke();
  }
  ctx.restore();
}

// Mouse input state
let mouseActive = false;
let mouseX = 0;
let mouseY = 0;

function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousedown', (e) => {
  initAudioOnFirstInteraction(); // create/resume AudioContext on first click (desktop)
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  mouseX = x;
  mouseY = y;
  mouseActive = true;
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  mouseX = x;
  mouseY = y;
});

canvas.addEventListener('mouseup', () => {
  mouseActive = false;
});

canvas.addEventListener('mouseleave', () => {
  mouseActive = false;
});

// Touch input state
let touchActive = false;
let touchX = 0;
let touchY = 0;

canvas.addEventListener('touchstart', (e) => {
  initAudioOnFirstInteraction(); // create/resume AudioContext on first touch (required for mobile)
  e.preventDefault(); // Prevent scroll so drag acts as heat source only
  if (e.touches.length > 0) {
    const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    touchX = x;
    touchY = y;
    touchActive = true;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault(); // Prevent scroll so drag acts as heat source only
  if (e.touches.length > 0) {
    const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    touchX = x;
    touchY = y;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    touchActive = false;
  } else {
    const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    touchX = x;
    touchY = y;
  }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  touchActive = false;
});

// Unified heat source: one position + active flag for emission (touch takes precedence over mouse)
function getHeatSource() {
  const isTouch = touchActive;
  const isMouse = mouseActive && !isTouch;
  const x = isTouch ? touchX : mouseX;
  const y = isTouch ? touchY : mouseY;
  const active = (isTouch || isMouse) && isInWaterZone(x, y);
  return { active, x, y };
}

// Heat particles: position, velocity, optional age/life, active flag. Cap at 200.
const MAX_PARTICLES = 200;
const particles = [];

function createParticle(x, y, vx, vy) {
  return {
    x,
    y,
    vx,
    vy,
    age: 0,
    active: true
  };
}

const EMIT_RATE = 2; // particles per frame — slower buildup
const EMIT_VY_MIN = -3.8;
const EMIT_VY_MAX = -2.4;
const EMIT_VX_SPREAD = 0.6;

function emitHeatParticles() {
  const { active, x, y } = getHeatSource();
  if (!active) return;
  for (let i = 0; i < EMIT_RATE; i++) {
    if (particles.filter(p => p.active).length >= MAX_PARTICLES) break;
    const vy = EMIT_VY_MIN + Math.random() * (EMIT_VY_MAX - EMIT_VY_MIN);
    const vx = (Math.random() - 0.5) * 2 * EMIT_VX_SPREAD;
    particles.push(createParticle(x, y, vx, vy));
  }
}

const COOLING_DRAG = 0.993;   // gentle slowdown so particles can reach cloud zone (was 0.987, too strong)
const DRIFT_STRENGTH = 0.12;  // organic left/right wobble

function updateHeatParticles() {
  for (const p of particles) {
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= COOLING_DRAG;
    p.vy *= COOLING_DRAG;
    p.vx += (Math.random() - 0.5) * 2 * DRIFT_STRENGTH;
    p.age++;
    if (p.y < 0 || p.y > canvas.height || p.x < -50 || p.x > canvas.width + 50) {
      p.active = false;
    }
  }
}

function cleanupHeatParticles() {
  const active = particles.filter(p => p.active);
  if (active.length > MAX_PARTICLES) {
    active.sort((a, b) => b.age - a.age);
    for (let i = 0; i < active.length - MAX_PARTICLES; i++) {
      active[i].active = false;
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].active) particles.splice(i, 1);
  }
}

const PARTICLE_RADIUS = 2.5;
const PARTICLE_GLOW_BLUR = 12;
const STEAM_TRAIL_LENGTH = 3;
const STEAM_TRAIL_ALPHAS = [0.22, 0.11, 0.04];
const STEAM_TRAIL_OFFSET = 4;
const STEAM_FADE_AGE = 150;

// Particles in upper zone fade out first (before cloud), during rain
const PARTICLE_DISSOLVE_AT = 0.45; // when cloudDissolveProgress reaches this, upper-zone particles are gone

function drawHeatParticles() {
  ctx.save();
  const upperZoneParticleFade = 1 - Math.min(1, cloudDissolveProgress / PARTICLE_DISSOLVE_AT);
  for (const p of particles) {
    if (!p.active) continue;
    const inUpper = isInUpperZone(p.y);
    const dissolveFade = inUpper ? upperZoneParticleFade : 1;
    if (dissolveFade <= 0) continue;
    const trailFade = 1 - Math.min(1, p.age / STEAM_FADE_AGE);
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = 0;
    for (let i = 0; i < STEAM_TRAIL_LENGTH; i++) {
      const ty = p.y + (i + 1) * STEAM_TRAIL_OFFSET;
      const tx = p.x + p.vx * (i + 1);
      ctx.globalAlpha = STEAM_TRAIL_ALPHAS[i] * trailFade * dissolveFade;
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = PARTICLE_GLOW_BLUR;
  ctx.fillStyle = '#00e5ff';
  for (const p of particles) {
    if (!p.active) continue;
    const inUpper = isInUpperZone(p.y);
    const dissolveFade = inUpper ? upperZoneParticleFade : 1;
    if (dissolveFade <= 0) continue;
    ctx.globalAlpha = dissolveFade;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const CLOUD_COLOR = '#1e2d45';
const CLOUD_BLOB_RADIUS = 36;
const CLOUD_BLUR = 28;
const CLOUD_DENSITY_FORMING = 0.28;
const CLOUD_DENSITY_FULL = 0.62;

function drawCloud() {
  if (cloudState === 'none') return;
  const upperParticles = particles.filter(p => p.active && isInUpperZone(p.y));
  if (upperParticles.length === 0 && cloudDissolveProgress >= 1) return;
  let density = cloudState === 'full'
    ? CLOUD_DENSITY_FULL
    : CLOUD_DENSITY_FORMING + 0.2 * Math.min(1, upperParticles.length / CLOUD_FORMING_THRESHOLD);
  density *= 1 - cloudDissolveProgress;
  if (density <= 0.002) return;
  ctx.save();
  ctx.fillStyle = CLOUD_COLOR;
  ctx.shadowColor = CLOUD_COLOR;
  ctx.shadowBlur = CLOUD_BLUR;
  ctx.globalAlpha = density;
  for (const p of upperParticles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, CLOUD_BLOB_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Animated sea: wave phase advances each frame for gentle motion
let waterPhase = 0;
const WATER_WAVE_AMPLITUDE = 5;
const WATER_WAVE_FREQ = 0.012;
const WATER_WAVE_FREQ2 = 0.025;
const WATER_WAVE_AMP2 = 2.5;

function drawWaterSurface() {
  const { top, bottom } = getWaterZone();
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(0, top);
  const step = 4;
  for (let x = 0; x <= canvas.width + step; x += step) {
    const wave1 = WATER_WAVE_AMPLITUDE * Math.sin(x * WATER_WAVE_FREQ + waterPhase);
    const wave2 = WATER_WAVE_AMP2 * Math.sin(x * WATER_WAVE_FREQ2 + waterPhase * 1.3 + 1);
    const y = top + wave1 + wave2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width + step, bottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 120, 140, 0.38)';
  ctx.fill();
  // Subtle second layer for depth (slightly different wave)
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(0, top);
  for (let x = 0; x <= canvas.width + step; x += step) {
    const wave = 3 * Math.sin(x * 0.02 + waterPhase * 0.7);
    ctx.lineTo(x, top + wave);
  }
  ctx.lineTo(canvas.width + step, bottom);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40, 160, 180, 0.12)';
  ctx.fill();
}

function updateWaterPhase() {
  waterPhase += 0.028;
}

// Closed-system water level: rise only while rain is falling; stop rising when rain stops
function updateWaterLevel() {
  const baseTop = getBaseWaterTop();
  const airborneCount = particles.filter(p => p.active).length + raindrops.filter(d => d.active).length;
  const maxDrop = canvas.height * WATER_LEVEL_MAX_DROP;
  const dropPerUnit = maxDrop / MAX_AIRBORNE_FOR_FULL_DROP;
  const targetTop = baseTop + Math.min(maxDrop, airborneCount * dropPerUnit);
  const isRaining = rainActive || raindrops.length > 0;
  const isRising = targetTop < currentWaterTop;
  const smooth = (isRaining && isRising)
    ? WATER_LEVEL_SMOOTH_RISE
    : WATER_LEVEL_SMOOTH_DROP;
  currentWaterTop += (targetTop - currentWaterTop) * smooth;
}

function update() {
  updateWaterLevel();
  const heat = getHeatSource();
  if (heat.active) {
    startDragSound();
    startWhooshSound();
  } else {
    stopDragSound();
    stopWhooshSound();
  }
  emitHeatParticles();
  updateHeatParticles();
  cleanupHeatParticles();
  updateCloudState();
  updateCloudRumbleGain();
  spawnRaindrops();
  updateRaindrops();
  if (rainActive) {
    startRainSound();
    updateRainSoundGain();
  } else {
    stopRainSound();
  }
  updateRipples();
  updateWaterPhase();
  if (rainActive || raindrops.length > 0) {
    cloudDissolveProgress = Math.min(1, cloudDissolveProgress + 1 / CLOUD_DISSOLVE_DURATION_FRAMES);
  }
  if (rainHadStarted && !rainActive && raindrops.length === 0) resetCycle();
}

function resetCycle() {
  while (particles.length) particles.pop();
  cloudState = 'none';
  cloudFormingFrames = 0;
  cloudDissolveProgress = 0;
  rainDurationFrames = 0;
  rainHadStarted = false;
  stopCloudRumble();
  stopRainSound();
  while (RIPPLES.length) RIPPLES.pop();
}

// Draw order: background (clear) → water → particles → cloud → rain → ripples
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWaterSurface();
  drawHeatParticles();
  drawCloud();
  drawRain();
  drawRipples();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
