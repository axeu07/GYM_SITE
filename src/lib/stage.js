// Shared, mutable state between the DOM (GSAP / ScrollTrigger) and the 3D studio.
// GSAP writes plain values here; the R3F scene reads them every frame. No React re-renders.
export const stage = {
  alpha: 0,       // 0 = unlit/invisible → 1 = fully lit (fades the studio in after the intro)
  u: 0,           // scroll position measured in viewport heights (0 = top of page)
  mx: 0,          // pointer, -1..1
  my: 0,
  glReady: false, // set once the studio's shaders are compiled
  hot: 0,         // 0..1 visibility of the part labels (scene 2)
  moved: false,   // true once the pointer has actually moved (no phantom hover at 0,0)
  overUI: false,  // pointer is over a link/button: don't hover-highlight the machine
  hover: null,    // currently hovered machine part (string) or null
};

/** Scroll story timeline in "viewport units" (u). Shared by the 3D rig, the text and the fallback. */
export const STORY = { start: 1, end: 6 };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Carriage extension 0..1 for a scroll position: slow idle breathing, then scroll-driven in scene 2. */
export function carriageAt(u, time = 0) {
  const idle = 0.5 - 0.5 * Math.cos(time * 0.55);
  const w = smooth(2.55, 2.95, u) * (1 - smooth(4.3, 4.6, u));
  const k = (u - 2.7) / 1.7;                 // 0..1 across scene 2
  const driven = 0.5 - 0.5 * Math.cos(clamp(k) * Math.PI * 3);   // 1.5 slow, controlled strokes
  return idle * (1 - w) * 0.55 + driven * w;
}

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Whether to download the 3D studio at all. Phones on a data-saver, or with little memory, get the
 * lightweight illustrated alternative instead of the three.js chunk.
 */
export function want3D() {
  if (typeof window === 'undefined') return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!webglOK()) return false;
  const nav = navigator;
  if (nav.connection?.saveData) return false;
  const small = innerWidth < 760 || matchMedia('(pointer:coarse)').matches;
  if (small && ((nav.deviceMemory && nav.deviceMemory < 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency < 4))) return false;
  return true;
}

const KEY = 'atf-intro-seen';
export const introSeen = () => {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
export const markIntroSeen = () => {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
};

/* ------------------------------------------------------------------ */
/*  Hand-off signals between the opening, the 3D studio and the page.  */
/*  Plain module state + subscriptions: no React re-render of <App>.   */
/* ------------------------------------------------------------------ */

/** The landing copy may start revealing (fired by the opening as its iris opens, or at once without an opening). */
const revealSubs = new Set();
export const reveal = { done: false };
export const subscribeReveal = (f) => { revealSubs.add(f); return () => revealSubs.delete(f); };
export const getRevealed = () => reveal.done;
export function fireReveal() { if (reveal.done) return; reveal.done = true; revealSubs.forEach((f) => f()); }

/**
 * The 3D studio boots in the background (see three/stage3d.js). `studioReady` resolves true once its shaders
 * are compiled and its geometry, textures and shadow maps are on the GPU, so showing it can never stall;
 * false if it could not be built (the page then shows the lightweight illustrated alternative).
 */
export const studio = { kicked: false, ready: false, failed: false };
let settle;
export const studioReady = new Promise((r) => { settle = r; });
const kickSubs = [];
const failSubs = new Set();
export function whenKicked(cb) { if (studio.kicked) { cb(); return () => {}; } kickSubs.push(cb); return () => { const i = kickSubs.indexOf(cb); if (i >= 0) kickSubs.splice(i, 1); }; }
export function kickStudio() { if (studio.kicked) return; studio.kicked = true; kickSubs.splice(0).forEach((f) => f()); }
export function settleStudio(ok) {
  if (ok) studio.ready = true; else { studio.failed = true; failSubs.forEach((f) => f()); }
  settle(ok);
}
export const subscribeStudioFail = (f) => { failSubs.add(f); return () => failSubs.delete(f); };
export const getStudioFailed = () => studio.failed;
