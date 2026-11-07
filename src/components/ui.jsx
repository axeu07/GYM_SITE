import { useEffect, useRef } from 'react';
import { gsap, scrollToId } from '../lib/scroll';

/** Splits text into words for 3D rise animation. "|" = line break, "*word*" = italic gold. */
export function Split({ text, as: Tag = 'span', className = '', manual = false, ...rest }) {
  const label = text.replace(/\|/g, ' ').replace(/\*/g, '');
  let em = false; // emphasis can span several words: "*on us.*"
  return (
    <Tag className={className} aria-label={label} data-split={manual ? 'manual' : 'auto'} {...rest}>
      {text.split('|').map((line, i) => (
        <span className="line" key={i} aria-hidden="true">
          {line.split(' ').map((raw, j) => {
            if (raw.startsWith('*')) em = true;
            const word = raw.replace(/\*/g, '');
            const isEm = em;
            if (raw.endsWith('*')) em = false;
            return (
              <span className="w" key={j}>
                <span className="wi">{isEm ? <em>{word}</em> : word}</span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Pulls its child toward the pointer. Inert on touch and with reduced motion. */
export function Magnetic({ children, strength = 0.32 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const el = ref.current;
    const label = el.querySelector('.btn__label');
    const o = { duration: 0.8, ease: 'elastic.out(1,0.45)' };
    const x = gsap.quickTo(el, 'x', o), y = gsap.quickTo(el, 'y', o);
    // the label drifts a little further than the button: a layered, tactile pull
    const lx = label && gsap.quickTo(label, 'x', o), ly = label && gsap.quickTo(label, 'y', o);
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      x(dx * strength); y(dy * strength);
      if (label) { lx(dx * strength * 0.45); ly(dy * strength * 0.45); }
    };
    const leave = () => { x(0); y(0); if (label) { lx(0); ly(0); } };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return <span className="magnetic" ref={ref}>{children}</span>;
}

/** Button/link. `to` = in-page section id, `href` = external, otherwise a <button>. */
export function Btn({ to, href, variant = 'solid', children, onClick, type, cursor, ...rest }) {
  const cls = `btn btn--${variant}`;
  const inner = <span className="btn__label">{children}</span>;
  let el;
  if (to) {
    el = (
      <a className={cls} href={`#${to}`} data-cursor={cursor} onClick={(e) => { e.preventDefault(); onClick?.(); scrollToId(to); }} {...rest}>{inner}</a>
    );
  } else if (href) {
    el = <a className={cls} href={href} data-cursor={cursor} {...rest}>{inner}</a>;
  } else {
    el = <button className={cls} type={type || 'button'} onClick={onClick} data-cursor={cursor} {...rest}>{inner}</button>;
  }
  return <Magnetic>{el}</Magnetic>;
}

/** Real photograph, optionally re-cropped. */
export function Photo({ photo, pos = '50% 50%', zoom = 1, eager = false, className = '', style }) {
  return (
    <img
      className={className}
      src={photo.src}
      alt={photo.alt}
      width={photo.w}
      height={photo.h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
      style={{ objectPosition: pos, transformOrigin: pos, ...(zoom !== 1 ? { scale: zoom } : null), ...style }}
    />
  );
}

export const Chevrons = ({ className = '' }) => (
  <svg className={`chev ${className}`} viewBox="0 0 24 40" width="18" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M2 10 12 3l10 7M2 20l10-7 10 7M2 30l10-7 10 7" />
  </svg>
);
