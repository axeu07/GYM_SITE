import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { stage, carriageAt, smooth, clamp, STORY } from '../lib/stage';
import { buildReformer } from '../three/reformer';
import { buildStudio, buildEnvironment } from '../three/studio';
import { loadPerson } from '../three/person';

// Camera path through the story, in scroll units (u = viewport heights scrolled).
// pos/tg are in metres; sx/sy shift the machine within the frame (so it sits beside the text);
// dim fades the whole studio to black as the story hands over to the next chapter.
const KEYS = [
  { u: 0.0, pos: [2.4, 1.3, 3.8], tg: [0.1, 0.3, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 1.0, pos: [1.6, 1.1, 3.0], tg: [0.15, 0.3, 0], fov: 30, sx: 0.14, sy: 0.0, dim: 0 },
  // Scene 1 · Precision: closer, low, on the footbar and the head of the carriage
  { u: 1.8, pos: [1.7, 0.72, 1.45], tg: [0.55, 0.38, 0], fov: 27, sx: 0.2, sy: 0.0, dim: 0 },
  { u: 2.5, pos: [0.7, 0.95, 1.7], tg: [0.1, 0.32, 0], fov: 28, sx: 0.2, sy: 0.0, dim: 0 },
  // Scene 2 · Movement: an orbit from the foot end round to the head end
  { u: 3.2, pos: [0.4, 1.0, 3.1], tg: [0, 0.32, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 3.9, pos: [-1.9, 1.15, 2.7], tg: [-0.1, 0.38, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  { u: 4.5, pos: [-2.6, 1.0, 1.3], tg: [-0.25, 0.5, 0], fov: 30, sx: 0.17, sy: 0.0, dim: 0 },
  // Scene 3 · Balance: lift and pull back so the photograph can take the foreground
  { u: 5.1, pos: [1.0, 2.1, 3.7], tg: [-0.3, 0.2, 0], fov: 32, sx: -0.22, sy: 0.14, dim: 0.35 },
  // Hand-over to Beyond Pilates
  { u: 6.0, pos: [2.2, 3.0, 5.0], tg: [-0.3, 0.1, 0], fov: 34, sx: -0.25, sy: 0.18, dim: 1 },
];

const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _v = new THREE.Vector3(), _ray = new THREE.Raycaster();

function sample(u, out) {
  let i = 0;
  while (i < KEYS.length - 2 && u > KEYS[i + 1].u) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = smooth(a.u, b.u, u);
  const l = (x, y) => x + (y - x) * f;
  out.pos.set(l(a.pos[0], b.pos[0]), l(a.pos[1], b.pos[1]), l(a.pos[2], b.pos[2]));
  out.tg.set(l(a.tg[0], b.tg[0]), l(a.tg[1], b.tg[1]), l(a.tg[2], b.tg[2]));
  out.fov = l(a.fov, b.fov); out.sx = l(a.sx, b.sx); out.sy = l(a.sy, b.sy); out.dim = l(a.dim, b.dim);
}

function Studio({ small }) {
  const { gl, scene, camera, size } = useThree();
  const rt = useMemo(() => buildEnvironment(gl), [gl]);
  const studio = useMemo(() => buildStudio({ small }), [small]);
  const reformer = useMemo(() => buildReformer({ small }), [small]);
  const holder = useRef(null);
  const [person, setPerson] = useState(null);
  const rig = useMemo(() => ({ pos: new THREE.Vector3(), tg: new THREE.Vector3(), fov: 30, sx: 0, sy: 0, dim: 0, su: 0, sm: { x: 0, y: 0 }, hover: null, tick: 0, hots: null, tip: -1 }), []);

  useEffect(() => {
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.95;
    scene.fog = new THREE.FogExp2('#0b0907', 0.05);
    scene.background = new THREE.Color('#0b0907');
    return () => { scene.environment = null; scene.fog = null; };
  }, [scene, rt]);

  // Compile every shader up front (hidden) so the reveal never hitches.
  useEffect(() => {
    let dead = false;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const done = () => { if (dead) return; stage.glReady = true; window.dispatchEvent(new Event('atf:gl')); };
    const job = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
    job.then(done, done);
    return () => { dead = true; };
  }, [gl, scene, camera]);

  useEffect(() => () => { rt.dispose(); studio.dispose(); reformer.dispose(); }, [rt, studio, reformer]);

  // The rider: loaded alongside the studio, posed from the same extension value as the carriage.
  useEffect(() => {
    let dead = false, p = null;
    loadPerson({ small }).then((r) => { if (dead) r.dispose(); else { p = r; if (import.meta.env.DEV) window.__person = r; setPerson(r); } }).catch((e) => console.warn('person failed', e));
    return () => { dead = true; p?.dispose(); };
  }, [small]);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const W = size.width, H = size.height, aspect = W / H;
    const portrait = aspect < 1.05;

    // damped scroll + pointer
    rig.su += (stage.u - rig.su) * Math.min(1, dt * 5);
    const u = rig.su;
    rig.sm.x += (stage.mx - rig.sm.x) * Math.min(1, dt * 3);
    rig.sm.y += (stage.my - rig.sm.y) * Math.min(1, dt * 3);

    sample(u, rig);
    _p.copy(rig.pos); _t.copy(rig.tg);

    // Slow orbit while the hero is on screen, plus a breath of drift all the time.
    const idle = 1 - smooth(0.5, 1.1, u);
    const ang = Math.sin(time * 0.13) * 0.2 * idle + rig.sm.x * 0.1;
    _v.copy(_p).sub(_t);
    _v.applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang);
    _v.y += Math.sin(time * 0.21) * 0.05 - rig.sm.y * 0.08;
    // Phones: pull back so the long machine fits the narrow frame, and lift it above the copy.
    const k = portrait ? 1.55 : 1;
    _p.copy(_t).addScaledVector(_v, k);
    camera.position.copy(_p);
    camera.lookAt(_t);
    camera.fov = rig.fov + (portrait ? 8 : 0);
    const sx = portrait ? 0 : rig.sx, sy = portrait ? rig.sy + 0.17 : rig.sy;
    camera.setViewOffset(W, H, -sx * W, sy * H, W, H);
    camera.updateProjectionMatrix();

    // The machine answers the cursor, subtly.
    holder.current.rotation.y = rig.sm.x * 0.1 + (portrait ? 0.35 : 0);
    holder.current.rotation.z = -rig.sm.y * 0.012;

    // Carriage + rider: one extension value drives both
    let c = carriageAt(u, time);
    const dbg = import.meta.env.DEV ? window.__atf : null;
    if (dbg) {
      if (dbg.c != null) c = dbg.c;
      if (dbg.cam) { camera.position.set(...dbg.cam.pos); camera.lookAt(...dbg.cam.tg); camera.fov = dbg.cam.fov ?? 30; camera.clearViewOffset(); camera.updateProjectionMatrix(); holder.current.rotation.set(0, 0, 0); }
      stage.alpha = 1;
    }
    const grips = person ? person.update(c, time) : null;
    reformer.update(c, time, grips);

    // Hover: raycast against a handful of invisible proxy boxes.
    rig.tick++;
    if (stage.moved && !stage.overUI && rig.tick % 3 === 0 && u < STORY.end - 0.3) {
      _ray.setFromCamera(_v.set(stage.mx, -stage.my, 0), camera);
      const hit = _ray.intersectObjects(reformer.proxies, false)[0];
      const name = hit ? hit.object.userData.part : null;
      if (name !== rig.hover) { rig.hover = name; stage.hover = name; window.dispatchEvent(new CustomEvent('atf:part', { detail: name })); }
    } else if (stage.overUI && rig.hover) {
      rig.hover = null; stage.hover = null; window.dispatchEvent(new CustomEvent('atf:part', { detail: null }));
    }
    reformer.ease(rig.hover, dt);

    // Lighting breathes slightly; the whole room fades up after the intro and out as the story ends.
    studio.key.intensity = 95 * (0.92 + 0.08 * Math.sin(time * 0.5));
    const fade = stage.alpha * (1 - rig.dim);
    if (!rig.wrap) rig.wrap = gl.domElement.closest('.stage');
    const wrapEl = rig.wrap;
    if (wrapEl) wrapEl.style.opacity = String(clamp(fade));
    gl.toneMappingExposure = 1.05;

    // DOM labels pinned to parts of the machine (scene 2)
    const hot = smooth(2.95, 3.3, u) * (1 - smooth(4.4, 4.75, u));
    stage.hot = hot;
    if (!rig.hots) rig.hots = [...document.querySelectorAll('[data-hot]')];
    for (const el of rig.hots) {
      if (!el.isConnected) { rig.hots = null; break; }
      if (hot < 0.01) { if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'; continue; }
      const a = reformer.anchors[el.dataset.hot];
      _v.copy(a); holder.current.localToWorld(_v); _v.project(camera);
      const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
      el.style.visibility = 'visible'; el.style.opacity = String(hot);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });

  return (
    <group ref={holder}>
      <primitive object={studio.group} />
      <primitive object={reformer.root} />
      {person && <primitive object={person.root} />}
    </group>
  );
}

/** Fixed, full-viewport, pointer-transparent canvas carrying the 3D studio. */
export default function Stage3D() {
  const small = typeof innerWidth !== 'undefined' && innerWidth < 760;
  const [on, setOn] = useState(true);

  useEffect(() => {
    // While the 3D opening (its own WebGL scene) plays full-screen on top, this studio sits idle instead of
    // rendering unseen. Entrance fires `atf:intro-end` as the reveal begins.
    let tab = true, scrolled = true, intro = document.documentElement.classList.contains('intro-on');
    const apply = () => setOn(tab && scrolled && !intro);
    const introEnd = () => { intro = false; apply(); };
    window.addEventListener('atf:intro-end', introEnd);
    apply();
    const move = (e) => {
      stage.mx = (e.clientX / innerWidth) * 2 - 1;
      stage.my = (e.clientY / innerHeight) * 2 - 1;
      stage.moved = true;
      stage.overUI = !!e.target.closest?.('a, button, input, select, textarea, summary, [data-nohover]');
    };
    const vis = () => { tab = !document.hidden; apply(); };
    const sc = () => {
      const s = scrollY / innerHeight < STORY.end + 0.4;
      if (s !== scrolled) { scrolled = s; apply(); }
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', sc, { passive: true });
    document.addEventListener('visibilitychange', vis);
    sc();
    return () => { window.removeEventListener('atf:intro-end', introEnd); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', sc); document.removeEventListener('visibilitychange', vis); };
  }, []);

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={small ? 1 : [1, 1.75]}
        shadows
        frameloop={on ? 'always' : 'never'}
        gl={{ antialias: !small, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ position: [2.4, 1.3, 3.8], fov: 30, near: 0.1, far: 40 }}
      >
        <Studio small={small} />
      </Canvas>
    </div>
  );
}
