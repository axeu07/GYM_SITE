import { Split, Chevrons } from './ui';
import { Ecg } from './Figures';

const POINTS = [
  ['Certified trainers', 'Qualified coaches who teach with precision and care, whatever your level.'],
  ['Personalised plans', 'Workout plans shaped around your body, your goals and your pace.'],
  ['Guided, every step', 'Hands-on exercise guidance and continuous support, session after session.'],
];

export default function Coaching() {
  return (
    <section className="coach" id="coaching" aria-labelledby="coach-h">
      <div className="wrap coach__grid">
        <div className="coach__panel" aria-hidden="true">
          <span className="coach__pulse" />
          <Ecg />
        </div>
        <div className="coach__copy">
          <p className="eyebrow" data-reveal><Chevrons /> Expert Coaching</p>
          <Split as="h2" id="coach-h" className="display" text="Coached to your *own* rhythm." />
          <ol className="coach__list">
            {POINTS.map(([t, d], i) => (
              <li key={t} data-reveal>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{t}</h3><p>{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
