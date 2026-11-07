import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;

export const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initScroll() {
  if (prefersReduced()) return undefined;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t) => lenis && lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis && lenis.destroy();
    lenis = null;
  };
}

export const lockScroll = () => {
  document.documentElement.classList.add('is-locked');
  lenis && lenis.stop();
};
export const unlockScroll = () => {
  document.documentElement.classList.remove('is-locked');
  lenis && lenis.start();
};

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: 'auto' });
  history.replaceState(null, '', `#${id}`);
}

export { gsap, ScrollTrigger };
