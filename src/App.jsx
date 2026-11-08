import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, initScroll, prefersReduced } from './lib/scroll';
import { stage, want3D, introSeen, webglOK, fireReveal } from './lib/stage';
import { initReveals } from './lib/reveals';
import Entrance from './components/Entrance';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Story from './components/Story';
import Beyond from './components/Beyond';
import Intro from './components/Intro';
import Gallery from './components/Gallery';
import Coaching from './components/Coaching';
import Trial from './components/Trial';
import Faq from './components/Faq';
import Contact from './components/Contact';
import Finale from './components/Finale';
import ReformerFallback from './components/ReformerFallback';

// The 3D studio is its own chunk. It starts downloading immediately (behind the intro) on capable
// devices, and is never requested on data-saver / low-memory phones or with reduced motion.
const wantGL = want3D();
const loadStage = () => import('./components/Stage3D');
const Stage3D = lazy(loadStage);
if (wantGL) loadStage();

export default function App() {
  const [play] = useState(() => !prefersReduced() && !introSeen() && webglOK());
  // The Pilates studio mounts once the opening is lit (so the two scenes never compile shaders at the same time).
  const [stageOn, setStageOn] = useState(() => !play);
  const root = useRef(null);
  // The opening tells Hero (which subscribes to this signal itself) that its copy may start revealing.
  const onReveal = useCallback(() => fireReveal(), []);

  useEffect(() => {
    if (stageOn) return undefined;
    const on = () => setStageOn(true);
    window.addEventListener('atf:intro-lit', on, { once: true });
    const t = setTimeout(on, 12000);   // never wait forever
    return () => { window.removeEventListener('atf:intro-lit', on); clearTimeout(t); };
  }, [stageOn]);

  useEffect(() => initScroll(), []);

  // The 3D camera and the fallback both read the page's scroll position in viewport heights.
  useEffect(() => {
    const on = () => { stage.u = window.scrollY / window.innerHeight; };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => initReveals(), root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    return () => window.removeEventListener('load', refresh);
  }, []);

  return (
    <>
      <a className="skip" href="#story">Skip to content</a>
      <Entrance play={play} onReveal={onReveal} />
      {wantGL ? (stageOn ? <Suspense fallback={null}><Stage3D /></Suspense> : null) : <ReformerFallback />}
      <Cursor />
      <Nav />
      <div ref={root}>
        <main>
          <Hero gl={wantGL} />
          <Story gl={wantGL} />
          <div className="after">
            <Beyond />
            <Intro />
            <Gallery />
            <Coaching />
            <Trial />
            <Faq />
            <Contact />
          </div>
        </main>
        <Finale />
      </div>
    </>
  );
}
