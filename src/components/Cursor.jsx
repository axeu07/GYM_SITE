import { useEffect, useRef } from 'react';
import { gsap, prefersReduced } from '../lib/scroll';

/**
 * A precise gold dot plus a lagging ring. The ring swells over links, and turns into a labelled
 * bubble over anything that carries data-cursor and isn't already a link/button (e.g. the photo frame).
 */
export default function Cursor() {
  const ring = useRef(null);
  const dot = useRef(null);

  useEffect(() => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches || prefersReduced()) return undefined;
    const r = ring.current, d = dot.current;
    const root = document.documentElement;
    root.classList.add('has-cursor');
    gsap.set([r, d], { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(r, 'x', { duration: 0.45, ease: 'power3.out' });
    const ry = gsap.quickTo(r, 'y', { duration: 0.45, ease: 'power3.out' });
    const dx = gsap.quickTo(d, 'x', { duration: 0.08, ease: 'none' });
    const dy = gsap.quickTo(d, 'y', { duration: 0.08, ease: 'none' });
    const label = r.firstChild;

    const move = (e) => {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      r.classList.add('is-on'); d.classList.add('is-on');
    };
    const over = (e) => {
      const t = e.target.closest?.('a,button,summary,select,[data-cursor]');
      const isCtl = !!e.target.closest?.('a,button,summary,select');
      const tag = !isCtl && t?.dataset.cursor;
      r.classList.toggle('is-link', isCtl);
      r.classList.toggle('is-label', !!tag);
      d.classList.toggle('is-hide', !!tag || isCtl);
      label.textContent = tag || '';
    };
    const down = () => r.classList.add('is-down');
    const up = () => r.classList.remove('is-down');
    const leave = () => { r.classList.remove('is-on'); d.classList.remove('is-on'); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.addEventListener('pointerover', over);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      root.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={ring} aria-hidden="true"><span className="cursor__label" /></div>
      <div className="cursor-dot" ref={dot} aria-hidden="true" />
    </>
  );
}
