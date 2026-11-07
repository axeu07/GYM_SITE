import { useState } from 'react';
import { FAQS } from '../data';
import { Split, Chevrons } from './ui';

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq" aria-labelledby="faq-h">
      <div className="wrap faq__grid">
        <div>
          <p className="eyebrow" data-reveal><Chevrons /> Questions</p>
          <Split as="h2" id="faq-h" className="display" text="Good to *know.*" />
        </div>
        <div className="faq__list">
          {FAQS.map((x, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq__item ${isOpen ? 'is-open' : ''}`} key={x.q} data-reveal>
                <h3>
                  <button id={`fq-${i}`} aria-expanded={isOpen} aria-controls={`fa-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span>{x.q}</span><i aria-hidden="true" />
                  </button>
                </h3>
                <div className="faq__panel" id={`fa-${i}`} role="region" aria-labelledby={`fq-${i}`}>
                  <div><p>{x.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
