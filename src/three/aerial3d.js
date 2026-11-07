import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildEnvironment } from './studio';

// The opening: a real, skinned 3D performer descending a pair of aerial silks in a dark studio.
//
//  * The performer is the project's Mixamo-rigged woman (public/models/athlete.glb): a skinned mesh
//    with a full humanoid skeleton including fingers. There is no flat image anywhere in this scene.
//  * Every pose is solved on that skeleton each frame: forward kinematics for spine, head and legs,
//    and two-bone inverse kinematics that plants both hands on their silk strand. The body hangs from
//    the grips like a pendulum (pelvis = grip centre - body-frame "up" * arm+torso length).
//  * GSAP (in Entrance.jsx) blends between named poses by tweening the numbers in `pose`; this file
//    just renders whatever `pose`, `cam` and `fx` currently hold.
//
// World frame: metres, Y up, performer faces +Z (towards the camera), her left is +X.

const HEIGHT = 1.68;
const D = Math.PI / 180;
const SILK_X = 0.1;          // half-spacing of the two strands gripped by the hands
const CEIL = 7.6;            // ceiling rigging height

/** Pose parameters. Angles in degrees, lengths in metres. */
export const POSES = {
  // arrival: body long and slightly arched, legs together, toes pointed
  hang:     { yaw: 0,   pitch: 4,  roll: 0,   L: -0.02, arch: 8,  side: 0,  twist: 0,  headP: -6, headY: 0,
              lf: 6, la: 3, lk: 6, lt: 0, lp: 1,    rf: -4, ra: 3, rk: 4, rt: 0, rp: 1,   elbow: 0.5 },
  // knee drawn up to the chest
  passe:    { yaw: 16,  pitch: 8,  roll: 3,   L: -0.12,  arch: 0,  side: 2,  twist: 6,  headP: -2, headY: -6,
              lf: 84, la: 16, lk: 122, lt: 18, lp: 1, rf: -8, ra: 4, rk: 8, rt: 0, rp: 1,  elbow: 0.7 },
  // open straddle, hips back, chest lifted
  straddle: { yaw: -10, pitch: -2, roll: 0,   L: -0.07, arch: 14, side: 0,  twist: -4, headP: -10, headY: 5,
              lf: 26, la: 56, lk: 12, lt: -30, lp: 1, rf: 26, ra: 56, rk: 12, rt: -30, rp: 1, elbow: 0.8 },
  // other knee drawn up
  passeR:   { yaw: -18, pitch: 8,  roll: -3,  L: -0.12,  arch: 0,  side: -2, twist: -6, headP: -2, headY: 6,
              lf: -8, la: 4, lk: 8, lt: 0, lp: 1,   rf: 84, ra: 16, rk: 122, rt: -18, rp: 1, elbow: 0.7 },
  // final: a lifted, arched split-line pose, head back, long free leg
  final:    { yaw: 10,  pitch: -8, roll: 9,   L: -0.05, arch: 20, side: 6,  twist: 8,  headP: -16, headY: -10,
              lf: 78, la: 22, lk: 4, lt: 10, lp: 1,   rf: -38, ra: 26, rk: 72, rt: -8, rp: 1,  elbow: 0.9 },
};
export const poseKeys = Object.keys(POSES.hang);

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------------ */
/*  Props: textures, silk ribbons, wordmark                            */
/* ------------------------------------------------------------------ */

function wordTexture(fontReady) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 400;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const fam = getComputedStyle(document.documentElement).getPropertyValue('--serif') || "'Cormorant Garamond', serif";
  g.font = `300 250px ${fam}`;
  g.textBaseline = 'middle';
  const text = 'AT FITNESS';
  const track = 62;
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let x = (c.width - total) / 2;
  g.fillStyle = '#fff';
  chars.forEach((ch, i) => { g.fillText(ch, x, c.height / 2 + 8); x += widths[i] + track; });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, aspect: c.width / c.height, fontReady };
}

