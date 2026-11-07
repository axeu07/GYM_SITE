import { CONTACT } from '../data';
import { Split, Btn, Chevrons } from './ui';

export default function Contact() {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-h">
      <div className="wrap contact__grid">
        <div className="contact__info">
          <p className="eyebrow" data-reveal><Chevrons /> Find us</p>
          <Split as="h2" id="contact-h" className="display" text="EC Road,|*Dehradun.*" />
          <address data-reveal>
            {CONTACT.addressLines.map((l) => <span key={l}>{l}</span>)}
          </address>
          <ul className="contact__links" data-reveal>
            <li><small>Call</small><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></li>
            <li><small>Email</small><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
          </ul>
          <div data-reveal><Btn href={CONTACT.mapLink} target="_blank" rel="noopener noreferrer" variant="ghost">Get directions</Btn></div>
        </div>
        <div className="contact__map" data-reveal>
          <iframe title="AT FITNESS location on Google Maps" src={CONTACT.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
}
