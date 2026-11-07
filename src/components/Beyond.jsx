import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, prefersReduced } from '../lib/scroll';
import { PHOTOS, CHAPTERS } from '../data';
import { FIGURES } from './Figures';
import { createAerial, POSE } from '../lib/aerial';
import { Photo } from './ui';

/** The stylised aerial performer (same rig as the intro) held in her final pose. A stand-in until real footage exists. */
function SilkArt() {
  const cv = useRef(null);
  useEffect(() => {
    const a = createAerial(cv.current);
    Object.assign(a.s, POSE.final, { py: 1.05, light: 1, glow: 0.4 });
    a.renderOnce();
    const onResize = () => a.renderOnce();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); a.destroy(); };
  }, []);
  return <canvas ref={cv} className="chap__cv" aria-label="Stylised aerial silk performer" role="img" />;
}

function Art({ c }) {
  if (c.art === 'silk') return <SilkArt />;
  if (c.art === 'photo') return <Photo photo={PHOTOS[c.photo]} pos={c.pos} />;
  if (c.art === 'contain') {
    const p = PHOTOS[c.photo];
    return (
      <div className="frame frame--contain">
        <img className="frame__bg" src={p.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img className="frame__fg" src={p.src} alt={p.alt} loading="lazy" decoding="async" />
      </div>
    );
  }
  const F = FIGURES[c.fig];
  return <div className="chap__fig" aria-hidden="true"><F playing /></div>;
}

/**
 * Scene IV · Beyond Pilates. Desktop: a pinned sequence; each discipline is a chapter that wipes in over
 * the last. Phones and reduced motion: the same chapters as a plain stacked list.
 */
export default function Beyond() {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (prefersReduced()) return undefined;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      root.current.classList.add('is-pinned');
      const n = CHAPTERS.length;
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, pin: true, scrub: 0.7, start: 'top top', end: `+=${(n - 1) * 90}%`, anticipatePin: 1 }, defaults: { ease: 'none' } });
      const slides = gsap.utils.toArray('.chap__art-i');
      const texts = gsap.utils.toArray('.chap__txt');
      const nums = gsap.utils.toArray('.beyond__idx li');
      const inner = (s) => s.querySelector('img, canvas, .chap__fig');
      gsap.set(slides, { clipPath: (i) => (i ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 0% 0%)'), zIndex: (i) => i + 1 });
      gsap.set(slides.map(inner), { scale: (i) => (i ? 1.25 : 1) });
      gsap.set(texts, { opacity: (i) => (i ? 0 : 1), y: (i) => (i ? 50 : 0) });
      gsap.set(nums, { opacity: (i) => (i ? 0.35 : 1) });
      for (let i = 1; i < n; i++) {
        const at = i - 1 + 0.15;
        tl.to(texts[i - 1], { opacity: 0, y: -50, duration: 0.35, ease: 'power2.in' }, at)
          .to(slides[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut' }, at)
          .to(inner(slides[i]), { scale: 1, duration: 0.9, ease: 'power2.out' }, at)
          .to(texts[i], { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at + 0.4)
          .to(nums[i - 1], { opacity: 0.35, duration: 0.2 }, at)
          .to(nums[i], { opacity: 1, duration: 0.2 }, at + 0.2);
      }
      tl.to({}, { duration: 0.25 });   // a beat of stillness on the last chapter
      return () => root.current && root.current.classList.remove('is-pinned');
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="beyond" id="beyond" ref={root} aria-labelledby="beyond-h">
      <div className="beyond__in">
        <header className="beyond__head">
          <p className="eyebrow">IV · Beyond Pilates</p>
          <h2 id="beyond-h" className="beyond__title">Five more ways to <em>move.</em></h2>
        </header>

        <div className="beyond__stage">
          <div className="chap__texts">
            {CHAPTERS.map((c, i) => (
              <article className="chap__txt" key={c.title}>
                <span className="chap__no">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="chap__h">{c.title}</h3>
                <p className="chap__p">{c.sub}</p>
              </article>
            ))}
          </div>
          <div className="chap__arch" data-cursor="Discover">
            {CHAPTERS.map((c) => (
              <div className="chap__art-i" key={c.title} role="group" aria-label={c.title}><Art c={c} /></div>
            ))}
          </div>
        </div>
        <ol className="beyond__idx" aria-hidden="true">
          {CHAPTERS.map((c, i) => <li key={c.title}><span>{String(i + 1).padStart(2, '0')}</span>{c.title}</li>)}
        </ol>
      </div>
    </section>
  );
}
