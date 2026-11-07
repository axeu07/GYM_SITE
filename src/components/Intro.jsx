import { Split, Chevrons } from './ui';
import { PROGRAMS } from '../data';

export default function Intro() {
  return (
    <>
      <section className="intro" id="intro">
        <span className="intro__ghost" aria-hidden="true" data-parallax="0.12">AT</span>
        <div className="wrap">
          <p className="eyebrow" data-reveal><Chevrons /> The Studio</p>
          <Split as="h2" className="display intro__title"
            text="A *destination* for strength,|movement and wellness|in the heart of Dehradun." />
          <div className="intro__cols">
            <p data-reveal>
              AT FITNESS is a premium, multi-discipline fitness and wellness studio on EC Road. Reformer Pilates,
              boxing, aerial hoop, functional and strength training, all under one warmly lit roof.
            </p>
            <p data-reveal data-delay="0.12">
              Beginners and seasoned athletes are equally welcome. Certified trainers, personalised plans and
              continuous support meet you exactly where you are.
            </p>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[0, 1].map((k) => (
            <ul key={k}>{PROGRAMS.map((p) => <li key={p + k}>{p}</li>)}</ul>
          ))}
        </div>
      </div>
    </>
  );
}
