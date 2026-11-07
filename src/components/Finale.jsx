import { CONTACT } from '../data';
import { Split, Btn } from './ui';

export default function Finale() {
  return (
    <footer className="finale" aria-labelledby="finale-h">
      <div className="finale__glow" aria-hidden="true" />
      <div className="wrap">
        <Split as="h2" id="finale-h" className="finale__title" text="YOUR BODY.|YOUR MOVEMENT.|YOUR *EVOLUTION.*" />
        <div className="finale__cta" data-reveal><Btn to="trial" cursor="Begin">Begin Your Journey</Btn></div>
      </div>
      <div className="wrap finale__foot">
        <span>© {new Date().getFullYear()} {CONTACT.name} · EC Road, Dehradun</span>
        <span><a href={CONTACT.phoneHref}>{CONTACT.phone}</a> · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></span>
      </div>
    </footer>
  );
}
