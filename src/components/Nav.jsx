import { useEffect, useRef, useState } from 'react';
import { scrollToId, lockScroll, unlockScroll } from '../lib/scroll';
import { NAV, CONTACT } from '../data';
import { Btn } from './ui';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const first = useRef(null);
  const toggle = useRef(null);

  useEffect(() => {
    let last = scrollY;
    const on = () => {
      const y = scrollY;
      setSolid(y > 60);
      if (Math.abs(y - last) > 6) { setHidden(y > 520 && y > last); last = y; }
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (open) { lockScroll(); first.current?.focus(); } else unlockScroll();
    const key = (e) => { if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => scrollToId(id), open ? 650 : 0);
  };

  return (
    <>
      <header className={`nav ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''} ${hidden && !open ? 'is-hidden' : ''}`}>
        <a className="nav__logo" href="#top" onClick={go('top')} aria-label="AT FITNESS, back to top">
          AT<span>·</span>FITNESS
        </a>
        <div className="nav__right">
          <span className="nav__cta"><Btn to="trial" variant="ghost" cursor="Book">Free Trial</Btn></span>
          <button ref={toggle} className="nav__toggle" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)} data-cursor={open ? 'Close' : 'Menu'}>
            <span className="nav__toggle-text">{open ? 'Close' : 'Menu'}</span>
            <span className="nav__burger" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </header>

      <nav id="menu" className={`menu ${open ? 'is-open' : ''}`} aria-label="Main" inert={!open}>
        <ul>
          {NAV.map(([id, label], i) => (
            <li key={id} style={{ '--i': i }}>
              <a ref={i === 0 ? first : null} href={`#${id}`} onClick={go(id)}>
                <small>0{i + 1}</small><span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="menu__foot">
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <span>EC Road, Dehradun</span>
        </div>
      </nav>
    </>
  );
}
