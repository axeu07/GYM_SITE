import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildEnvironment } from './studio';

// Scene IV · Strength & Conditioning. A skinned athlete (the same Ready Player Me / Mixamo-rigged model the
// Reformer scene uses) performing a standing dumbbell shoulder press on a lifting platform, lit like the
// rest of the studio: warm key, amber rim, dark rubber and champagne gold.
//
// She is posed procedurally, not from a baked clip: every frame is a pure function of one clock `t`.
// The arms are solved with two-bone IK so each fist lands on the dumbbell handle, the fingers are curled
// around the bar, and the torso, shoulder girdle, head and knees follow the load the way a real lifter's do.
//
// All maths is in scene space (metres, Y up, she faces +Z, her left is +X).

const HEIGHT = 1.72;
const CYCLE = 5.4;                       // seconds per repetition
const START = 2.55;                      // the scene opens on the lockout (the still poster is this exact frame), then lowers
const PALM_OUT = 0.025;                  // knuckle line -> centre of the fist, on the palm side
const FIST_UP = -0.006;                  // ...and along the hand (the curled fingers close slightly back toward the wrist)
const ARM_SOFT = 0.945;                  // arms reach 94.5% of their length at lockout: never hyper-extended

const rad = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Press progress for clock t: 0 = dumbbells racked at the shoulders, 1 = locked out overhead. */
export function pressAt(t) {
  const x = ((t % CYCLE) + CYCLE) % CYCLE;
  if (x < 0.7) return 0;                       // rack, a breath in
  if (x < 2.2) return sstep(0.7, 2.2, x);      // drive up
  if (x < 3.0) return 1;                       // lockout
  if (x < 4.9) return 1 - sstep(3.0, 4.9, x);  // lower under control
  return 0;
}

/* ------------------------------------------------------------------------------------------------ */
/*  Props: the dumbbell and the platform                                                             */
/* ------------------------------------------------------------------------------------------------ */

function knurlTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (let i = -64; i < 128; i += 8) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke();
    g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 3); t.anisotropy = 4;
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 64, 4, 128, 64, 126);
  gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.scale(1, 0.5); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.restore();
  return new THREE.CanvasTexture(c);
}

