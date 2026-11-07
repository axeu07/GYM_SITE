// Procedural aerial-silk performer for the entrance.
//
// IMPORTANT: this is a stylised, rigged silhouette, not footage. There is no aerial video in the
// project, so the performer is a 2D skeleton (forward kinematics) lit like a bronze figure under a
// golden spotlight. GSAP tweens the pose object between choreographed keyframes; the renderer draws
// whatever pose it is given. To swap in real footage later, drop a transparent WebM/frame sequence
// into <Entrance> in place of `createAerial()`; nothing else in the page depends on this file.

const D = Math.PI / 180;
const dir = (a) => [Math.sin(a), Math.cos(a)];            // 0 = down, +90° = screen right, 180° = up
const lerp = (a, b, t) => a + (b - a) * t;

// Bone lengths, in "U" units (U ≈ the performer's full height).
const B = { torso: 0.3, neck: 0.04, head: 0.062, arm1: 0.17, arm2: 0.17, thigh: 0.26, shin: 0.25, foot: 0.1, sh: 0.075, hip: 0.05 };

/**
 * Pose parameters (degrees unless noted).
 *  tor   torso direction pelvis→neck (180 = upright, 0 = head-down)
 *  aL1.. arm angles relative to the torso's up direction (+ = swing to the figure's left when upright)
 *  lL1.. leg angles relative to the torso's down direction (+ = swing to the right when upright)
 *  gripL/gripR  1 = that hand holds the silk, 0 = the silk wraps the hips instead
 */
export const POSE = {
  hang:     { px: 0, tor: 180, head: 0, aL1: -8, aL2: -2, aR1: 8, aR2: 2, lL1: -3, lL2: 0, lR1: 3, lR2: 0, gripL: 1, gripR: 1 },
  passe:    { px: 0.02, tor: 174, head: 7, aL1: -10, aL2: -4, aR1: 12, aR2: 6, lL1: -52, lL2: 28, lR1: 2, lR2: 0, gripL: 1, gripR: 1 },
  straddle: { px: 0, tor: 180, head: 8, aL1: 40, aL2: -34, aR1: -40, aR2: 34, lL1: -80, lL2: -84, lR1: 80, lR2: 84, gripL: 1, gripR: 1 },
  invert:   { px: 0, tor: 0, head: -6, aL1: 78, aL2: 70, aR1: -78, aR2: -70, lL1: -34, lL2: -30, lR1: 34, lR2: 30, gripL: 0, gripR: 0 },
  turning:  { px: 0.04, tor: -96, head: 0, aL1: 52, aL2: 34, aR1: -60, aR2: -50, lL1: -64, lL2: -58, lR1: 62, lR2: 56, gripL: 0, gripR: 0 },
  final:    { px: -0.015, tor: -170, head: 11, aL1: 74, aL2: 66, aR1: 5, aR2: 3, lL1: -86, lL2: -90, lR1: 86, lR2: 92, gripL: 0, gripR: 1 },
};