function glowDisc() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function poolTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(0.5, 'rgba(255,190,110,0.16)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** A silk strand: a ribbon along a polyline that is rebuilt every frame (hangs from the rig, drapes past the performer). */
function makeSilk(side, segs, cols) {
  const geo = new THREE.BufferGeometry();
  const n = (segs + 1) * cols;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= segs; i++) for (let j = 0; j < cols; j++) {
    uv[(i * cols + j) * 2] = j / (cols - 1); uv[(i * cols + j) * 2 + 1] = i / segs;
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#c7a566', roughness: 0.5, metalness: 0, side: THREE.DoubleSide,
    sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color('#fff0cf'), envMapIntensity: 0.9,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  return { mesh, side, segs, cols };
}

function updateSilk(sk, grip, t, tail, gathered) {
  const { segs, cols, side } = sk;
  const p = sk.mesh.geometry.attributes.position;
  const FLOOR = 0.015;
  const vertSegs = Math.floor(segs * 0.86);
  const gx = side * SILK_X, topY = CEIL - 0.1;
  for (let i = 0; i <= segs; i++) {
    let x, y, z, wid;
    if (i <= vertSegs) {
      const k = i / vertSegs;
      y = topY + (FLOOR - topY) * k;
      // strands converge on the carabiner at the top
      const conv = sstep(topY - 0.7, topY, y);
      x = gx * (1 - conv);
      z = 0;
      // below the hand the silk is let go: it drifts outward and behind her, clear of her body
      const below = Math.max(0, grip - y);
      const open = sstep(0, 0.95, below);
      x += side * (0.5 * open) * tail;
      z += -0.34 * open * tail;
      // gentle travelling wave, stronger low down where the fabric is free
      const free = sstep(0, 1.6, below) * 0.9 + 0.1 * (1 - y / topY);
      x += Math.sin(y * 2.3 - t * 1.5 + side) * 0.035 * free;
      z += Math.sin(y * 1.7 - t * 1.2 + side * 2) * 0.05 * free;
      wid = 0.15 * (1 - 0.6 * gathered * (1 - sstep(0, 0.9, below)) * sstep(-0.4, 0.05, y - grip + 0.4));
      if (y > grip) wid = 0.15 * (1 - 0.6 * gathered * sstep(0.0, 0.7, 1.2 - (y - grip)));
    } else {
      // pooled on the floor, curling away
      const k = (i - vertSegs) / (segs - vertSegs);
      const last = vertSegs / vertSegs;
      const baseOpen = 1;
      const bx = side * (SILK_X + 0.5 * tail) + side * Math.sin(1.6) * 0.0;
      const bz = -0.34 * tail;
      const run = k * 0.9;
      x = bx + side * run * 0.8 + Math.sin(k * 5 + side) * 0.06;
      z = bz - run * 0.6 + Math.sin(k * 7 + side * 3) * 0.05;
      y = FLOOR + 0.02 * Math.sin(k * 9);
      wid = 0.15 + 0.08 * k; void last; void baseOpen;
    }
    // ribbon cross-section: always horizontal, turned gently about the vertical so it catches the light
    const ang = Math.sin(y * 3.1 + side) * 0.55 + Math.sin(t * 0.8 + y * 1.3) * 0.18;
    const ax = Math.cos(ang), az = Math.sin(ang);
    for (let j = 0; j < cols; j++) {
      const u = j / (cols - 1) - 0.5;
      const o = u * wid;
      const ruffle = Math.sin(u * Math.PI * 2 + y * 4 + side) * 0.014;
      p.setXYZ(i * cols + j, x + ax * o, y, z + az * o + ruffle);
    }
  }
  p.needsUpdate = true;
  sk.mesh.geometry.computeVertexNormals();
}

/* ------------------------------------------------------------------ */
/*  The performer                                                      */
/* ------------------------------------------------------------------ */

function buildPerformer(gltf) {
  const root = new THREE.Group();
  const model = gltf.scene;
  root.add(model);

  const bones = {};
  const meshes = [];
  model.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      if (/glasses/i.test(o.name)) { o.visible = false; return; }
      meshes.push(o); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        m.envMapIntensity = 0.9;
        if (/skin|body/i.test(m.name)) { m.roughness = Math.max(m.roughness ?? 0.6, 0.5); m.metalness = 0; }
      }
    }
  });

  // scale to her height, measured on the mesh in its rest pose
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  meshes.forEach((m) => box.expandByObject(m, true));
  const S = HEIGHT / (box.max.y - box.min.y);
  root.scale.setScalar(S);
  root.updateMatrixWorld(true);

  const B = (n) => bones[n];
  const rest = new Map();
  const wp = v3(), wq = new THREE.Quaternion();
  for (const b of Object.values(bones)) {
    b.getWorldPosition(wp); b.getWorldQuaternion(wq);
    rest.set(b, { p: wp.clone(), q: wq.clone() });
  }
  const rp = (n) => rest.get(B(n)).p;
  const rq = (n) => rest.get(B(n)).q;
  const lens = {
    uArm: rp('LeftArm').distanceTo(rp('LeftForeArm')),
    fArm: rp('LeftForeArm').distanceTo(rp('LeftHand')),
    hand: rp('LeftHand').distanceTo(rp('LeftHandMiddle1')),
    hipsY: rp('Hips').y,
    shoulderY: rp('LeftArm').y,
  };
  // rest orientation sanity: she must face +Z with her left on +X for the pose maths below
  const leftSign = Math.sign(rp('LeftUpLeg').x - rp('RightUpLeg').x);
  const sx = leftSign || 1;     // +1 if left is +X (expected)

  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
  const setWorldQ = (b, q) => {
    b.parent.getWorldQuaternion(_pq);
    b.quaternion.copy(_pq.invert().multiply(q));
    b.updateWorldMatrix(false, true);
  };
  const qAxis = (x, y, z, a) => new THREE.Quaternion().setFromAxisAngle(v3(x, y, z), a);
  const delta = (pitch, yaw, roll) => qAxis(1, 0, 0, pitch).premultiply(qAxis(0, 1, 0, yaw)).multiply(qAxis(0, 0, 1, roll));

  /** Point `b` (whose child is at rest position `childRestP`) along world direction `dir`, optional axial twist. */
  const aimTmp = v3(), aimBase = v3();
  function aim(b, child, dir, twist = 0) {
    const r = rest.get(b), rc = rest.get(child);
    aimBase.copy(rc.p).sub(r.p).normalize();
    aimTmp.copy(dir).normalize();
    _q.setFromUnitVectors(aimBase, aimTmp).multiply(r.q);
    if (twist) _q.premultiply(_q2.setFromAxisAngle(aimTmp, twist));
    setWorldQ(b, _q);
    return _q.clone();
  }

  const hips = B('Hips');
  const parentOfHips = hips.parent;
  const info = { gripErr: [0, 0], reach: [0, 0], hand: [v3(), v3()], target: [v3(), v3()] };

  const spineChain = [['Hips', 0, 0, 0], ['Spine', 0.28, 0.3, 0.3], ['Spine1', 0.36, 0.35, 0.35], ['Spine2', 0.36, 0.35, 0.35], ['Neck', 0, 0, 0], ['Head', 0, 0, 0]];
  const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

  const S0 = v3(), E = v3(), Wr = v3(), T = v3(), dirST = v3(), perp = v3(), pole = v3(), tmp = v3();

  /**
   * Solve and apply a pose.
   *   p      pose parameters
   *   grip   world height of the centre of her grip on the silks
   *   dy     [left, right] hand height offsets from the centre (hand-over-hand)
   *   sway   [x, z] extra pendulum offset
   */
  function solve(p, grip, dy, sway, t) {
    const Qb = qAxis(0, 1, 0, p.yaw * D).multiply(qAxis(1, 0, 0, p.pitch * D)).multiply(qAxis(0, 0, 1, p.roll * D * sx));
    const up = v3(0, 1, 0).applyQuaternion(Qb);
    const breath = Math.sin(t * 1.7) * 0.5 + 0.5;

    // pelvis hangs from the grips
    const Lnom = (lens.shoulderY - lens.hipsY) + (lens.uArm + lens.fArm) * 0.97 + lens.hand * 0.55;
    const pel = v3(sway[0], grip, sway[1]).addScaledVector(up, -(Lnom + p.L));
    hips.position.copy(parentOfHips.worldToLocal(pel.clone()));

    // ---- spine, neck, head: forward kinematics in the body frame ----
    let acc = Qb.clone();
    const arch = p.arch * D, side = p.side * D * sx, tw = p.twist * D;
    for (const [name, wa, ws, wt] of spineChain) {
      const b = B(name);
      let pit = -arch * wa, rol = -side * ws, yaw = tw * wt;
      if (name === 'Spine2') pit += 0.012 * breath;
      if (name === 'Neck') { pit = p.headP * D * 0.45; yaw = p.headY * D * 0.45; rol = 0; }
      if (name === 'Head') { pit = p.headP * D * 0.55; yaw = p.headY * D * 0.55; rol = 0; }
      acc = acc.clone().multiply(delta(pit, yaw, rol));
      setWorldQ(b, _q.copy(acc).multiply(rq(name)));
    }
    // the neck/head chain also needs the shoulders to follow the spine:
    const spineAcc = acc; void spineAcc;
    const chestAcc = (() => {   // accumulated rotation up to Spine2
      let a = Qb.clone();
      for (const [name, wa, ws, wt] of spineChain.slice(0, 4)) {
        let pit = -arch * wa, rol = -side * ws, yaw = tw * wt;
        if (name === 'Spine2') pit += 0.012 * breath;
        a = a.multiply(delta(pit, yaw, rol));
      }
      return a;
    })();
    for (const sd of ['Left', 'Right']) {
      const sh = B(`${sd}Shoulder`);
      // slight shrug as the arms reach overhead
      const sgn = sd === 'Left' ? 1 : -1;
      setWorldQ(sh, _q.copy(chestAcc).multiply(qAxis(0, 0, 1, sgn * sx * 0.16)).multiply(rq(`${sd}Shoulder`)));
    }

    // ---- legs ----
    const legDirs = {};
    for (const [sd, f, a, k, tw2, pt] of [['Left', p.lf, p.la, p.lk, p.lt, p.lp], ['Right', p.rf, p.ra, p.rk, p.rt, p.rp]]) {
      const sgn = sd === 'Left' ? sx : -sx;
      const thighQ = qAxis(0, 0, 1, a * D * sgn).multiply(qAxis(1, 0, 0, -f * D));
      const thigh = v3(0, -1, 0).applyQuaternion(thighQ);
      const kneeAxis = v3(1, 0, 0).applyQuaternion(thighQ);
      // external rotation spins the whole leg (and the knee plane) about the thigh
      const twQ = qAxis(thigh.x, thigh.y, thigh.z, tw2 * D * sgn);
      kneeAxis.applyQuaternion(twQ);
      const shin = thigh.clone().applyAxisAngle(kneeAxis, k * D);
      const foot = shin.clone().applyAxisAngle(kneeAxis, -(1 - pt) * 80 * D);
      legDirs[sd] = { thigh: thigh.applyQuaternion(Qb), shin: shin.applyQuaternion(Qb), foot: foot.applyQuaternion(Qb), twist: tw2 * D * sgn };
    }
    for (const sd of ['Left', 'Right']) {
      const d = legDirs[sd];
      aim(B(`${sd}UpLeg`), B(`${sd}Leg`), d.thigh, d.twist);
      aim(B(`${sd}Leg`), B(`${sd}Foot`), d.shin, d.twist);
      aim(B(`${sd}Foot`), B(`${sd}ToeBase`), d.foot, d.twist);
    }

    // ---- arms: two-bone IK onto the silk strands ----
    const grips = [];
    ['Left', 'Right'].forEach((sd, i) => {
      const gs = sd === 'Left' ? sx : -sx;
      const arm = B(`${sd}Arm`), fore = B(`${sd}ForeArm`), hand = B(`${sd}Hand`);
      arm.getWorldPosition(S0);
      // fist centre on the silk; the wrist sits a hand-half below it
      T.set(gs * SILK_X, grip + dy[i], 0).addScaledVector(v3(0, 1, 0), -lens.hand * 0.55);
      const l1 = lens.uArm, l2 = lens.fArm;
      dirST.copy(T).sub(S0);
      const raw = dirST.length();
      const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 0.02), (l1 + l2) * 0.998);
      dirST.normalize();
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      pole.set(gs * (0.9 * p.elbow + 0.1), -0.55, -0.35).applyQuaternion(Qb).normalize();
      perp.copy(pole).addScaledVector(dirST, -pole.dot(dirST)).normalize();
      E.copy(S0).addScaledVector(dirST, a).addScaledVector(perp, h);
      Wr.copy(S0).addScaledVector(dirST, d);
      const armTw = gs * 1.15;      // palms turn to face the silk
      aim(arm, fore, tmp.copy(E).sub(S0), armTw);
      aim(fore, hand, tmp.copy(Wr).sub(E), armTw);
      // hand continues the forearm, fingers wrap round the strand
      const handDir = tmp.copy(Wr).sub(E).normalize().lerp(v3(0, 1, 0), 0.55).normalize().clone();
      const hq = aim(hand, B(`${sd}HandMiddle1`), handDir, armTw);
      const dHand = hq.clone().multiply(rq(`${sd}Hand`).clone().invert());
      for (const f of FINGERS) {
        let a2 = dHand.clone();
        for (let s = 1; s <= 3; s++) {
          const fb = B(`${sd}Hand${f}${s}`);
          a2 = a2.clone().multiply(qAxis(0, 0, 1, -gs * (s === 1 ? 1.15 : 1.35)));
          setWorldQ(fb, _q.copy(a2).multiply(rq(`${sd}Hand${f}${s}`)));
        }
      }
      let th = dHand.clone();
      for (let s = 1; s <= 3; s++) {
        th = th.clone().multiply(qAxis(0, 0, 1, -gs * 0.5)).multiply(qAxis(0, 1, 0, gs * 0.18));
        setWorldQ(B(`${sd}HandThumb${s}`), _q.copy(th).multiply(rq(`${sd}HandThumb${s}`)));
      }
      hand.updateWorldMatrix(true, true);
      const hp = v3(); B(`${sd}HandMiddle1`).getWorldPosition(hp);
      info.hand[i].copy(hp);
      info.target[i].set(gs * SILK_X, grip + dy[i], 0);
      info.gripErr[i] = hp.distanceTo(info.target[i]);
      info.reach[i] = raw / (l1 + l2);
      grips.push(hp);
    });
    return grips;
  }

  const dispose = () => {
    model.traverse((o) => {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach((m) => { for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose(); m.dispose(); });
    });
  };
  return { root, meshes, bones, solve, info, lens, dispose, S, sx };
}

