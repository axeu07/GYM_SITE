import { useLayoutEffect, useEffect, useRef } from 'react';
import { gsap, prefersReduced } from '../lib/scroll';
import { Btn } from './ui';

const LINES = [
  { t: 'CONTROLLED', cls: '' },
  { t: 'MOVEMENT.', cls: 'hl__line--gold' },
];

/**
 * Editorial hero set over the 3D studio (the Reformer itself is rendered by Stage3D / the fallback).
 * Everything here reveals the moment the entrance opens, and lifts away as the story begins.
 */
export default function Hero({ ready, gl }) {
  const root = useRef(null);

  // Hidden start state before first paint (skipped for reduced motion).
  useLayoutEffect(() => {
    if (prefersReduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.set('.hl__c', { yPercent: 118, rotate: 6, opacity: 0, transformOrigin: '0% 100%' });
      gsap.set('.hl__pre', { opacity: 0, y: 20 });
      gsap.set('.hero [data-in]', { opacity: 0, y: 26 });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!ready || prefersReduced()) return undefined;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to('.hero .eyebrow', { opacity: 1, y: 0, duration: 1.1 }, 0.2)
        .to('.hl__pre', { opacity: 1, y: 0, duration: 1.2 }, 0.3);
      gsap.utils.toArray('.hl__line').forEach((line, i) => {
        tl.to(line.querySelectorAll('.hl__c'), { yPercent: 0, rotate: 0, opacity: 1, duration: 1.5, stagger: { each: 0.045, from: i ? 'start' : 'edges' } }, 0.45 + i * 0.22)
          .fromTo(line, { letterSpacing: '0.12em' }, { letterSpacing: '-0.01em', duration: 2.1, ease: 'power3.out' }, 0.45 + i * 0.22);
      });
      tl.to('.hero__sub', { opacity: 1, y: 0, duration: 1.2 }, 1.1)
        .to('.hero__cta', { opacity: 1, y: 0, duration: 1.2 }, 1.3)
        .to('.hero__loc, .hero__scroll', { opacity: 1, y: 0, duration: 1 }, 1.7);

      // Scroll: the copy lifts and fades as the camera moves in on the machine.
      gsap.to('.hero__copy', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom 35%', scrub: true } });
    }, root);
    return () => ctx.revert();
  }, [ready]);

  return (
    <section className="hero" id="top" ref={root} aria-label="Introduction">
      <div className="hero__copy">
        <p className="eyebrow hero__loc" data-in>EC Road · Dehradun</p>
        <h1 className="hl" aria-label="The art of controlled movement.">
          <span className="hl__pre" aria-hidden="true">THE ART OF</span>
          {LINES.map((l) => (
            <span className={`hl__line ${l.cls}`} key={l.t} aria-hidden="true">
              {[...l.t].map((ch, i) => <span className="hl__c" key={i}>{ch}</span>)}
            </span>
          ))}
        </h1>
        <p className="hero__sub" data-in>Discover the balance of strength, flexibility and precision at AT FITNESS.</p>
        <div className="hero__cta" data-in>
          <Btn to="trial" cursor="Book">Book Your Free Trial</Btn>
          <Btn to="beyond" variant="ghost">Explore Our Disciplines</Btn>
        </div>
      </div>
      {gl && <p className="hero__hint" data-in aria-hidden="true">Move your cursor to turn the machine</p>}
      <div className="hero__scroll" data-in aria-hidden="true"><span /> Scroll</div>
    </section>
  );
}
