/*
 * Sand Wheel. No external dependencies.
 * - Wheel: exact source-photo silhouette retextured with gray sand grains.
 * - Dune: a full-width, natural desert-style dune made of granular layers.
 * - Interaction: near-surface grains respond to mouse/touch, then settle back.
 * - Wind: a subtle wave of dust crosses the dune every five seconds.
 * - Typography: real canvas-drawn sand grains rise into three words in sequence.
 *   BEACON → LIKE → MAHORAGA → repeat; never rendered as HTML text.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('sand');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const randomGenerator = (seed) => () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
  const rand = randomGenerator(87142);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, f) => a + (b - a) * f;

  let width = 0, height = 0, dpr = 1;
  let shape = null;
  let baseCanvas = null;
  let surfaceGrains = [];
  let windGrains = [];
  let lastTime = 0;
  let windDelay = 0;
  let sceneTime = 0;
  let lastWordIndex = -1;
  let wordParticles = [];
  const WORDS = ['Beacon', 'Like', 'Mahoraga'];
  const WORD_SECONDS = 9.2;
  const GUST_SECONDS = 5;
  const GRAIN_PALETTE = Array.from({length: 9}, (_, i) => {
    const shade = 111 + i * 12;
    return `rgba(${shade},${shade},${shade},0.94)`;
  });
  const pointer = { x: -10000, y: -10000, active: false, strength: 0, touch: false };

  function duneSurface(x) {
    if (!shape) return height + 10;
    const u = (x - shape.left) / shape.span;
    const c = clamp(u, 0, 1);

    // Main dune body: broad desert crest, a little asymmetrical and natural.
    const main = Math.pow(Math.sin(Math.PI * c), 0.78);
    const shoulder = Math.pow(Math.sin(Math.PI * c), 1.7);
    const asym = 1 + (c - 0.54) * 0.22;
    const secondary = 0.18 * Math.pow(Math.sin(Math.PI * clamp((c - 0.06) / 0.96, 0, 1)), 1.35);
    const micro = (
      Math.sin(c * 5.3 + 1.4) * 2.2 +
      Math.sin(c * 11.7 - 0.8) * 1.0 +
      Math.sin(c * 23.2 + 0.3) * 0.45
    ) * (0.2 + main * 0.8);

    const rise = shape.rise * (main * asym + secondary * shoulder);
    return height - shape.baseLift - rise - micro;
  }

  const newGrain = (x, y, rng, crest = false) => ({
    x, y,
    dx: 0, dy: 0, vx: 0, vy: 0,
    size: lerp(0.34, 1.32, Math.pow(rng(), 1.25)),
    shade: Math.floor(lerp(crest ? 68 : 34, crest ? 182 : 124, rng())),
    alpha: lerp(0.40, 0.97, rng())
  });

  function rebuild() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const span = width * 1.36;
    const rise = clamp(height * 0.11, 64, 130);
    const baseLift = clamp(height * 0.028, 14, 28);
    shape = {
      left: -width * 0.18,
      span,
      rise,
      baseLift
    };

    baseCanvas = document.createElement('canvas');
    const density = Math.min(dpr, 1.7);
    baseCanvas.width = Math.max(1, Math.floor(width * density));
    baseCanvas.height = Math.max(1, Math.floor(height * density));
    const b = baseCanvas.getContext('2d', { alpha: true });
    b.setTransform(density, 0, 0, density, 0, 0);

    // Full-width dune silhouette, extended beyond both edges to remove gaps.
    b.beginPath();
    b.moveTo(-4, height + 4);
    const steps = Math.max(360, Math.round(width * 0.8));
    for (let i = 0; i <= steps; i++) {
      const x = -width * 0.04 + (width * 1.08) * i / steps;
      b.lineTo(x, duneSurface(x));
    }
    b.lineTo(width + 4, height + 4);
    b.closePath();

    const fill = b.createLinearGradient(0, height - rise - 24, 0, height);
    fill.addColorStop(0, '#6d6d6d');
    fill.addColorStop(0.18, '#555555');
    fill.addColorStop(0.48, '#343434');
    fill.addColorStop(1, '#101010');
    b.fillStyle = fill;
    b.fill();
    b.save();
    b.clip();

    // Dense granular texture.
    const grainCount = Math.round(clamp(width * rise * 0.88, 42000, 168000));
    const rng = randomGenerator(812904);
    for (let i = 0; i < grainCount; i++) {
      const x = -width * 0.05 + rng() * width * 1.10;
      const top = duneSurface(x);
      const y = top + rng() * (height - top + 12);
      if (y > height + 1) continue;
      const depth = (y - top) / Math.max(1, height - top);
      const color = clamp(Math.floor(118 - 84 * depth + (rng() - 0.5) * 66), 10, 186);
      const light = rng() * 0.48 + 0.28;
      const size = Math.max(0.22, rng() * 1.18);
      b.fillStyle = `rgba(${color},${color},${color},${light.toFixed(2)})`;
      b.fillRect(x, y, size, size * (0.74 + rng() * 0.45));
    }

    // Gentle desert ripples.
    for (let layer = 0; layer < 8; layer++) {
      b.beginPath();
      const offset = 10 + layer * (rise / 10.3);
      for (let i = 0; i <= 280; i++) {
        const x = -width * 0.04 + (width * 1.08) * i / 280;
        const ripple = Math.sin(i / 26 + layer * 1.85) * (1.4 + layer * 0.36);
        const y = duneSurface(x) + offset + ripple;
        if (i === 0) b.moveTo(x, y);
        else b.lineTo(x, y);
      }
      b.strokeStyle = layer % 2
        ? 'rgba(10,10,10,0.085)'
        : 'rgba(176,176,176,0.045)';
      b.lineWidth = 1.7;
      b.stroke();
    }
    b.restore();

    // Interactive crest grains.
    surfaceGrains = [];
    const moving = Math.round(clamp(width * 3.7, 2300, 5200));
    for (let i = 0; i < moving; i++) {
      const x = -width * 0.03 + rng() * width * 1.06;
      const y = duneSurface(x) + Math.pow(rng(), 1.85) * 30 - (rng() < 0.07 ? rng() * 4 : 0);
      if (y >= height) continue;
      surfaceGrains.push(newGrain(x, y, rng, true));
    }

    windGrains = [];
    lastWordIndex = -1;
    wordParticles = [];
    pointer.active = false;
    lastTime = 0;
  }

  function trackPointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.touch = event.pointerType === 'touch';
    pointer.strength = event.buttons ? 1.2 : 1;
  }
  window.addEventListener('pointermove', trackPointer, { passive: true });
  window.addEventListener('pointerdown', trackPointer, { passive: true });
  window.addEventListener('pointerup', () => { if (pointer.touch) pointer.active = false; }, { passive: true });
  window.addEventListener('pointercancel', () => { pointer.active = false; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('blur', () => { pointer.active = false; lastTime = 0; });

  const paintGrain = (grain, x, y) => {
    const c = grain.shade;
    ctx.fillStyle = `rgba(${c},${c},${c},${grain.alpha})`;
    ctx.fillRect(x, y, grain.size, grain.size);
  };

  function frame(time) {
    requestAnimationFrame(frame);
    const elapsed = lastTime ? Math.max(0, (time - lastTime) / 1000) : 0;
    const dt = Math.min(elapsed, 0.04);
    lastTime = time;
    // Use real elapsed time for the five-second wind cadence; keep a separate
    // clamped delta for grain physics on slower devices.
    sceneTime += Math.min(elapsed, 0.20);
    ctx.clearRect(0, 0, width, height);
    if (baseCanvas) ctx.drawImage(baseCanvas, 0, 0, width, height);

    const active = pointer.active &&
      pointer.x > -20 && pointer.x < width + 20 &&
      Math.abs(pointer.y - duneSurface(pointer.x)) < 120;

    // Every five seconds a small, smooth gust sweeps over the entire dune.
    // It builds and fades instead of blasting sand upward.
    const gustPhase = sceneTime % GUST_SECONDS;
    const gustPosition = (gustPhase - 0.18) / 2.8;
    const gust = gustPosition > 0 && gustPosition < 1
      ? Math.pow(Math.sin(Math.PI * gustPosition), 1.65)
      : 0;

    windDelay -= dt;
    if (windDelay <= 0 && windGrains.length < 170) {
      windDelay = gust > 0.07 ? 0.038 + rand() * 0.060 : 0.46 + rand() * 0.8;
      const x = width * (0.06 + rand() * 0.88);
      windGrains.push({
        x,
        y: duneSurface(x) - rand() * (2 + gust * 5),
        vx: 10 + rand() * 12 + gust * (24 + rand() * 22),
        vy: -1.8 - rand() * 3.5 - gust * (2 + rand() * 5),
        life: 0,
        maxLife: 2.8 + rand() * 2.7,
        size: 0.38 + rand() * 0.64,
        shade: 79 + rand() * 95
      });
    }

    for (const grain of surfaceGrains) {
      const ax = grain.x + grain.dx - pointer.x;
      const ay = grain.y + grain.dy - pointer.y;
      const rr = ax * ax + ay * ay;
      if (active && rr < 110 * 110) {
        const dist = Math.max(1, Math.sqrt(rr));
        const weight = Math.pow(1 - dist / 110, 2);
        const force = 405 * weight * pointer.strength;
        grain.vx += (ax / dist * force + 16 * weight) * dt;
        grain.vy += (ay / dist * force - 140 * weight) * dt;
      }
      // Barely lift the exposed top-layer grains as the breeze passes.
      if (grain.y - duneSurface(grain.x) < 5 && gust > 0) {
        grain.vx += gust * 9 * dt;
        grain.vy -= gust * 3.0 * dt;
      }
      const spring = 9.5;
      const friction = Math.exp(-5.4 * dt);
      grain.vx = (grain.vx - spring * grain.dx * dt) * friction;
      grain.vy = (grain.vy - spring * grain.dy * dt) * friction;
      grain.dx = clamp(grain.dx + grain.vx * dt, -42, 42);
      grain.dy = clamp(grain.dy + grain.vy * dt, -46, 38);
      if (!active && grain.y - duneSurface(grain.x) < 2.8) {
        grain.dx += 0.012 * dt;
      }
      paintGrain(grain, grain.x + grain.dx, grain.y + grain.dy);
    }

    for (let i = windGrains.length - 1; i >= 0; i--) {
      const g = windGrains[i];
      g.life += dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt + Math.sin(g.life * 2.1 + i) * dt * 1.05;
      const opacity = Math.pow(Math.max(0, 1 - g.life / g.maxLife), 2) * 0.58;
      const c = Math.round(g.shade);
      ctx.fillStyle = `rgba(${c},${c},${c},${opacity})`;
      ctx.fillRect(g.x, g.y, g.size, g.size);
      if (g.life >= g.maxLife) windGrains.splice(i, 1);
    }

    drawSandWords();
  }

  // Convert actual rendered glyph pixels into thousands of discrete gray sand
  // grains. They originate on the dune; the lettering is never a flat overlay.
  function createWordParticles(word, index) {
    const rng = randomGenerator(70019 + index * 9187);
    const fontCanvas = document.createElement('canvas');
    const g = fontCanvas.getContext('2d', { willReadFrequently: true });
    if (!g) return [];

    let fontSize = clamp(Math.min(width * 0.105, height * 0.091), 52, 100);
    const fontFamily = 'Georgia, "Times New Roman", serif';
    const available = Math.max(140, width * 0.84);
    const configureFont = () => { g.font = `bold ${fontSize}px ${fontFamily}`; };
    configureFont();
    while (g.measureText(word).width > available && fontSize > 24) {
      fontSize -= 1;
      configureFont();
    }

    const labelWidth = g.measureText(word).width;
    fontCanvas.width = Math.ceil(labelWidth + fontSize * 0.46);
    fontCanvas.height = Math.ceil(fontSize * 1.75);
    configureFont();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.fillText(word, fontCanvas.width / 2, fontCanvas.height * 0.50);
    const pixels = g.getImageData(0, 0, fontCanvas.width, fontCanvas.height);

    const candidates = [];
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const alpha = pixels.data[(y * pixels.width + x) * 4 + 3];
        const density = width < 500 ? 0.74 : 0.59;
        if (alpha > 85 && rng() < density * alpha / 255) candidates.push([x, y]);
      }
    }
    // Distribute points fairly: don't starve large words or crowd small ones.
    const limit = width < 500 ? 2900 : width < 900 ? 4900 : 8500;
    if (candidates.length > limit) {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      candidates.length = limit;
    }

    // Place letters above the dune, leaving the existing wheel undisturbed.
    const targetCenterY = duneSurface(width * 0.5) - clamp(height * 0.137, 98, 185);
    const left = (width - fontCanvas.width) * 0.5;
    const top = targetCenterY - fontCanvas.height * 0.5;

    return candidates.map(([x, y]) => {
      const tx = left + x + (rng() - 0.5) * 1.1;
      const ty = top + y + (rng() - 0.5) * 1.1;
      const sx = clamp(tx + (rng() - 0.5) * (width < 500 ? 150 : 300), 0, width);
      const sy = duneSurface(sx) + rng() * 12;
      return {
        tx, ty, sx, sy,
        delay: rng() * 1.05,
        travel: 1.85 + rng() * 0.46,
        exitDelay: rng() * 0.56,
        arc: 14 + rng() * 32,
        swirl: (rng() - 0.5) * 52,
        drift: 35 + rng() * 90,
        wave: rng() * Math.PI * 2,
        grainSize: 0.77 + rng() * 0.71,
        color: Math.floor(rng() * GRAIN_PALETTE.length),
        opacity: 0.84 + rng() * 0.16
      };
    });
  }

  const smooth = (t) => {
    const v = clamp(t, 0, 1);
    return v * v * (3 - 2 * v);
  };

  function drawSandWords() {
    const wordIndex = Math.floor(sceneTime / WORD_SECONDS) % WORDS.length;
    if (wordIndex !== lastWordIndex) {
      lastWordIndex = wordIndex;
      wordParticles = createWordParticles(WORDS[wordIndex], wordIndex);
    }
    const phase = sceneTime % WORD_SECONDS;
    const exitStart = 5.15;
    const exitDuration = 2.75;

    // Batch particles by shade: fewer canvas state changes, mobile friendly.
    const buckets = Array.from({ length: GRAIN_PALETTE.length }, () => []);
    for (const p of wordParticles) {
      const arrival = smooth((phase - p.delay) / p.travel);
      if (arrival <= 0) continue;
      const exit = smooth((phase - exitStart - p.exitDelay) / exitDuration);
      if (exit >= 1) continue;

      // Sand rises from the crest, curls naturally, and condenses into letters.
      const bow = Math.sin(Math.PI * arrival);
      const x = lerp(p.sx, p.tx, arrival) + p.swirl * bow
        + exit * (p.drift + Math.sin(phase * 1.2 + p.wave) * 8);
      const y = lerp(p.sy, p.ty, arrival) - bow * p.arc
        + exit * exit * (duneSurface(clamp(x, 0, width)) - p.ty) * 0.72;
      const wobble = Math.sin(phase * 1.4 + p.wave) * 0.26 * arrival * (1 - exit);
      const alpha = (0.18 + arrival * 0.82) * (1 - exit) * p.opacity;
      if (alpha <= 0.035) continue;

      buckets[p.color].push([x + wobble, y, p.grainSize, alpha]);
    }

    for (let shade = 0; shade < buckets.length; shade++) {
      ctx.fillStyle = GRAIN_PALETTE[shade];
      for (const [x, y, size, alpha] of buckets[shade]) {
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, size, size * 0.9);
      }
    }
    ctx.globalAlpha = 1;
  }

  rebuild();
  let resizeHandle = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeHandle);
    resizeHandle = requestAnimationFrame(rebuild);
  }, { passive: true });
  requestAnimationFrame(frame);
})();
