import { useState } from 'react';
import { CONTACT, PROGRAMS } from '../data';
import { Split, Btn, Chevrons } from './ui';

const INTERESTS = ['Not sure yet', ...PROGRAMS, 'Boxing', 'Aerial Hoop / Lyra'];

export default function Trial() {
  const [f, setF] = useState({ name: '', phone: '', interest: INTERESTS[0], note: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const message = () =>
    `Hello AT FITNESS, I would like to book a free trial session.\nName: ${f.name}\nPhone: ${f.phone}\nInterested in: ${f.interest}${f.note ? `\nNote: ${f.note}` : ''}`;

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Please enter your name.';
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Please enter a valid phone number.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
    setSent(true);
  };

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Free trial session enquiry')}&body=${encodeURIComponent(message())}`;

  return (
    <section className="trial" id="trial" aria-labelledby="trial-h">
      <div className="trial__glow" aria-hidden="true" />
      <div className="wrap trial__grid">
        <div className="trial__copy">
          <p className="eyebrow" data-reveal><Chevrons /> Your First Session</p>
          <Split as="h2" id="trial-h" className="display" text="Step inside.|The first session|is *on us.*" />
          <p data-reveal>
            Come and experience AT FITNESS first-hand. Tell us a little about yourself and our team will get in
            touch to arrange your free trial session. Beginners are warmly welcome.
          </p>
          <p className="trial__alt" data-reveal>
            Prefer to talk? <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
          </p>
        </div>

        <form className="form" onSubmit={submit} noValidate data-reveal>
          <div className="field">
            <input id="t-name" name="name" autoComplete="name" placeholder=" " value={f.name} onChange={set('name')}
              aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} required />
            <label htmlFor="t-name">Your name</label>
            {errors.name && <p className="field__err" id="e-name" role="alert">{errors.name}</p>}
          </div>
          <div className="field">
            <input id="t-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder=" " value={f.phone} onChange={set('phone')}
              aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'e-phone' : undefined} required />
            <label htmlFor="t-phone">Phone number</label>
            {errors.phone && <p className="field__err" id="e-phone" role="alert">{errors.phone}</p>}
          </div>
          <div className="field field--select">
            <select id="t-int" value={f.interest} onChange={set('interest')}>
              {INTERESTS.map((i) => <option key={i}>{i}</option>)}
            </select>
            <label htmlFor="t-int">I am interested in</label>
          </div>
          <div className="field">
            <textarea id="t-note" rows="2" placeholder=" " value={f.note} onChange={set('note')} />
            <label htmlFor="t-note">Anything we should know? (optional)</label>
          </div>
          <div className="form__actions">
            <Btn type="submit" cursor="Send">Request via WhatsApp</Btn>
            <Btn href={mailto} variant="ghost">Email instead</Btn>
          </div>
          <p className="form__note" role="status" aria-live="polite">
            {sent ? 'WhatsApp should have opened with your details. If it did not, use Email instead or call us.' : 'Your details are sent straight to AT FITNESS. Nothing is stored on this site.'}
          </p>
        </form>
      </div>
    </section>
  );
}
