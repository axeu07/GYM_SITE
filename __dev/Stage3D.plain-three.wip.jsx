import { useEffect, useRef } from 'react';
import { smooth, whenKicked, settleStudio } from '../lib/stage';
import { loadStage } from '../lib/chunks';

// The camera path lives here (it is the part of the 3D scene that gets art-directed); the scene itself is
// plain three.js in ../three/stage3d.js, which is handed `sample` when it boots.
// Camera path through the story, in scroll units (u = viewport heights scrolled).
// pos/tg are in metres; sx/sy shift the machine within the frame (so it sits beside the text);
// dim fades the whole studio to black as the story hands over to the next chapter.
const KEYS = [
  { u: 0.0, pos: [2.4, 1.3, 3.8], tg: [0.1, 0.3, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 1.0, pos: [1.6, 1.1, 3.0], tg: [0.15, 0.3, 0], fov: 30, sx: 0.14, sy: 0.0, dim: 0 },
  // Scene 1 · Precision: closer, low, on the footbar and the head of the carriage
  { u: 1.8, pos: [1.7, 0.72, 1.45], tg: [0.55, 0.38, 0], fov: 27, sx: 0.2, sy: 0.0, dim: 0 },
  { u: 2.5, pos: [0.7, 0.95, 1.7], tg: [0.1, 0.32, 0], fov: 28, sx: 0.2, sy: 0.0, dim: 0 },
  // Scene 2 · Movement: an orbit from the foot end round to the head end
  { u: 3.2, pos: [0.4, 1.0, 3.1], tg: [0, 0.32, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 3.9, pos: [-1.9, 1.15, 2.7], tg: [-0.1, 0.38, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 4.5, pos: [-2.6, 1.0, 1.3], tg: [-0.25, 0.5, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  // Scene 3 · Balance: lift and pull back so the photograph can take the foreground
  { u: 5.1, pos: [1.0, 2.1, 3.7], tg: [-0.3, 0.2, 0], fov: 32, sx: -0.22, sy: 0.14, dim: 0.35 },
  // Hand-over to Beyond Pilates
  { u: 6.0, pos: [2.2, 3.0, 5.0], tg: [-0.3, 0.1, 0], fov: 34, sx: -0.25, sy: 0.18, dim: 1 },
];

export function sample(u, out) {
  let i = 0;
  while (i < KEYS.length - 2 && u > KEYS[i + 1].u) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = smooth(a.u, b.u, u);
  const l = (x, y) => x + (y - x) * f;
  out.pos.set(l(a.pos[0], b.pos[0]), l(a.pos[1], b.pos[1]), l(a.pos[2], b.pos[2]));
  out.tg.set(l(a.tg[0], b.tg[0]), l(a.tg[1], b.tg[1]), l(a.tg[2], b.tg[2]));
  out.fov = l(a.fov, b.fov); out.sx = l(a.sx, b.sx); out.sy = l(a.sy, b.sy); out.dim = l(a.dim, b.dim);
}


/**
 * Fixed, full-viewport, pointer-transparent host for the 3D studio (three/stage3d.js).
 * It boots when the opening says so (see `kickStudio`), warms itself up in small idle slices, and reports
 * through `settleStudio` when it can be shown without a single stalled frame. The scene is plain three.js:
 * React renders only this <div>, so nothing here ever re-renders while the scene animates.
 */
export default function Stage3D() {
  const host = useRef(null);

  useEffect(() => {
    let dead = false, ctl = null;
    const small = innerWidth < 760;
    const off = whenKicked(async () => {
      try {
        const mod = await loadStage();
        if (dead) return;
        ctl = mod.createStage3D(host.current, { small, sample });
        await ctl.ready;
        if (dead) return;
        settleStudio(true);
      } catch (err) {
        console.warn('[stage] 3D studio unavailable, using the illustrated version', err);
        settleStudio(false);
      }
    });
    // The opening's iris is about to reveal the studio: from now on it draws every frame.
    const wake = () => ctl?.wake();
    window.addEventListener('atf:iris', wake);
    return () => { dead = true; off(); window.removeEventListener('atf:iris', wake); ctl?.destroyNow(); };
  }, []);

  return <div className="stage" ref={host} aria-hidden="true" />;
}
