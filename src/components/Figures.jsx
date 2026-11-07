import { useEffect, useRef } from 'react';

// Live, looping SVG illustrations (SMIL), one per discipline. Fully vector, so they stay crisp and tiny.
const EASE = '0.45 0 0.55 1';
const splines = (n) => Array(n - 1).fill(EASE).join(';');

function A({ a = 'd', v, dur = 2.6, kt, type }) {
  const n = v.length;
  const keyTimes = kt || v.map((_, i) => (i / (n - 1)).toFixed(3)).join(';');
  const common = { dur: `${dur}s`, repeatCount: 'indefinite', calcMode: 'spline', keyTimes, keySplines: splines(n), values: v.join(';') };
  return type ? <animateTransform attributeName="transform" type={type} {...common} /> : <animate attributeName={a} {...common} />;
}

export function Fig({ children, playing = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg?.pauseAnimations) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (playing && !reduced) svg.unpauseAnimations(); else svg.pauseAnimations();
  }, [playing]);
  return (
    <svg ref={ref} className="fig" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="figglow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#ffb54f" stopOpacity="0.28" /><stop offset="1" stopColor="#ffb54f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#figglow)" />
      <line className="fl" x1="50" y1="360" x2="350" y2="360" />
      {children}
    </svg>
  );
}

const Dumbbell = ({ x, y, dx, dy, dur }) => (
  <g className="eq" transform={`translate(${x} ${y})`}>
    <g>
      <A type="translate" v={['0 0', `${dx} ${dy}`, '0 0']} dur={dur} />
      <line x1="-16" y1="0" x2="16" y2="0" strokeWidth="6" />
      <rect x="-24" y="-12" width="9" height="24" rx="3" className="fill" />
      <rect x="15" y="-12" width="9" height="24" rx="3" className="fill" />
    </g>
  </g>
);

export function Lifter() {
  const d = 2.6;
  return (
    <Fig>
      <circle className="hd" cx="200" cy="98" r="24" />
      <path className="bd" d="M200 128 L200 238 M150 142 L250 142 M200 238 L176 356 M200 238 L224 356" />
      <path className="bd" d="M150 142 L116 192 L128 142"><A v={['M150 142 L116 192 L128 142', 'M150 142 L132 94 L138 40', 'M150 142 L116 192 L128 142']} dur={d} /></path>
      <path className="bd" d="M250 142 L284 192 L272 142"><A v={['M250 142 L284 192 L272 142', 'M250 142 L268 94 L262 40', 'M250 142 L284 192 L272 142']} dur={d} /></path>
      <Dumbbell x={128} y={142} dx={10} dy={-102} dur={d} />
      <Dumbbell x={272} y={142} dx={-10} dy={-102} dur={d} />
    </Fig>
  );
}

export function Pilates() {
  const d = 3.2;
  const legs = ['M170 262 L248 249 L326 236', 'M240 262 L264 187 L326 236', 'M170 262 L248 249 L326 236'];
  return (
    <Fig>
      <g transform="translate(190 262) scale(1.1) translate(-190 -270)">
      <path className="eq" d="M30 300 H350 M50 300 V356 M330 300 V356 M326 300 V236 M314 236 H338" />
      <g>
        <A type="translate" v={['0 0', '70 0', '0 0']} dur={d} />
        <rect className="fill eq" x="60" y="274" width="150" height="12" rx="6" />
        <path className="bd" d="M92 262 L170 262 M104 266 L162 270" />
        <circle className="hd" cx="72" cy="256" r="16" />
      </g>
      <path className="bd" d={legs[0]}><A v={legs} dur={d} /></path>
      </g>
    </Fig>
  );
}

export function Boxer() {
  const d = 1.8;
  const arm = ['M130 148 L158 188 L178 142', 'M130 148 L196 152 L258 150', 'M130 148 L158 188 L178 142', 'M130 148 L158 188 L178 142'];
  const kt = '0;0.18;0.38;1';
  return (
    <Fig>
      <circle className="hd" cx="125" cy="105" r="22" />
      <path className="bd" d="M128 130 L118 232 M118 232 L92 356 M118 232 L160 356 M126 148 L146 190 L160 150" />
      <circle className="eq fill" cx="160" cy="148" r="12" />
      <path className="bd" d={arm[0]}><A v={arm} dur={d} kt={kt} /></path>
      <circle className="eq fill" cx="178" cy="142" r="14"><A a="cx" v={[178, 258, 178, 178]} dur={d} kt={kt} /><A a="cy" v={[142, 150, 142, 142]} dur={d} kt={kt} /></circle>
      <g>
        <A type="rotate" v={['0 330 0', '0 330 0', '8 330 0', '-3 330 0', '0 330 0']} dur={d} kt="0;0.18;0.42;0.7;1" />
        <line className="eq" x1="330" y1="0" x2="330" y2="72" />
        <rect className="eq" x="306" y="72" width="48" height="170" rx="16" fill="rgba(184,151,90,.35)" />
      </g>
    </Fig>
  );
}