/** A hex-head dumbbell: black rubber, knurled chrome handle, champagne-gold collars and inlay rings. Axis = local X. */
function buildDumbbell(own) {
  const keep = (x) => { own.push(x); return x; };
  const rubber = keep(new THREE.MeshPhysicalMaterial({ color: '#17130f', roughness: 0.5, metalness: 0.1, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.9 }));
  const chrome = keep(new THREE.MeshStandardMaterial({ color: '#d8d4cc', roughness: 0.3, metalness: 1, bumpMap: keep(knurlTexture()), bumpScale: 1.2, envMapIntensity: 1.2 }));
  const gold = keep(new THREE.MeshStandardMaterial({ color: '#d8b06a', roughness: 0.24, metalness: 1, envMapIntensity: 1.3 }));
  const g = new THREE.Group();

  const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.0165, 0.0165, 0.16, 28).rotateZ(Math.PI / 2)), chrome);
  g.add(handle);

  const hex = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; hex[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 0.074, Math.sin(a) * 0.074); }
  hex.closePath();
  const headGeo = keep(new THREE.ExtrudeGeometry(hex, { depth: 0.062, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 1 }));
  headGeo.translate(0, 0, -0.031).rotateY(Math.PI / 2);   // axis along X, centred on the origin
  const collarGeo = keep(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 28).rotateZ(Math.PI / 2));
  const inlayGeo = keep(new THREE.TorusGeometry(0.047, 0.0025, 8, 48).rotateY(Math.PI / 2));   // a hairline gold ring inlaid in each head face
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(headGeo, rubber); head.position.x = s * 0.118; g.add(head);
    const collar = new THREE.Mesh(collarGeo, gold); collar.position.x = s * 0.083; g.add(collar);
    const inlay = new THREE.Mesh(inlayGeo, gold); inlay.position.x = s * 0.1572; inlay.userData.flat = true; g.add(inlay);
  }
  // (the hairline inlay neither casts nor receives shadow: it sits a hair off the face and would only band)
  g.traverse((o) => { if (o.isMesh && !o.userData.flat) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** A low round lifting platform: dark rubber, hairline gold rings, a pool of warm light. */
function buildPlatform(own) {
  const keep = (x) => { own.push(x); return x; };
  const g = new THREE.Group();
  const rubber = keep(new THREE.MeshStandardMaterial({ color: '#15110d', roughness: 0.62, metalness: 0.05, envMapIntensity: 0.55 }));
  const gold = keep(new THREE.MeshStandardMaterial({ color: '#d8b06a', roughness: 0.28, metalness: 1, envMapIntensity: 1.2 }));
  const slab = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.72, 0.74, 0.04, 96)), rubber);
  slab.position.y = -0.02; slab.receiveShadow = true; g.add(slab);
  for (const [r, t] of [[0.715, 0.0055], [0.5, 0.0028]]) {
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(r, t, 8, 160)), gold);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.0006; g.add(ring);
  }
  const pool = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(2.6, 2.6)),
    keep(new THREE.MeshBasicMaterial({ map: keep(glowTexture('rgba(255,190,100,0.34)', 'rgba(255,170,80,0.07)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; g.add(pool);
  // a soft occlusion pool under the feet, so she sits on the rubber rather than hovering over it
  const ao = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(0.95, 0.5)),
    keep(new THREE.MeshBasicMaterial({ map: keep(shadowTexture()), transparent: true, depthWrite: false, opacity: 0.85 })),
  );
  ao.rotation.x = -Math.PI / 2; ao.position.set(0, 0.0045, 0.02); g.add(ao);
  return g;
}

/* ------------------------------------------------------------------------------------------------ */
/*  The athlete                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

// Re-seat the avatar's PBR materials as physical ones: a soft peach-fuzz sheen on skin, fabric sheen on the
// kit, a gentle sheen on the hair. (Same look as the Reformer scene's rider.)
function upgradeMaterial(m) {
  const p = new THREE.MeshPhysicalMaterial({
    name: m.name, color: m.color?.clone(), map: m.map, normalMap: m.normalMap, normalScale: m.normalScale?.clone(),
    roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap, aoMap: m.aoMap, alphaMap: m.alphaMap,
    emissive: m.emissive?.clone(), emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, depthWrite: m.depthWrite,
    roughness: m.roughness ?? 0.7, metalness: m.metalness ?? 0, envMapIntensity: 0.75,
  });
  const n = m.name || '';
  if (/skin|body/i.test(n)) {
    p.roughness = 0.52; p.metalness = 0; p.specularIntensity = 0.7;
    p.sheen = 0.85; p.sheenRoughness = 0.5; p.sheenColor = new THREE.Color('#ffc9ad');
    if (p.normalScale) p.normalScale.setScalar(0.7);
  } else if (/hair/i.test(n)) {
    p.roughness = 0.5; p.metalness = 0; p.sheen = 0.7; p.sheenRoughness = 0.4; p.sheenColor = new THREE.Color('#7b5b48');
  } else if (/outfit|footwear/i.test(n)) {
    p.roughness = Math.max(p.roughness, 0.62); p.metalness = Math.min(p.metalness, 0.15);
    p.sheen = 0.18; p.sheenRoughness = 0.8; p.sheenColor = new THREE.Color('#d9c8c0');
  }
  m.dispose?.();
  return p;
}

function buildAthlete(gltf, scene) {
  const root = new THREE.Group();
  const model = gltf.scene;
  root.add(model); scene.add(root);

  const bones = {};
  const meshes = [];
  const morphMeshes = [];
  model.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      if (/glasses/i.test(o.name)) { o.visible = false; return; }
      meshes.push(o); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map(upgradeMaterial) : upgradeMaterial(o.material);
      if (o.morphTargetDictionary) morphMeshes.push(o);
    }
  });
  const B = (n) => bones[n];

  // scale to height, then stand the soles on y = 0
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  meshes.forEach((m) => box.expandByObject(m, true));
  root.scale.setScalar(HEIGHT / (box.max.y - box.min.y));
  root.updateMatrixWorld(true);
  box.makeEmpty(); meshes.forEach((m) => box.expandByObject(m, true));
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  // rest (T-pose) world transforms
  const rest = new Map();
  const wp = v3(), wq = new THREE.Quaternion();
  for (const b of Object.values(bones)) { b.getWorldPosition(wp); b.getWorldQuaternion(wq); rest.set(b, { p: wp.clone(), q: wq.clone() }); }
  const rp = (n) => rest.get(B(n)).p;
  const rq = (n) => rest.get(B(n)).q;

  const L1 = rp('LeftUpLeg').distanceTo(rp('LeftLeg')), L2 = rp('LeftLeg').distanceTo(rp('LeftFoot'));
  const A1 = rp('LeftArm').distanceTo(rp('LeftForeArm')), A2 = rp('LeftForeArm').distanceTo(rp('LeftHand'));
  const ARM = A1 + A2;
  const palmFwd = rp('LeftHand').distanceTo(rp('LeftHandMiddle1'));

  // palm normals at rest (T-pose: palms down)
  const palmN = {};
  for (const side of ['Left', 'Right']) {
    const m = rp(`${side}HandMiddle1`).clone().sub(rp(`${side}Hand`)).normalize();
    const t = rp(`${side}HandThumb1`).clone().sub(rp(`${side}HandPinky1`)).normalize();
    const n = new THREE.Vector3().crossVectors(m, t).normalize();
    if (n.y > 0) n.negate();
    palmN[side] = n;
  }

  /* ---- bone helpers (world space) ---- */
  const _pq = new THREE.Quaternion(), _q = new THREE.Quaternion(), _d = new THREE.Quaternion(), _tw = new THREE.Quaternion();
  const AX = v3(1, 0, 0), AY = v3(0, 1, 0), AZ = v3(0, 0, 1);
  const rot = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
  const setWQ = (b, qW) => {
    b.parent.getWorldQuaternion(_pq);
    b.quaternion.copy(_pq.invert().multiply(qW));
    b.updateWorldMatrix(false, true);
  };
  const aim = (b, child, dir, twist = 0) => {
    const base = rest.get(child).p.clone().sub(rest.get(b).p).normalize();
    _d.setFromUnitVectors(base, dir);
    _q.copy(_d).multiply(rest.get(b).q);
    if (twist) _q.premultiply(_tw.setFromAxisAngle(dir, twist));
    setWQ(b, _q);
  };
  const rollTo = (b, child, dir, nRest, nWant) => {
    const base = rest.get(child).p.clone().sub(rest.get(b).p).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(base, dir);
    const n0 = nRest.clone().applyQuaternion(delta);
    n0.addScaledVector(dir, -n0.dot(dir)).normalize();
    const n1 = nWant.clone().addScaledVector(dir, -nWant.dot(dir)).normalize();
    return Math.atan2(dir.dot(new THREE.Vector3().crossVectors(n0, n1)), n0.dot(n1));
  };
  // two-bone IK: elbow/knee K and the reached end point E
  const _dir = v3(), _perp = v3();
  function ik(H, T, l1, l2, pole, K, E, maxFrac) {
    _dir.copy(T).sub(H);
    const d = Math.min(Math.max(_dir.length(), Math.abs(l1 - l2) + 0.04), (l1 + l2) * maxFrac);
    _dir.normalize();
    E.copy(H).addScaledVector(_dir, d);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir)).normalize();
    K.copy(H).addScaledVector(_dir, a).addScaledVector(_perp, h);
  }

  // fingers close around the bar: curl axis = finger direction x palm normal, taken at rest
  const FINGERS = [['Index', 1.0], ['Middle', 1.05], ['Ring', 1.1], ['Pinky', 1.15]];
  const CURL = [rad(54), rad(74), rad(48)];
  const THUMB = [rad(10), rad(30), rad(38)];
  const qa = new THREE.Quaternion(), ax = v3(), fdir = v3();
  const restLocal = new Map();
  for (const b of Object.values(bones)) restLocal.set(b, b.quaternion.clone());
  function curlChain(side, chain, angles, k) {
    chain.forEach((name, i) => {
      const b = B(name), next = B(chain[i + 1] ?? name.replace(/\d$/, '4'));
      if (!b || !next) return;
      const r = rest.get(b);
      fdir.copy(rest.get(next).p).sub(r.p).normalize();
      ax.crossVectors(fdir, palmN[side]).normalize().applyQuaternion(r.q.clone().invert());
      b.quaternion.copy(restLocal.get(b)).multiply(qa.setFromAxisAngle(ax, angles[i] * k));
    });
    B(chain[0]).updateWorldMatrix(false, true);
  }
  function grip(side, wrap) {
    for (const [f, k] of FINGERS) curlChain(side, [1, 2, 3].map((i) => `${side}Hand${f}${i}`), CURL, k * wrap);
    curlChain(side, [1, 2, 3].map((i) => `${side}HandThumb${i}`), THUMB, wrap);
  }

  /* ---- stance ---- */
  const hips = B('Hips');
  const hipsRest = rp('Hips').clone();
  const FOOT_X = 0.165;                           // feet about shoulder-width apart (T-pose stands narrower)
  const ankleRest = { Left: rp('LeftFoot').clone(), Right: rp('RightFoot').clone() };
  for (const [side, s] of [['Left', 1], ['Right', -1]]) { ankleRest[side].x = s * FOOT_X; ankleRest[side].z += 0.01; }

  const H = v3(), T = v3(), K = v3(), E = v3(), Wr = v3(), Ws = v3(), Gs = v3(), pole = v3(), nIn = v3(), df = v3(), tmp = v3();
  const grips = [{ pos: v3(), axis: v3(1, 0, 0), up: v3(0, 1, 0) }, { pos: v3(), axis: v3(1, 0, 0), up: v3(0, 1, 0) }];

  function leg(side, s) {
    const upLeg = B(`${side}UpLeg`), knee = B(`${side}Leg`), foot = B(`${side}Foot`);
    upLeg.getWorldPosition(H);
    pole.set(s * 0.16, 0, 1).normalize();         // knees track forward and a touch out, over the toes
    ik(H, ankleRest[side], L1, L2, pole, K, E, 0.998);
    aim(upLeg, knee, tmp.copy(K).sub(H).normalize());
    aim(knee, foot, tmp.copy(E).sub(K).normalize());
    setWQ(foot, rot(AY, s * rad(9)).multiply(rq(`${side}Foot`)));   // flat feet, toes turned out a little
  }

  function arm(side, s, p, shrug) {
    const sh = B(`${side}Shoulder`), ar = B(`${side}Arm`), fa = B(`${side}ForeArm`), hd = B(`${side}Hand`), mid = B(`${side}HandMiddle1`);
    setWQ(sh, rot(AZ, s * shrug).multiply(rq(`${side}Shoulder`)));
    ar.getWorldPosition(H);

    // where the fist goes, relative to the shoulder joint
    const Rg = ARM * ARM_SOFT + palmFwd;
    const e = p, w = sstep(0, 1, p);
    // hands bow outward mid-press so the forearms stay close to vertical over the elbows
    const ox = s * (lerp(0.112, 0.082, w) + 0.06 * Math.sin(p * Math.PI)), oz = lerp(0.1, 0.012, w) - 0.016 * Math.sin(p * Math.PI);
    const oy = lerp(0.045, Rg, e);
    Gs.set(H.x + ox, H.y + oy, H.z + oz);
    nIn.set(s * 0.08, 0, 1).normalize();          // palm faces forward
    pole.set(s * lerp(0.35, 0.8, w), lerp(-1, 0.1, w), lerp(0.25, -0.55, w)).normalize();   // elbows down and out, then soft outward at lockout

    df.copy(Gs).sub(H).normalize();
    for (let it = 0; it < 3; it++) {
      // the fist's centre sits PALM_OUT in front of the knuckle line and FIST_UP along the hand
      Ws.copy(Gs).addScaledVector(df, -(palmFwd + FIST_UP)).addScaledVector(nIn, -PALM_OUT);
      ik(H, Ws, A1, A2, pole, K, Wr, 0.985);
      df.copy(Wr).sub(K).normalize();
    }
    const tau = rollTo(hd, mid, df, palmN[side], nIn);
    aim(ar, fa, tmp.copy(K).sub(H).normalize());
    aim(fa, hd, df, tau * 0.65);
    aim(hd, mid, df, tau);
    grip(side, 1);

    // handle centre = the hollow the curled fingers actually form (midway between knuckle and 2nd joint of the middle finger); axis across the fist
    const g = grips[s > 0 ? 0 : 1];
    mid.getWorldPosition(g.pos);
    B(`${side}HandMiddle3`).getWorldPosition(tmp);
    g.pos.add(tmp).multiplyScalar(0.5);
    g.axis.crossVectors(df, nIn).normalize();
    if (g.axis.x < 0) g.axis.negate();
    g.up.copy(df).addScaledVector(g.axis, -df.dot(g.axis)).normalize();
  }

  // morph targets (ARKit blendshapes) on every mesh that has them
  const setMorph = (name, v) => {
    for (const m of morphMeshes) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; }
  };

  /** Pose the whole body for clock t. Returns the two handle placements for the dumbbells. */
  function update(t) {
    const pL = pressAt(t), pR = pressAt(t - 0.03);   // the right side trails a hair, as real arms do
    const p = (pL + pR) / 2;
    const w = sstep(0, 1, p);
    const lift = sstep(0.55, 1, p);
    const inhale = 1 - sstep(0, 1, pressAt(t - 0.5)); // breathe in on the way down, out on the way up

    // pelvis: soft knees, a gentle weight shift, rising slightly on the drive
    const sway = Math.sin((t / CYCLE) * Math.PI * 2) * 0.004;
    tmp.set(hipsRest.x + sway, hipsRest.y - (0.016 - 0.007 * w), hipsRest.z - 0.004 * w);
    hips.position.copy(hips.parent.worldToLocal(tmp));
    setWQ(hips, rot(AY, sway * 1.6).multiply(rq('Hips')));

    // trunk: a few degrees of lay-back as the load goes overhead, the chest lifting with the breath
    const ext = rad(1.2) + rad(4.5) * w;
    setWQ(B('Spine'), rot(AX, -ext * 0.35).multiply(rq('Spine')));
    setWQ(B('Spine1'), rot(AX, -ext * 0.7 + 0.004 * inhale).multiply(rq('Spine1')));
    setWQ(B('Spine2'), rot(AX, -ext * 1.0 + 0.012 * inhale).multiply(rq('Spine2')));
    // neck and head keep the eyes level, lifting a touch to follow the dumbbells up
    setWQ(B('Neck'), rot(AX, rad(-1.5) - 0.02 * w).multiply(rq('Neck')));
    setWQ(B('Head'), rot(AX, rad(-1) - 0.05 * w).multiply(rot(AY, Math.sin(t * 0.37) * 0.025)).multiply(rq('Head')));

    arm('Left', 1, pL, 0.2 * lift);
    arm('Right', -1, pR, 0.2 * lift);
    leg('Left', 1);
    leg('Right', -1);

    // face: relaxed, a little effort and a long exhale near lockout, and a blink now and then
    const blink = Math.max(0, 1 - Math.abs(((t + 1.3) % 4.1) - 0.08) / 0.09);
    setMorph('eyeBlinkLeft', blink); setMorph('eyeBlinkRight', blink);
    const eff = sstep(0.35, 0.9, p) * (1 - sstep(0.9, 1, pressAt(t + 0.6) > 0.98 ? 0 : 1));
    setMorph('browDownLeft', 0.18 * eff); setMorph('browDownRight', 0.18 * eff);
    setMorph('eyeSquintLeft', 0.16 * eff); setMorph('eyeSquintRight', 0.16 * eff);
    setMorph('mouthPressLeft', 0.28 * eff); setMorph('mouthPressRight', 0.28 * eff);
    setMorph('jawOpen', 0.025 + 0.07 * lift * (1 - sstep(0.3, 0.8, pressAt(t - 1.0))));
    setMorph('mouthSmileLeft', 0.04); setMorph('mouthSmileRight', 0.04);
    return grips;
  }

  const dispose = () => {
    model.traverse((o) => {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach((m) => { for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose(); m.dispose(); });
    });
  };
  return { root, update, dispose, bones, meshes, palmN, rest };
}

