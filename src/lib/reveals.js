import { gsap, prefersReduced } from './scroll';

// Global scroll reveals driven by data attributes. Called inside a gsap.context.
export function initReveals() {
  if (prefersReduced()) return;

  // 3D word rise
  gsap.utils.toArray('[data-split="auto"]').forEach((el) => {
    gsap.from(el.querySelectorAll('.wi'), {
      yPercent: 115, rotateX: -75, opacity: 0, transformOrigin: '50% 100%',
      duration: 1.2, ease: 'power4.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 44, opacity: 0, duration: 1.1, ease: 'power3.out',
      delay: Number(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  // Arch / frame image reveal with counter-scaling
  gsap.utils.toArray('[data-mask]').forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    tl.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut' });
    if (img) tl.from(img, { scale: 1.35, duration: 1.8, ease: 'power3.out' }, 0);
  });

  // Scroll-linked parallax
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const s = Number(el.dataset.parallax) * 100;
    gsap.fromTo(el, { yPercent: -s }, {
      yPercent: s, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Subtle 3D tilt on pointer devices
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    gsap.utils.toArray('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 7);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
}