export function Hoop() {
  const leg2 = ['M200 150 L228 112 L212 62', 'M200 150 L216 104 L212 62', 'M200 150 L228 112 L212 62'];
  const arm = ['M200 222 L170 262', 'M200 222 L232 256', 'M200 222 L170 262'];
  return (
    <Fig>
      <g>
        <A type="rotate" v={['-7 200 20', '7 200 20', '-7 200 20']} dur={4.2} />
        <line className="eq" x1="200" y1="20" x2="200" y2="60" />
        <circle className="eq" cx="200" cy="150" r="90" strokeWidth="6" />
        <path className="bd" d="M200 150 L186 108 L190 62 M200 150 L200 222" />
        <path className="bd" d={leg2[0]}><A v={leg2} dur={4.2} /></path>
        <path className="bd" d={arm[0]}><A v={arm} dur={4.2} /></path>
        <circle className="hd" cx="200" cy="248" r="17" />
      </g>
    </Fig>
  );
}

export function Squat() {
  const d = 2.8;
  const L = ['M200 355 L204 282 L200 208', 'M200 355 L250 295 L178 290', 'M200 355 L204 282 L200 208'];
  const T = ['M200 208 L200 120', 'M178 290 L160 205', 'M200 208 L200 120'];
  const Ar = ['M200 124 L258 136', 'M160 208 L226 206', 'M200 124 L258 136'];
  const S1 = ['M262 20 L258 136', 'M262 20 L226 206', 'M262 20 L258 136'];
  const S2 = ['M238 20 L254 140', 'M238 20 L222 210', 'M238 20 L254 140'];
  return (
    <Fig>
      <path className="eq" d="M120 20 H300" />
      <path className="eq thin" d={S1[0]}><A v={S1} dur={d} /></path>
      <path className="eq thin" d={S2[0]}><A v={S2} dur={d} /></path>
      <path className="bd" d={L[0]}><A v={L} dur={d} /></path>
      <path className="bd" d={T[0]}><A v={T} dur={d} /></path>
      <path className="bd" d={Ar[0]}><A v={Ar} dur={d} /></path>
      <circle className="hd" cx="200" cy="92" r="22"><A a="cx" v={[200, 150, 200]} dur={d} /><A a="cy" v={[92, 178, 92]} dur={d} /></circle>
    </Fig>
  );
}

export function Jump() {
  const d = 0.9;
  return (
    <Fig>
      <ellipse className="sh" cx="200" cy="360" rx="50" ry="6"><A a="rx" v={[50, 36, 50]} dur={d} /></ellipse>
      <g>
        <A type="translate" v={['0 0', '0 -26', '0 0']} dur={d} />
        <ellipse className="eq" cx="200" cy="215" rx="50" ry="150" fill="none"><A a="ry" v={[150, 14, 150]} dur={d * 2} /></ellipse>
        <circle className="hd" cx="200" cy="85" r="23" />
        <path className="bd" d="M200 112 L200 225 M170 140 L230 140 M170 140 L150 215 M230 140 L250 215 M200 225 L186 335 M200 225 L214 335" />
      </g>
    </Fig>
  );
}

export function Stretch() {
  return (
    <Fig>
      <path className="bd" d="M200 250 L160 356 M200 250 L240 356" />
      <g>
        <A type="rotate" v={['-24 200 250', '24 200 250', '-24 200 250']} dur={4} />
        <circle className="hd" cx="200" cy="112" r="22" />
        <path className="bd" d="M200 250 L200 140 M194 150 L176 90 L196 50 M206 150 L224 90 L204 50" />
      </g>
    </Fig>
  );
}

export const FIGURES = { pilates: Pilates, boxer: Boxer, hoop: Hoop, squat: Squat, lifter: Lifter, jump: Jump, stretch: Stretch };

export function Ecg() {
  return (
    <svg className="ecg" viewBox="0 0 600 130" aria-hidden="true" focusable="false">
      <path d="M0 65 H120 L140 65 L160 22 L185 108 L205 65 H300 L320 65 L340 16 L365 112 L385 65 H600" />
    </svg>
  );
}
