import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/scroll';
import { PHOTOS } from '../data';
import { Split, Photo, Chevrons } from './ui';

// Each real photograph appears here once; the hero already uses the boxing studio.
const FRAMES = [
  { photo: 'pilates', cls: 'g-arch', cap: 'Reformer Pilates' },
  { photo: 'aerial', cls: 'g-arch g-big', cap: 'Aerial hoop' },
  { photo: 'suspension', cls: 'g-small', cap: 'Suspension training' },
];

export default function Gallery() {
  const root = useRef(null);
  const track = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      root.current.classList.add('is-h');
      const dist = () => Math.max(0, track.current.scrollWidth - innerWidth);
      gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: root.current, pin: true, scrub: 0.6, start: 'top top', end: () => `+=${dist()}`, invalidateOnRefresh: true },
      });
      return () => root.current && root.current.classList.remove('is-h');
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="gal" id="inside" ref={root} aria-labelledby="gal-h">
      <div className="gal__pin">
        <div className="gal__track" ref={track} tabIndex={0} aria-label="Photographs of the AT FITNESS studio, scrollable">
          <div className="gal__intro">
            <p className="eyebrow"><Chevrons /> Inside AT FITNESS</p>
            <Split as="h2" id="gal-h" manual className="display" text="Light, *warm* as the work." />
            <p>Golden curved walls, mirrored floors, premium wood and a black ceiling that lets the light do the talking.</p>
          </div>
          {FRAMES.map((f, i) => (
            <figure key={i} className={`gal__frame ${f.cls}`} data-tilt>
              <div className="gal__img"><Photo photo={PHOTOS[f.photo]} /></div>
              <figcaption><span>{String(i + 1).padStart(2, '0')}</span> {f.cap}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
