import { useEffect, useRef } from 'react';
import { gsap, prefersReduced } from '../lib/scroll';
import { stage, carriageAt, smooth, clamp } from '../lib/stage';

// Lightweight alternative to the 3D studio for phones on data-saver / low memory, reduced-motion users
// and browsers without WebGL. A single gold line-drawing of the Reformer (side elevation) whose carriage
// is driven by the same scroll position as the 3D version. No three.js download at all.

const springPath = (x0, x1, y) => {
  const n = 16, amp = 9;
  let d = `M${x0} ${y}`;
  for (let i = 1; i <= n; i++) d += ` L${(x0 + ((x1 - x0) * (i - 0.5)) / n).toFixed(1)} ${y + (i % 2 ? -amp : amp)}`;
  return `${d} L${x1} ${y}`;
};

export default function ReformerFallback() {
  const wrap = useRef(null);
  const car = useRef(null);
  const spr = useRef(null);
  const rope = useRef(null);
  const reduced = useRef(prefersReduced());

  useEffect(() => {
    const draw = (time) => {
      const u = stage.u;
      const c = reduced.current ? 0.5 : carriageAt(u, time);
      const dx = -250 * c;
      car.current.setAttribute('transform', `translate(${dx} 0)`);
      spr.current.setAttribute('d', springPath(655 + dx, 800, 252));
      rope.current.setAttribute('d', `M172 70 L${250 + 120 * c} ${178 - 30 * c}`);
      // pose by scroll: hero (right), story (left/centre), then away
      const e = smooth(0.2, 1.4, u), away = smooth(5.3, 5.9, u);
      const el = wrap.current;
      el.style.opacity = String(clamp(stage.alpha * (1 - away)));
      el.style.transform = `translate3d(${(1 - e) * 8 - e * 4}vw, ${(1 - e) * 6 - e * 4}vh, 0) scale(${1 + e * 0.22})`;
    };
    if (reduced.current) { draw(0); const on = () => draw(0); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }
    const tick = () => draw(gsap.ticker.time);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="fb" ref={wrap} aria-hidden="true">
      <svg viewBox="0 0 1000 420" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="500" cy="392" rx="420" ry="14" className="fb__floor" />
        {/* frame */}
        <path d="M110 300 H890 M110 300 V340 M890 300 V340 M150 300 V362 M850 300 V362" strokeWidth="3" />
        <path d="M130 286 H870" strokeWidth="1.5" opacity="0.6" />
        {/* standing platform + footbar */}
        <rect x="850" y="268" width="62" height="14" rx="5" strokeWidth="2" />
        <path d="M806 282 V150 M806 150 H770" strokeWidth="5" />
        {/* head-end pulley tower and rope */}
        <path d="M130 300 V60 M130 60 H196" strokeWidth="4" />
        <circle cx="172" cy="70" r="12" strokeWidth="2" />
        <path ref={rope} strokeWidth="1.8" />
        <circle cx="250" cy="178" r="10" strokeWidth="2" />
        {/* springs */}
        <path ref={spr} strokeWidth="1.5" />
        {/* moving carriage */}
        <g ref={car}>
          <rect x="210" y="250" width="445" height="22" rx="9" strokeWidth="3" />
          <rect x="222" y="226" width="400" height="24" rx="12" strokeWidth="2" className="fb__pad" />
          <rect x="226" y="198" width="86" height="28" rx="12" strokeWidth="2" />
          <rect x="316" y="184" width="26" height="42" rx="9" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
