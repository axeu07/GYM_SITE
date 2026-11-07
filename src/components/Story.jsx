import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, prefersReduced } from '../lib/scroll';
import { PHOTOS, PART_INFO } from '../data';
import { Btn, Photo } from './ui';

const HOTS = [['carriage', 'Carriage'], ['springs', 'Springs'], ['footbar', 'Footbar'], ['straps', 'Straps']];

/** Names the part of the Reformer under the cursor. Driven by the 3D scene's raycast. */
function PartTip() {
  const [part, setPart] = useState(null);
  const box = useRef(null);
  useEffect(() => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return undefined;
    const qx = gsap.quickTo(box.current, 'x', { duration: 0.35, ease: 'power3.out' });
    const qy = gsap.quickTo(box.current, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e) => { qx(e.clientX + 22); qy(e.clientY + 18); };
    const on = (e) => setPart(e.detail);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('atf:part', on);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('atf:part', on); };
  }, []);
  const info = part && PART_INFO[part];
  return (
    <div className={`tip ${info ? 'is-on' : ''}`} ref={box} aria-hidden="true">
      <b>{info?.title}</b>
      <span>{info?.text}</span>
    </div>
  );
}

/**
 * Scroll story. The section is tall; its inner frame is pinned, and the 3D camera (Stage3D) is driven
 * by the same scroll position. This component only choreographs the words and the photograph.
 *   I Precision · II Movement · III Balance
 */
export default function Story({ gl }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    if (prefersReduced()) return undefined;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 }, defaults: { ease: 'none' } });
      // Timeline length 5 == 5 viewports of scroll. Windows in [from, to].
      const scene = (sel, from, to) => {
        const els = gsap.utils.toArray(`${sel} [data-s]`);
        gsap.set(els, { opacity: 0, y: 46 });
        tl.to(els, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 }, from)
          .to(els, { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in', stagger: 0.03 }, to - 0.3);
      };
      scene('.scene--1', 0.2, 1.75);
      scene('.scene--2', 1.95, 3.5);
      scene('.scene--3', 3.7, 5.0);
      gsap.set('.story__photo', { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set('.story__photo img', { scale: 1.3 });
      tl.to('.story__photo', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut' }, 3.65)
        .to('.story__photo img', { scale: 1, duration: 1.2, ease: 'power2.out' }, 3.65)
        .to('.story__photo', { yPercent: -6, duration: 1.2 }, 3.9)
        .to('.story__photo', { opacity: 0, duration: 0.3 }, 4.7);
      gsap.set('.story__rail i', { scaleY: 0, transformOrigin: 'top' });
      tl.to('.story__rail i', { scaleY: 1, duration: 5, ease: 'none' }, 0);
      gsap.set('.story__rail li', { opacity: 0.35 });
      [0.2, 1.95, 3.7].forEach((at, i) => {
        tl.to(`.story__rail li:nth-child(${i + 1})`, { opacity: 1, duration: 0.2 }, at)
          .to(`.story__rail li:nth-child(${i + 1})`, { opacity: 0.35, duration: 0.2 }, at + 1.35);
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="story" id="story" ref={root} aria-label="Pilates and the Reformer">
      <div className="story__pin">
        <ol className="story__rail" aria-hidden="true">
          <li>I<span>Precision</span></li>
          <li>II<span>Movement</span></li>
          <li>III<span>Balance</span></li>
          <i />
        </ol>

        <article className="scene scene--1">
          <p className="eyebrow" data-s>I · Precision</p>
          <h2 className="scene__h" data-s>Control is where <em>strength</em> begins.</h2>
          <p className="scene__p" data-s>
            Pilates is built on precise, deliberate movement. On the Reformer every exercise asks for focus,
            alignment and breath, so the effort lands exactly where you intend it.
          </p>
        </article>

        <article className="scene scene--2">
          <p className="eyebrow" data-s>II · Movement</p>
          <h2 className="scene__h" data-s>One carriage. <em>Endless</em> ways to move.</h2>
          <p className="scene__p" data-s>
            The carriage glides along its tracks against adjustable spring resistance. Your trainer changes the
            load, the position and the pace, so the same machine can support a first session or an advanced one.
          </p>
          <p className="scene__hint" data-s>{gl ? 'Scroll to draw the carriage. Hover the machine to explore it.' : 'Scroll to draw the carriage.'}</p>
        </article>

        <article className="scene scene--3">
          <p className="eyebrow" data-s>III · Balance</p>
          <h2 className="scene__h" data-s>Guided by <em>hands</em> as much as machines.</h2>
          <p className="scene__p" data-s>
            Our trainers coach you through each exercise with hands-on cues, in a studio designed to feel warm,
            calm and unhurried.
          </p>
          <div data-s><Btn to="trial" cursor="Book">Book Your Free Trial</Btn></div>
        </article>

        <figure className="story__photo" data-cursor="Reformer">
          <Photo photo={PHOTOS.pilates} pos="42% 40%" />
          <figcaption>Reformer Pilates at AT FITNESS</figcaption>
        </figure>

        <div className="hots" aria-hidden="true">
          {HOTS.map(([k, label]) => (
            <span className="hot" data-hot={k} key={k}><i /><b>{label}</b></span>
          ))}
        </div>
      </div>
      {gl && <PartTip />}
    </section>
  );
}