export function createAerial(canvas) {
  const ctx = canvas.getContext('2d');
  // `s` is what GSAP drives. pose numbers are tweened directly on it.
  const s = { ...POSE.hang, py: -0.7, light: 0, silk: 1, glow: 0, t: 0, figure: 1 };
  let W = 0, H = 0, U = 0, dpr = 1, bg = null, raf = 0, last = 0;
  const hair = Array.from({ length: 5 }, () => [0, 0]);
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.03, p: Math.random() * 7, r: 0.5 + Math.random() * 1.4 }));
  let hairReady = false;

  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = W * dpr; bg.height = H * dpr;
    const g = bg.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = '#0a0806'; g.fillRect(0, 0, W, H);
    const wash = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.7);
    wash.addColorStop(0, 'rgba(120,86,44,0.34)'); wash.addColorStop(0.55, 'rgba(60,42,22,0.16)'); wash.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = wash; g.fillRect(0, 0, W, H);
    // Architecture: three concentric arches and a polished floor line. Quiet, but gives the room depth.
    g.lineWidth = 1;
    [0.62, 0.8, 1.0].forEach((k, i) => {
      const w = Math.min(W * 0.92, H * 0.92) * k * 0.62, top = H * (0.1 - i * 0.012), floor = H * 0.84;
      g.strokeStyle = `rgba(227,200,143,${0.2 - i * 0.05})`;
      g.beginPath();
      g.moveTo(W / 2 - w, floor); g.lineTo(W / 2 - w, top + w);
      g.arc(W / 2, top + w, w, Math.PI, 0);
      g.lineTo(W / 2 + w, floor);
      g.stroke();
    });
    const floor = g.createLinearGradient(0, H * 0.84, 0, H);
    floor.addColorStop(0, 'rgba(190,140,70,0.28)'); floor.addColorStop(1, 'rgba(10,8,6,0.0)');
    g.fillStyle = floor; g.fillRect(0, H * 0.84, W, H * 0.16);
    g.strokeStyle = 'rgba(227,200,143,0.22)';
    g.beginPath(); g.moveTo(0, H * 0.84); g.lineTo(W, H * 0.84); g.stroke();
    const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.7)');
    g.fillStyle = vig; g.fillRect(0, 0, W, H);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 2 : 3);   // sharp on 4K / retina
    ctx.imageSmoothingQuality = 'high';
    const full = canvas.dataset.full;
    W = canvas.clientWidth || (full ? innerWidth : 0); H = canvas.clientHeight || (full ? innerHeight : 0);
    if (!W || !H) { bg = null; return; }
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    U = Math.min(H * 0.34, W * 0.66);
    buildBackground();
  }

  // ----- skeleton -----
  function rig() {
    const pv = [s.px * U + W / 2, s.py * U];
    const tor = s.tor * D;
    const up = dir(tor), n = [-Math.cos(tor), Math.sin(tor)];
    const add = (p, v, k) => [p[0] + v[0] * k * U, p[1] + v[1] * k * U];
    const neck = add(pv, up, B.torso);
    const headC = add(neck, dir(tor + s.head * D), B.neck + B.head * 0.85);
    const shL = add(add(neck, n, -B.sh), up, -0.025), shR = add(add(neck, n, B.sh), up, -0.025);
    const hpL = add(pv, n, -B.hip), hpR = add(pv, n, B.hip);
    const arm = (sh, r1, r2) => { const e = add(sh, dir(tor + r1 * D), B.arm1); return [e, add(e, dir(tor + r2 * D), B.arm2)]; };
    const leg = (hp, r1, r2) => {
      const k = add(hp, dir(tor + Math.PI + r1 * D), B.thigh);
      const a = add(k, dir(tor + Math.PI + r2 * D), B.shin);
      return [k, a, add(a, dir(tor + Math.PI + r2 * D + (r2 < 0 ? -0.18 : 0.18)), B.foot)];
    };
    const [eL, hL] = arm(shL, s.aL1, s.aL2), [eR, hR] = arm(shR, s.aR1, s.aR2);
    const [kL, aL, tL] = leg(hpL, s.lL1, s.lL2), [kR, aR, tR] = leg(hpR, s.lR1, s.lR2);
    return { pv, up, n, neck, headC, shL, shR, hpL, hpR, eL, hL, eR, hR, kL, aL, tL, kR, aR, tR, tor };
  }

  // ----- drawing helpers -----
  function limb(a, b, r1, r2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx * r1, a[1] + ny * r1);
    ctx.lineTo(b[0] + nx * r2, b[1] + ny * r2);
    ctx.arc(b[0], b[1], r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
    ctx.lineTo(a[0] - nx * r1, a[1] - ny * r1);
    ctx.arc(a[0], a[1], r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
    ctx.closePath();
    ctx.fill();
  }

  function silkPath(from, sway, t, endY) {
    // From the rigging point, through `from`, then a rippling tail down to the floor.
    const ax = W / 2;
    const dx = from[0] - ax, dy = from[1] + 2 * H;
    const k = Math.max(0.001, dy);
    const tailLen = Math.max(U * 0.35, endY - from[1]);
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const f = i / 28;
      const y = from[1] + tailLen * f;
      const x = from[0] + dx / k * (y - from[1]) * 0.55 + Math.sin(f * 7 + t * 1.8) * U * 0.03 * f * sway + Math.sin(f * 3.2 - t * 1.1) * U * 0.04 * f * f * sway;
      pts.push([x, y]);
    }
    const head = [[ax, -2 * H], [lerp(ax, from[0], 0.5), lerp(-2 * H, from[1], 0.5)], from];
    return { head, tail: pts };
  }

  function ribbon(path, width, colTop, colBot, alpha) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.9);
    g.addColorStop(0, colTop); g.addColorStop(1, colBot);
    ctx.strokeStyle = g; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    path.head.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    path.tail.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw(dt) {
    if (!bg) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
    const L = s.light;
    ctx.globalAlpha = 0.1 + 0.9 * L; ctx.drawImage(bg, 0, 0, W, H); ctx.globalAlpha = 1;

    // Spotlight cone.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cone = ctx.createLinearGradient(0, 0, 0, H * 0.9);
    cone.addColorStop(0, `rgba(255,214,150,${0.34 * L})`); cone.addColorStop(0.6, `rgba(255,190,110,${0.1 * L})`); cone.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(W / 2 - W * 0.018, -4); ctx.lineTo(W / 2 + W * 0.018, -4);
    ctx.lineTo(W / 2 + Math.max(W * 0.2, U * 0.95), H * 0.88); ctx.lineTo(W / 2 - Math.max(W * 0.2, U * 0.95), H * 0.88);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(W / 2, H * 0.86); ctx.scale(1, 0.22);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, U * 1.3);
    pool.addColorStop(0, `rgba(255,196,120,${0.34 * L})`); pool.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = pool; ctx.fillRect(-U * 1.4, -U * 1.4, U * 2.8, U * 2.8);
    ctx.restore();
    // dust motes drifting in the beam
    dust.forEach((d) => {
      d.y -= d.v * dt; if (d.y < 0) { d.y = 1; d.x = Math.random(); }
      const bx = W / 2 + (d.x - 0.5) * (W * 0.04 + d.y * Math.max(W * 0.38, U * 1.9));
      const tw = 0.4 + 0.6 * Math.sin(s.t * 1.3 + d.p);
      ctx.fillStyle = `rgba(255,222,170,${0.5 * L * tw * (0.3 + d.y * 0.7)})`;
      ctx.beginPath(); ctx.arc(bx, d.y * H * 0.88, d.r * dpr * 0.8, 0, 7); ctx.fill();
    });
    ctx.restore();

    if (!s.figure) return;   // scene only (light, arches, dust); a real photo is layered on top by <Entrance>
    const t = s.t;
    const k = rig();
    const sway = 0.5 + 0.5 * Math.min(1, Math.abs(Math.sin(t * 0.9)));
    const wrapPt = [k.pv[0], k.pv[1] - 0.02 * U];

    // Silk (behind the body).
    const holdL = [lerp(wrapPt[0], k.hL[0], s.gripL), lerp(wrapPt[1], k.hL[1], s.gripL)];
    const holdR = [lerp(wrapPt[0], k.hR[0], s.gripR), lerp(wrapPt[1], k.hR[1], s.gripR)];
    const floorY = H * 0.84;
    const pL = silkPath([holdL[0] - U * 0.015, holdL[1]], sway, t, floorY);
    const pR = silkPath([holdR[0] + U * 0.015, holdR[1]], sway, t + 0.6, floorY);
    if (s.silk > 0) {
      ctx.save();
      ctx.globalAlpha = s.silk;
      [pL, pR].forEach((p, i) => {
        ribbon(p, U * 0.05, `rgba(255,236,200,${0.5 + 0.4 * L})`, 'rgba(150,108,58,0.5)', 0.3);
        ribbon(p, U * 0.02, `rgba(255,246,226,${0.65 * L + 0.2})`, i ? 'rgba(210,170,110,0.75)' : 'rgba(224,186,126,0.75)', 0.95);
      });
      ctx.restore();
    }

    // Body, lit from above: a bronze gradient that keeps its direction however she turns.
    const ys = [k.pv[1], k.headC[1], k.hL[1], k.hR[1], k.tL[1], k.tR[1]];
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const body = ctx.createLinearGradient(0, y0 - U * 0.1, 0, y1 + U * 0.05);
    body.addColorStop(0, `rgb(${Math.round(140 + 105 * L)},${Math.round(104 + 96 * L)},${Math.round(64 + 70 * L)})`);
    body.addColorStop(0.55, `rgb(${Math.round(96 + 66 * L)},${Math.round(68 + 48 * L)},${Math.round(40 + 28 * L)})`);
    body.addColorStop(1, `rgb(${Math.round(60 + 30 * L)},${Math.round(42 + 22 * L)},${Math.round(24 + 12 * L)})`);
    ctx.fillStyle = body;

    // legs
    // thigh (full, tapering), calf (muscle belly then slim ankle), pointed foot
    const leg = (hp, kn, an, to) => {
      limb(hp, kn, U * 0.058, U * 0.034);
      limb(kn, an, U * 0.034, U * 0.016);
      const mid = [lerp(kn[0], an[0], 0.3), lerp(kn[1], an[1], 0.3)];
      limb(mid, mid, U * 0.03, U * 0.03);          // calf belly
      limb(an, to, U * 0.016, U * 0.005);
      ctx.beginPath(); ctx.arc(kn[0], kn[1], U * 0.034, 0, 7); ctx.fill();
    };
    leg(k.hpL, k.kL, k.aL, k.tL); leg(k.hpR, k.kR, k.aR, k.tR);
    // torso: chest, waist, hips
    const { n, up } = k;
    const P = (base, nn, uu) => [base[0] + n[0] * nn * U + up[0] * uu * U, base[1] + n[1] * nn * U + up[1] * uu * U];
    ctx.beginPath();
    const pts = [P(k.neck, -B.sh * 1.1, -0.02), P(k.pv, -0.062, B.torso * 0.64), P(k.pv, -0.04, B.torso * 0.34), P(k.pv, -0.074, 0.0), P(k.pv, 0.074, 0.0), P(k.pv, 0.04, B.torso * 0.34), P(k.pv, 0.062, B.torso * 0.64), P(k.neck, B.sh * 1.1, -0.02)];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.closePath(); ctx.fill();
    // neck + head
    limb(k.neck, k.headC, U * 0.021, U * 0.02);
    ctx.beginPath(); ctx.ellipse(k.headC[0], k.headC[1], U * 0.046, U * 0.058, k.tor + s.head * D + Math.PI, 0, 7); ctx.fill();
    // arms
    limb(k.shL, k.eL, U * 0.034, U * 0.02); limb(k.eL, k.hL, U * 0.021, U * 0.012);
    limb(k.shR, k.eR, U * 0.034, U * 0.02); limb(k.eR, k.hR, U * 0.021, U * 0.012);
    ctx.beginPath(); ctx.arc(k.hL[0], k.hL[1], U * 0.017, 0, 7); ctx.arc(k.hR[0], k.hR[1], U * 0.017, 0, 7); ctx.fill();

    // ponytail: a short chain that trails the head with a little inertia
    const hs = dir(k.tor + s.head * D + Math.PI);
    const root = [k.headC[0] + hs[0] * U * 0.045 + up[0] * U * 0.02, k.headC[1] + hs[1] * U * 0.045 + up[1] * U * 0.02];
    if (!hairReady) { hair.forEach((h) => { h[0] = root[0]; h[1] = root[1]; }); hairReady = true; }
    let prev = root;
    const seg = U * 0.045;
    hair.forEach((h, i) => {
      const tx = prev[0] + Math.sin(t * 2 + i) * U * 0.004, ty = prev[1] + seg;
      h[0] += (tx - h[0]) * Math.min(1, dt * (9 - i)); h[1] += (ty - h[1]) * Math.min(1, dt * (9 - i));
      const dx = h[0] - prev[0], dy = h[1] - prev[1], l = Math.hypot(dx, dy) || 1;
      h[0] = prev[0] + dx / l * seg; h[1] = prev[1] + dy / l * seg;
      prev = h;
    });
    ctx.strokeStyle = body; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = U * 0.028;
    ctx.beginPath(); ctx.moveTo(root[0], root[1]); hair.forEach((h) => ctx.lineTo(h[0], h[1])); ctx.stroke();

    // Rim light: a thin champagne edge on the lit side of every limb.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const rim = (a, b, w, off) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      let nx = -dy / l, ny = dx / l; if (ny > 0) { nx = -nx; ny = -ny; }   // always toward the light (up)
      ctx.beginPath(); ctx.moveTo(a[0] + nx * off, a[1] + ny * off); ctx.lineTo(b[0] + nx * off, b[1] + ny * off); ctx.lineWidth = w; ctx.stroke();
    };
    ctx.strokeStyle = `rgba(255,226,170,${0.5 * L})`;
    rim(k.hpL, k.kL, U * 0.008, U * 0.04); rim(k.kL, k.aL, U * 0.006, U * 0.026);
    rim(k.hpR, k.kR, U * 0.008, U * 0.04); rim(k.kR, k.aR, U * 0.006, U * 0.026);
    rim(k.shL, k.eL, U * 0.006, U * 0.022); rim(k.eL, k.hL, U * 0.005, U * 0.016);
    rim(k.shR, k.eR, U * 0.006, U * 0.022); rim(k.eR, k.hR, U * 0.005, U * 0.016);
    rim(k.pv, k.neck, U * 0.007, U * 0.052);
    ctx.restore();

    // Silk crossing the hips when she is wrapped in it (front band).
    const wrapA = 1 - (s.gripL + s.gripR) / 2;
    if (wrapA > 0.02 && s.silk > 0) {
      ctx.save();
      ctx.globalAlpha = wrapA * s.silk * 0.9;
      ctx.strokeStyle = 'rgba(244,226,190,0.9)'; ctx.lineWidth = U * 0.03; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(k.hpL[0], k.hpL[1]); ctx.quadraticCurveTo(k.pv[0] + n[0] * 0.02 * U + up[0] * -0.03 * U, k.pv[1] + up[1] * -0.04 * U + 0.03 * U, k.hpR[0], k.hpR[1]); ctx.stroke();
      ctx.restore();
    }

    // A soft bloom over the figure when she lands the final pose.
    if (s.glow > 0.001) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(k.pv[0], k.pv[1], 0, k.pv[0], k.pv[1], U * 1.3);
      gl.addColorStop(0, `rgba(255,205,130,${0.2 * s.glow})`); gl.addColorStop(1, 'rgba(255,205,130,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    s.t += dt;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    s,
    start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    renderOnce() { draw(0.016); },
    destroy() { cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', resize); },
  };
}
