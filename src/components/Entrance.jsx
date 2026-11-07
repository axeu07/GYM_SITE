import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/scroll';
import { stage, markIntroSeen } from '../lib/stage';

/**
 * The cinematic opening (~10s, skippable, once per session): a real, skinned 3D performer in a real
 * WebGL studio (src/three/aerial3d.js). Nothing here is a photograph.
 *  1. Dark studio. A narrow champagne spotlight finds the silks hanging from the ceiling rig.
 *  2. The spot opens; the performer is revealed holding the silks and begins to descend, hand over
 *     hand, moving through passé, straddle and a final lifted pose. The camera cranes down with her.
 *  3. The AT FITNESS wordmark appears on the wall behind her, with a light sweep.
 *  4. Hold, then the scene opens, iris-style, onto the 3D Pilates studio.
 */
export default function Entrance({ play, onReveal }) {
  const root = useRef(null);
  const cv = useRef(null);
  const cb = useRef(onReveal);
  cb.current = onReveal;

  useLayoutEffect(() => {
    // Returning visitor / reduced motion / no WebGL: no intro. The studio simply lights up in place.
    if (!play) {
      const tw = gsap.fromTo(stage, { alpha: 0 }, { alpha: 1, duration: 1.8, ease: 'power2.inOut' });
      cb.current();
      return () => tw.kill();
    }

    const html = document.documentElement;
    markIntroSeen();
    html.classList.add('intro-on');
    const el = root.current;
    let aerial = null, ctx = null;
    let done = false, skipped = false, dead = false, main = null, outTl = null;

    const setIris = (r) => {
      const m = r >= 1.5 ? 'none' : `radial-gradient(circle at 50% 46%, transparent ${r * 100}vmax, #000 ${r * 100 + 0.6}vmax)`;
      el.style.webkitMaskImage = m; el.style.maskImage = m;
    };

    const introEnd = () => window.dispatchEvent(new Event('atf:intro-end'));   // wakes the idle 3D studio
    const finish = () => {
      if (done) return;
      done = true;
      introEnd();
      detach();
      aerial?.destroy(); aerial = null;
      html.classList.remove('intro-on');
      el.style.display = 'none';
    };

    const exit = (fast) => {
      if (outTl) return;
      introEnd();
      const k = fast ? 0.45 : 0.6;
      const iris = { r: 0 };
      outTl = gsap.timeline({ onComplete: finish });
      outTl
        .to('.ent__brand, .ent__skip', { opacity: 0, y: -14, duration: 0.55 * k, ease: 'power2.in' }, 0)
        .to(stage, { alpha: 1, duration: 1.7, ease: 'power2.inOut' }, 0.1 * k)
        .to(iris, { r: 1.5, duration: 1.5 * k + 0.2, ease: 'power3.inOut', onUpdate: () => setIris(iris.r) }, 0.35 * k)
        .to(el, { opacity: 0, duration: 0.5 * k, ease: 'none' }, 1.3 * k + 0.1)
        .call(() => cb.current(), null, 0.9 * k);
      if (aerial) outTl.to(aerial.cam, { dist: '-=0.5', duration: 1.4 * k + 0.4, ease: 'power2.inOut' }, 0);
    };

    // Anything that looks like "let me in" skips.
    const skip = () => {
      if (skipped || done) return;
      skipped = true;
      main?.kill();
      exit(true);
    };
    const onKey = (e) => { if (['Escape', ' ', 'Enter', 'ArrowDown', 'PageDown'].includes(e.key)) skip(); };
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchmove', skip, { passive: true });
    window.addEventListener('keydown', onKey);
    function detach() {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchmove', skip);
      window.removeEventListener('keydown', onKey);
    }
    el.__skip = skip;

    gsap.set('.ent__line', { scaleX: 0 });
    gsap.set('.ent__mark, .ent__tag, .ent__loc, .ent__skip', { opacity: 0 });

    // If the 3D performer cannot be built in time, never trap the visitor behind a black screen.
    let loaded = false;
    const bail = () => { if (done) return; console.warn('[intro] bailing out of the intro'); window.dispatchEvent(new Event('atf:intro-lit')); stage.alpha = 1; main?.kill(); outTl?.kill(); cb.current(); finish(); };
    const loadGuard = setTimeout(() => { if (!loaded && !window.__introHold) bail(); }, 12000);

    (async () => {
      try {
        await document.fonts?.load("300 220px 'Cormorant Garamond'").catch(() => {});
        const mod = await import('../three/aerial3d');
        if (dead) return;
        const small = innerWidth < 760 || matchMedia('(pointer:coarse)').matches;
        aerial = mod.createAerial3D(cv.current, { small });
        aerial.resize();
        await aerial.load();
        loaded = true;
        clearTimeout(loadGuard);
        if (dead) return;
      } catch (err) {
        console.warn('[intro] 3D performer unavailable, skipping intro', err);
        bail();
        return;
      }

      const { s, cam, pose, POSES } = aerial;
      const GRIP0 = 7.05, GRIP1 = 2.5;

      ctx = gsap.context(() => {
        // initial state: a dark room, camera looking up at the ceiling rig
        Object.assign(s, { beam: 0, key: 0, cone: 0.035, vis: 0, follow: 0, word: 0, sweep: -0.3, fade: 1, glow: 0, grip: GRIP0 });
        Object.assign(cam, { ty: 6.05, dist: 7.6, az: -0.26, el: 0.06, fov: 34, shift: -0.9, drift: 1 });
        Object.assign(pose, POSES.hang);
        aerial.gripStart = GRIP0;

        const blend = (name, at, dur, ease = 'sine.inOut') => main.to(pose, { ...POSES[name], duration: dur, ease }, at);

        main = gsap.timeline({ paused: true, onComplete: () => exit(false) });
        main
          // 1. lights up: a narrow champagne beam on the rope and rig
          .to(s, { fade: 0, duration: 0.9, ease: 'power1.out' }, 0)
          .to(s, { key: 1, beam: 0.9, duration: 1.4, ease: 'power2.out' }, 0.25)
          .to('.ent__skip', { opacity: 1, duration: 0.4 }, 0.5)
          // 2. the spot opens and finds her; she descends while the camera cranes down with her
          .to(s, { cone: 0.15, duration: 1.4, ease: 'power2.inOut' }, 1.5)
          .to(s, { vis: 1, duration: 1.5, ease: 'power2.inOut' }, 1.6)
          .to(s, { cone: 0.23, duration: 2.2, ease: 'power1.inOut' }, 4.6)
          .to(s, { follow: 1, duration: 1.6, ease: 'power2.inOut' }, 1.9)
          .to(s, { grip: GRIP1, duration: 5.4, ease: 'power1.inOut' }, 1.9)
          // the camera tracks her down (same easing as the descent, so she stays fully in frame), then settles
          .to(cam, { ty: 1.85, duration: 5.4, ease: 'power1.inOut' }, 1.9)
          .to(cam, { dist: 6.4, az: 0.12, el: -0.02, duration: 2.6, ease: 'power2.inOut' }, 1.6)
          .to(cam, { dist: 4.7, az: -0.12, el: 0.03, fov: 30, shift: -0.75, duration: 3.6, ease: 'power2.inOut' }, 4.0);
        // choreography: passé, straddle, other passé, final lifted pose (blends between rigged poses)
        blend('passe', 2.5, 1.1); blend('straddle', 3.8, 1.2); blend('passeR', 5.1, 1.0); blend('final', 6.2, 1.3, 'power2.inOut');
        main
          // 3. the brand appears on the wall behind her, then a sweep of light crosses it
          .to(s, { word: 1, duration: 2.2, ease: 'power2.inOut' }, 4.1)
          .to(s, { sweep: 1.3, duration: 1.6, ease: 'power1.inOut' }, 6.0)
          .to(s, { glow: 1, duration: 1.2 }, 6.2)
          .to('.ent__line', { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }, 6.2)
          .to('.ent__mark, .ent__tag', { opacity: 1, duration: 0.6 }, 6.4)
          .to('.ent__loc', { opacity: 1, duration: 0.6 }, 6.7)
          .to(s, { beam: 0.55, duration: 1.2 }, 7.4)
          .to({}, { duration: 1.6 }, 7.2);   // hold the final pose
      });

      gsap.to('.ent__load', { animation: 'none', opacity: 0, duration: 0.5, onComplete: () => { const l = el.querySelector('.ent__load'); if (l) l.style.display = 'none'; } });
      el.__tl = main; el.__aerial = aerial;
      aerial.renderOnce();
      aerial.start();
      if (skipped) return;
      window.dispatchEvent(new Event('atf:intro-lit'));   // now the Pilates studio may start loading behind us
      if (!window.__introHold) main.play();   // (the hold flag only exists for automated frame-by-frame review)
    })();

    // Absolute safety net: a stuck intro must never trap the visitor.
    const guard = setTimeout(() => { if (!window.__introHold) bail(); }, 30000);

    return () => {
      dead = true;
      clearTimeout(guard); clearTimeout(loadGuard); detach(); main?.kill(); outTl?.kill(); ctx?.revert(); aerial?.destroy();
      html.classList.remove('intro-on');
    };
  }, [play]);

  if (!play) return null;
  return (
    <div className="ent" ref={root}>
      <canvas className="ent__cv" data-full="1" ref={cv} aria-hidden="true" />
      <svg className="ent__load" viewBox="0 0 64 64" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M14 40 32 18l18 22M22 48l10-12 10 12" />
      </svg>
      <div className="ent__brand" aria-hidden="true">
        <svg className="ent__mark" viewBox="0 0 64 64" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 40 32 18l18 22M22 48l10-12 10 12" />
        </svg>
        <span className="ent__line" />
        <p className="ent__tag">Strength in every movement.</p>
        <span className="ent__loc">EC Road · Dehradun</span>
      </div>
      <button type="button" className="ent__skip" onClick={() => root.current?.__skip?.()}>Skip intro</button>
    </div>
  );
}