/* ------------------------------------------------------------------ */
/*  The scene                                                          */
/* ------------------------------------------------------------------ */

export function createAerial3D(canvas, { small = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor('#030201');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#050302', 0.035);
  const envRT = buildEnvironment(renderer);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // ---- animated state (GSAP tweens these) ----
  const pose = { ...POSES.hang };
  const s = {
    beam: 0,        // spotlight cone + dust opacity
    key: 0,         // key light intensity 0..1
    cone: 0.045,    // spotlight half-angle (rad)
    vis: 0,         // performer visibility (light-on-her)
    grip: CEIL - 0.5,
    follow: 0,      // 0 = spotlight on the rope at the ceiling, 1 = follows her
    word: 0,        // wordmark reveal 0..1
    sweep: -0.3,    // light sweep position across the wordmark
    fade: 1,        // black fade 1 -> 0
    glow: 0,
    dive: 0,
    time: 0,
  };
  const cam = { ty: 5.6, dist: 7.6, az: -0.22, el: 0.0, fov: 34, shift: 0.0, drift: 1 };

  // ---- floor: a dark polished mirror, lit pool, soft contact shadows ----
  const floorSize = 40;
  const mirror = new Reflector(keep(new THREE.PlaneGeometry(floorSize, floorSize)), {
    textureWidth: small ? 512 : 1024, textureHeight: small ? 512 : 1024, color: 0x2a2018, clipBias: 0.003,
  });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
  const deck = new THREE.Mesh(keep(new THREE.PlaneGeometry(floorSize, floorSize)), keep(new THREE.MeshStandardMaterial({
    color: '#0b0806', roughness: 0.35, transparent: true, opacity: 0.8, metalness: 0,
  })));
  deck.rotation.x = -Math.PI / 2; deck.position.y = 0.002; deck.receiveShadow = true;
  scene.add(deck);
  const poolTex = keep(poolTexture());
  const pool = new THREE.Mesh(keep(new THREE.PlaneGeometry(6.4, 6.4)), keep(new THREE.MeshBasicMaterial({
    map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  })));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.006;
  scene.add(pool);

  // ---- back wall: fluted architectural panels catch the light and her shadow ----
  const WALL_Z = -3.3;
  const wallBack = new THREE.Mesh(keep(new THREE.PlaneGeometry(22, 12)), keep(new THREE.MeshStandardMaterial({ color: '#0d0907', roughness: 0.9 })));
  wallBack.position.set(0, 6, WALL_Z - 0.12); wallBack.receiveShadow = true;
  scene.add(wallBack);
  const flutes = 88;
  const flute = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.1, 0.1, 12, 10, 1, false, -Math.PI / 2, Math.PI)),
    keep(new THREE.MeshStandardMaterial({ color: '#2a1f16', roughness: 0.6, envMapIntensity: 0.5 })), flutes);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < flutes; i++) { mtx.makeTranslation((i - (flutes - 1) / 2) * 0.255, 6, WALL_Z - 0.1); flute.setMatrixAt(i, mtx); }
  flute.castShadow = true; flute.receiveShadow = true;
  scene.add(flute);
  const archMat = { opacity: 0 };   // (architrave removed)

  // ---- wordmark (a real object on the wall, behind the performer) ----
  const wm = wordTexture();
  keep(wm.tex);
  const wmMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: wm.tex }, reveal: { value: 0 }, sweep: { value: -0.3 }, glow: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform float reveal, sweep, glow; varying vec2 vUv;
      void main(){
        float a = texture2D(map, vUv).a;
        // soft left-to-right wipe
        float w = smoothstep(vUv.x - 0.12, vUv.x, reveal * 1.14 - 0.0);
        // light sweep: a diagonal band of white-gold running across the lettering
        float d = vUv.x + (vUv.y - 0.5) * 0.35 - sweep;
        float band = exp(-d * d * 220.0);
        vec3 gold = mix(vec3(0.89, 0.72, 0.42), vec3(1.0, 0.93, 0.76), vUv.y * 0.6 + glow * 0.25);
        vec3 col = gold * (0.78 + glow * 0.3) + vec3(1.0, 0.95, 0.82) * band * 1.5;
        gl_FragColor = vec4(col, a * w * (0.6 + 0.4 * reveal));
        #include <colorspace_fragment>
      }`,
  }));
  const wmMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1 / wm.aspect)), wmMat);
  wmMesh.position.z = WALL_Z + 0.05;
  wmMesh.renderOrder = 1;
  scene.add(wmMesh);
  const wmGlow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({
    map: keep(glowDisc()), color: '#e3b46a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  })));
  wmGlow.position.z = WALL_Z + 0.03;
  scene.add(wmGlow);

  // ---- rigging + silks ----
  const rig = new THREE.Group();
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#b9b2a6', metalness: 1, roughness: 0.28 }));
  const plate = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 28)), steel);
  plate.position.y = CEIL + 0.02;
  const swivel = new THREE.Mesh(keep(new THREE.TorusGeometry(0.075, 0.016, 12, 28)), steel);
  swivel.position.y = CEIL - 0.1; swivel.rotation.y = 0.5;
  const biner = new THREE.Mesh(keep(new THREE.TorusGeometry(0.06, 0.012, 10, 24)), steel);
  biner.position.y = CEIL - 0.2; biner.scale.set(0.8, 1.35, 1); biner.rotation.y = -0.4;
  rig.add(plate, swivel, biner);
  rig.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(rig);
  const ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(40, 40)), keep(new THREE.MeshStandardMaterial({ color: '#0a0705', roughness: 1 })));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = CEIL + 0.05;
  scene.add(ceiling);

  const SEGS = small ? 90 : 150;
  const silkL = makeSilk(1, SEGS, 6), silkR = makeSilk(-1, SEGS, 6);
  keep(silkL.mesh.geometry); keep(silkR.mesh.geometry); keep(silkL.mesh.material);
  scene.add(silkL.mesh, silkR.mesh);
  silkR.mesh.material = silkL.mesh.material;

  // ---- lights ----
  const key = new THREE.SpotLight('#ffd7a0', 0, 0, 0.12, 1.0, 1.3);
  key.position.set(0.25, CEIL - 0.1, 1.7);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 6; key.shadow.blurSamples = 16;
  key.shadow.camera.near = 2; key.shadow.camera.far = 18;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight('#ffbe78', 0, 0, 0.45, 0.9, 1.6);
  rim.position.set(-2.6, 5.0, -1.6);
  scene.add(rim, rim.target);
  const fill = new THREE.HemisphereLight('#ffe9cc', '#1a110a', 0);
  scene.add(fill);
  const wallWash = new THREE.PointLight('#ffb561', 0, 9, 2);
  wallWash.position.set(0, 3.2, WALL_Z + 1.4);
  scene.add(wallWash);

  // ---- volumetric beam + dust ----
  const beamMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uBeam: { value: 0 }, uColor: { value: new THREE.Color('#ffd49a') } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vH = position.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uBeam; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float along = smoothstep(-0.5, 0.5, vH);   // brighter near the source (top)
        gl_FragColor = vec4(uColor * f * (0.25 + 0.75 * along) * uBeam * 0.55, 1.0); }`,
  }));
  const coneGeo = keep(new THREE.CylinderGeometry(0, 1, 1, 48, 1, true));   // apex at +y/2 -> flip by rotating
  coneGeo.translate(0, -0.5, 0);      // apex at origin, opens along -y
  coneGeo.rotateX(-Math.PI / 2);      // opens along -z (lookAt axis)
  const cone = new THREE.Mesh(coneGeo, beamMat);
  cone.frustumCulled = false; cone.renderOrder = 3;
  scene.add(cone);

  const DUST = small ? 160 : 380;
  const dg = keep(new THREE.BufferGeometry());
  const dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    dseed[i * 4] = Math.random(); dseed[i * 4 + 1] = Math.random(); dseed[i * 4 + 2] = Math.random() * 6.28; dseed[i * 4 + 3] = 0.4 + Math.random();
  }
  dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dg.setAttribute('seed', new THREE.BufferAttribute(dseed, 4));
  const dustMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uBeam: { value: 0 }, uA: { value: v3(0.5, CEIL, 3) }, uAxis: { value: v3(0, -1, 0) }, uTan: { value: 0.1 }, uLen: { value: 8 }, uPx: { value: 1 } },
    vertexShader: `attribute vec4 seed; uniform float uT, uTan, uLen, uPx, uBeam; uniform vec3 uA, uAxis; varying float vA;
      void main(){
        vec3 ax = normalize(uAxis);
        vec3 s = normalize(cross(ax, vec3(0.0,0.0,1.0)) + vec3(0.001)); vec3 u = cross(ax, s);
        float along = fract(seed.x + uT * 0.006 * seed.w);
        float r = sqrt(seed.y) * uTan * along * uLen * 0.95;
        float a = seed.z + uT * 0.12 * seed.w;
        vec3 p = uA + ax * along * uLen + (s * cos(a) + u * sin(a)) * r;
        p += vec3(sin(uT*0.4 + seed.z), cos(uT*0.33 + seed.w*6.0), sin(uT*0.27 + seed.x*9.0)) * 0.05;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + seed.w * 1.6) * uPx * (5.0 / max(-mv.z, 1.0));
        vA = uBeam * (0.25 + 0.75 * seed.w) * (0.5 + 0.5 * sin(uT * (0.8 + seed.w) + seed.z));
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = smoothstep(0.5, 0.0, length(c)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * d * vA, 1.0); }`,
  }));
  const dust = new THREE.Points(dg, dustMat);
  dust.frustumCulled = false; dust.renderOrder = 4;
  scene.add(dust);

  // ---- performer (loaded asynchronously) ----
  let performer = null;
  const dyBuf = [0, 0], swayBuf = [0, 0];
  let gripStart = 0, raf = 0, last = 0, running = false, W = 1, H = 1, dprPx = 1;
  const camT = v3(), camP = v3(), lightT = v3(), lightLag = v3(0, CEIL - 0.6, 0);
  const layout = { portrait: false };

  const url = `${import.meta.env.BASE_URL}models/athlete.glb`;
  const load = () => new GLTFLoader().loadAsync(url).then((gltf) => {
    performer = buildPerformer(gltf);
    scene.add(performer.root);
    // compile every shader in parallel (hidden behind the black cover) so the first lit frame never hitches
    return (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(() => performer);
  });

  function resize() {
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    dprPx = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    renderer.setPixelRatio(dprPx);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    layout.portrait = W / H < 0.95;
    // wordmark: left of the performer on landscape screens, above her head on portrait
    if (layout.portrait) {
      const w = 2.5; wmMesh.scale.set(w, w, 1); wmMesh.position.set(0, 3.9, WALL_Z + 0.05);
      wmGlow.scale.set(5.5, 2.4, 1); wmGlow.position.set(0, 3.9, WALL_Z + 0.03);
    } else {
      const w = 3.0; wmMesh.scale.set(w, w, 1); wmMesh.position.set(-2.4, 2.25, WALL_Z + 0.05);
      wmGlow.scale.set(6.5, 2.3, 1); wmGlow.position.set(-2.4, 2.25, WALL_Z + 0.03);
    }
    dustMat.uniforms.uPx.value = dprPx;
    camera.updateProjectionMatrix();
  }

  const clock = { t: 0 };

  function frame(dt) {
    clock.t += dt; const t = clock.t;
    s.time = t;
    // ---- pose ----
    const phase = (gripStart - s.grip) / 0.95 * Math.PI * 2;
    dyBuf[0] = Math.sin(phase) * 0.045 * (1 - s.dive); dyBuf[1] = -Math.sin(phase) * 0.045 * (1 - s.dive);
    swayBuf[0] = Math.sin(t * 0.9) * 0.015 + pose.roll * 0.0; swayBuf[1] = Math.cos(t * 0.7) * 0.012;
    if (performer) {
      performer.solve(pose, s.grip, dyBuf, swayBuf, t);
      performer.root.visible = true;
    }
    // ---- silks ----
    const gather = 1;
    updateSilk(silkL, s.grip, t, 1, gather);
    updateSilk(silkR, s.grip, t, 1, gather);

    // ---- lights ----
    const chestY = s.grip - 0.75;
    const focusY = (1 - s.follow) * (CEIL - 0.7) + s.follow * chestY;
    lightLag.y += (focusY - lightLag.y) * Math.min(1, dt * 3.2);
    lightT.set(0, lightLag.y, 0);
    key.target.position.copy(lightT);
    key.angle += (s.cone - key.angle) * Math.min(1, dt * 6);
    key.intensity = s.key * 150;
    key.updateMatrixWorld(); key.target.updateMatrixWorld();
    rim.intensity = s.vis * 90; rim.target.position.set(0, chestY, 0);
    fill.intensity = s.vis * 0.1;
    wallWash.intensity = s.vis * 7 + s.word * 5;
    pool.material.opacity = s.vis * 0.9;
    scene.environmentIntensity = 0.015 + 0.2 * s.vis;

    // beam cone follows the spot target
    const len = key.position.distanceTo(lightT) + 1.8;
    cone.position.copy(key.position);
    cone.lookAt(lightT);
    const r = Math.tan(key.angle) * len;
    cone.scale.set(r, r, len);
    beamMat.uniforms.uBeam.value = s.beam;
    dustMat.uniforms.uBeam.value = s.beam;
    dustMat.uniforms.uT.value = t;
    dustMat.uniforms.uA.value.copy(key.position);
    dustMat.uniforms.uAxis.value.copy(lightT).sub(key.position).normalize();
    dustMat.uniforms.uTan.value = Math.tan(key.angle);
    dustMat.uniforms.uLen.value = len;

    // ---- wordmark ----
    wmMat.uniforms.reveal.value = s.word; wmMat.uniforms.sweep.value = s.sweep; wmMat.uniforms.glow.value = s.glow;
    wmGlow.material.opacity = s.glow * 0.38 * s.word;

    // ---- camera ----
    const drift = cam.drift;
    const az = cam.az + Math.sin(t * 0.37) * 0.012 * drift;
    const el = cam.el + Math.sin(t * 0.29 + 1) * 0.008 * drift;
    const shiftX = layout.portrait ? 0.0 : cam.shift;
    camT.set(shiftX, cam.ty + Math.sin(t * 0.5) * 0.02 * drift, 0);
    camP.set(camT.x + Math.sin(az) * Math.cos(el) * cam.dist, camT.y + Math.sin(el) * cam.dist, Math.cos(az) * Math.cos(el) * cam.dist);
    camera.position.copy(camP);
    camera.lookAt(camT);
    camera.fov = cam.fov * (layout.portrait ? 1.55 : 1);
    camera.updateProjectionMatrix();

    renderer.toneMappingExposure = 1.0 + s.glow * 0.08;
    scene.fog.density = 0.032;
    cover.style.opacity = String(s.fade);
    renderer.render(scene, camera);
  }

  // a black cover in the DOM sits above the canvas for fades (cheaper than a post pass)
  const cover = document.createElement('div');
  cover.style.cssText = 'position:absolute;inset:0;background:#030201;pointer-events:none;opacity:1;';
  canvas.parentElement?.insertBefore(cover, canvas.nextSibling);

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    frame(dt);
  }

  return {
    pose, s, cam, POSES, load, resize, renderOnce: () => frame(0.016),
    get performer() { return performer; },
    get gripStart() { return gripStart; }, set gripStart(v) { gripStart = v; },
    scene, camera, renderer, layout,
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    destroy() {
      running = false; cancelAnimationFrame(raf);
      cover.remove();
      performer?.dispose();
      disposables.forEach((d) => d.dispose?.());
      envRT.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