/* ------------------------------------------------------------------------------------------------ */
/*  The scene                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Mounts the lifter in `host` (a positioned element; the canvas fills it). Returns
 *   ready      Promise<boolean>: model loaded, shaders compiled, first frame drawn. false = unavailable.
 *   setActive  start / stop drawing (it renders nothing while inactive)
 *   setTime    pose for an exact clock value (testing, stills)
 *   destroy    release the GPU context and the model
 */
export function createLifter(host, { small = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'chap__cv chap__cv--3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  let renderer = null, dead = false, active = false, raf = 0, last = 0, t = 0, started = false;
  const own = [];
  const view = { yaw: 0.34, sway: 0.2, px: 0, py: 0, tx: 0, ty: 0, fov: 26, lookX: 0, lookY: 1.1, fitH: 2.5, fitW: 1.9, camY: 1.5 };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(view.fov, 1, 0.1, 40);
  let athlete = null, rt = null;
  const bells = [];

  function frame() {
    const g = athlete.update(t);
    for (let i = 0; i < 2; i++) {
      const b = bells[i], d = g[i];
      b.position.copy(d.pos);
      b.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d.axis, d.up, new THREE.Vector3().crossVectors(d.axis, d.up)));
    }
    // camera: a slow orbit either side of three-quarter view, leaning a touch toward the pointer
    const yaw = view.yaw + Math.sin(t * 0.33) * view.sway + view.px * 0.12;
    const tanH = Math.tan(THREE.MathUtils.degToRad(view.fov) / 2);
    const dist = Math.max((view.fitH / 2) / tanH, (view.fitW / 2) / (tanH * camera.aspect));
    camera.position.set(Math.sin(yaw) * dist, view.camY - view.py * 0.12, Math.cos(yaw) * dist);
    camera.lookAt(view.lookX, view.lookY, 0);
    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer) return;
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = view.fov; camera.updateProjectionMatrix();
    if (athlete && !active) frame();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    view.px += (view.tx - view.px) * Math.min(1, dt * 3);
    view.py += (view.ty - view.py) * Math.min(1, dt * 3);
    t += dt;
    frame();
  }

  function setActive(on) {
    if (dead || !athlete || on === active) return;
    active = on;
    cancelAnimationFrame(raf);
    if (on) {
      if (!started) { started = true; t = START; }
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  const onPointer = (e) => { view.tx = (e.clientX / innerWidth) * 2 - 1; view.ty = (e.clientY / innerHeight) * 2 - 1; };
  let ro = null;

  const ready = (async () => {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;

      rt = buildEnvironment(renderer);
      scene.environment = rt.texture;
      scene.environmentIntensity = 0.9;

      // light: a warm key from the upper left, an amber rim from behind right, a soft top accent
      const key = new THREE.SpotLight('#ffe0b0', 120, 16, 0.42, 0.85, 2);
      key.position.set(-2.3, 3.7, 3.4); key.target.position.set(0, 1.1, 0);
      key.castShadow = true; key.shadow.mapSize.set(small ? 768 : 1536, small ? 768 : 1536);
      key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
      const rim = new THREE.SpotLight('#ffa23c', 140, 14, 0.5, 0.9, 2);
      rim.position.set(2.5, 2.7, -2.7); rim.target.position.set(0, 1.2, 0);
      const rim2 = new THREE.SpotLight('#ffc98a', 60, 14, 0.5, 0.9, 2);
      rim2.position.set(-2.6, 2.4, -2.4); rim2.target.position.set(0, 1.3, 0);
      const hemi = new THREE.HemisphereLight('#ffeacc', '#2a1c10', 0.4);
      scene.add(key, key.target, rim, rim.target, rim2, rim2.target, hemi);

      // a soft amber halo behind her, so the silhouette separates from the arch
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 4.2),
        new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,176,80,0.5)', 'rgba(255,150,60,0.12)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }),
      );
      own.push(halo.geometry, halo.material, halo.material.map);
      halo.position.set(0, 1.3, -1.4); scene.add(halo);
      scene.add(buildPlatform(own));

      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/athlete.glb`);
      if (dead) { gltf.scene.traverse((o) => { o.geometry?.dispose?.(); }); return false; }
      athlete = buildAthlete(gltf, scene);
      for (let i = 0; i < 2; i++) { const b = buildDumbbell(own); bells.push(b); scene.add(b); }

      ro = new ResizeObserver(resize); ro.observe(host);
      window.addEventListener('pointermove', onPointer, { passive: true });
      resize();
      t = START; frame();
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      if (dead) return false;
      t = START; frame();
      canvas.classList.add('is-ready');
      return true;
    } catch (err) {
      console.warn('[lifter] 3D unavailable', err);
      destroy();
      return false;
    }
  })();

  function destroy() {
    if (dead) return;
    dead = true; active = false;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('pointermove', onPointer);
    athlete?.dispose();
    own.forEach((o) => o.dispose?.());
    scene.traverse((o) => { if (o.isMesh && !athlete?.meshes.includes(o)) { o.geometry?.dispose?.(); } });
    rt?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas.remove();
  }

  return {
    ready, setActive, destroy,
    setTime(v) { if (!athlete) return; t = v; frame(); },
    view, camera, scene, get athlete() { return athlete; }, get renderer() { return renderer; },
  };
}
