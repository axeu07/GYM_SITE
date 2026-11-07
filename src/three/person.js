import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// A skinned woman (Ready Player Me style, Mixamo-rigged) doing Reformer footwork with straps.
//
// Choreography: she lies supine, both feet on the footbar pads, both hands gripping the strap handles.
// As the legs push the carriage toward the head end, her arms sweep from reaching toward the head end
// to reaching toward the feet, which keeps the hands roughly where the (fixed-length, taut) ropes
// hold them. Everything is a pure function of the one extension value `c` (0..1) that moves the
// carriage: carriage centre x = 0.30 - 0.55 c, same as reformer.js. No clocks of her own.
//
// Frame F = the reformer's local frame (metres, Y up, X = head end -> foot end). All maths is done in
// F, so the stage's cursor-parallax rotation of the holder group cannot misplace her relative to the machine.

const CARRIAGE_HOME = 0.3, CARRIAGE_TRAVEL = 0.55;
const CUSHION_TOP = 0.285 + 0.0905;              // carriage group y + cushion surface
const BAR_X = 0.88, BAR_Y = 0.52, BAR_R = 0.021; // the footbar's padded tubes (reformer.js)
const PAD_Z = 0.17;                              // rubber pads at z = +-0.17: hip-width stance
const HEIGHT = 1.76;
const MAX_REACH = 0.985;                         // leg never fully locked
const ARM_REACH = 0.93;                          // arms nearly straight, soft elbows
const PULLEYS = [new THREE.Vector3(-1.07, 0.99, -0.3024), new THREE.Vector3(-1.07, 0.99, 0.3024)]; // [left(-z), right(+z)], reformer.js
const RING_OFFSET = 0.075;                       // grip centre -> rope ring (must match reformer.js)

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const rad = THREE.MathUtils.degToRad;

export function loadPerson({ small } = {}) {
  const url = `${import.meta.env.BASE_URL}models/athlete.glb`;
  return new GLTFLoader().loadAsync(url).then((gltf) => buildPerson(gltf, small));
}

// Re-seat the avatar's PBR materials as physical materials: soft sheen on skin (peach fuzz at grazing
// angles), a fabric sheen on the sports kit, and a gentle sheen on the hair.
function upgradeMaterial(m) {
  const p = new THREE.MeshPhysicalMaterial({
    name: m.name, color: m.color?.clone(), map: m.map, normalMap: m.normalMap, normalScale: m.normalScale?.clone(),
    roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap, aoMap: m.aoMap, alphaMap: m.alphaMap,
    emissive: m.emissive?.clone(), emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, depthWrite: m.depthWrite,
    roughness: m.roughness ?? 0.7, metalness: m.metalness ?? 0, envMapIntensity: 0.75,
  });
  const n = m.name || '';
  if (/skin/i.test(n)) {
    p.roughness = 0.52; p.metalness = 0; p.specularIntensity = 0.7;
    p.sheen = 0.85; p.sheenRoughness = 0.5; p.sheenColor = new THREE.Color('#ffc9ad');
    if (p.normalScale) p.normalScale.setScalar(0.7);
  } else if (/hair/i.test(n)) {
    p.roughness = 0.5; p.metalness = 0; p.sheen = 0.7; p.sheenRoughness = 0.4; p.sheenColor = new THREE.Color('#7b5b48');
  } else if (/body/i.test(n)) {
    p.roughness = 0.55; p.metalness = 0; p.specularIntensity = 0.7;
    p.sheen = 0.8; p.sheenRoughness = 0.5; p.sheenColor = new THREE.Color('#ffc9ad');
  } else if (/outfit|footwear/i.test(n)) {
    p.roughness = Math.max(p.roughness, 0.62); p.metalness = Math.min(p.metalness, 0.15);
    p.sheen = 0.18; p.sheenRoughness = 0.8; p.sheenColor = new THREE.Color('#d9c8c0');
  }
  m.dispose?.();
  return p;
}

function buildPerson(gltf, small) {
  const root = new THREE.Group();
  const model = gltf.scene;
  root.add(model);

  const bones = {};
  const meshes = [];
  model.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      if (/glasses/i.test(o.name)) { o.visible = false; return; }   // she is lying down: no spectacles
      meshes.push(o); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map(upgradeMaterial) : upgradeMaterial(o.material);
    }
  });
  const B = (n) => bones[n];

  // ---- scale to height, measured on the mesh in its rest pose ----
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  meshes.forEach((m) => box.expandByObject(m, true));
  const S = HEIGHT / (box.max.y - box.min.y);
  root.scale.setScalar(S);
  root.updateMatrixWorld(true);

  // Rest (T-pose) transforms in frame F (root not yet attached, so world == F here) + rest local rotations.
  const rest = new Map(), restLocal = new Map();
  const wp = v3(0, 0, 0), wq = new THREE.Quaternion();
  for (const b of Object.values(bones)) {
    b.getWorldPosition(wp); b.getWorldQuaternion(wq);
    rest.set(b, { p: wp.clone(), q: wq.clone() });
    restLocal.set(b, b.quaternion.clone());
  }
  const rp = (n) => rest.get(B(n)).p;

  // Rotation that lays the standing body on her back: up -> -X (toward the headrest), chest -> +Y.
  const up = rp('Head').clone().sub(rp('Hips')).normalize();
  const left = rp('LeftUpLeg').clone().sub(rp('RightUpLeg')).normalize();
  const fwd = new THREE.Vector3().crossVectors(left, up).normalize();
  const toeDir = rp('LeftToeBase').clone().sub(rp('LeftFoot')); toeDir.y = 0;
  if (fwd.dot(toeDir) < 0) fwd.negate();
  const from = new THREE.Matrix4().makeBasis(left, up, fwd);
  const to = new THREE.Matrix4().makeBasis(v3(0, 0, -1), v3(-1, 0, 0), v3(0, 1, 0));
  const lie = new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.clone().invert()));

  const L1 = rp('LeftUpLeg').distanceTo(rp('LeftLeg')), L2 = rp('LeftLeg').distanceTo(rp('LeftFoot'));
  const LEG = L1 + L2;
  const hipOffset = rp('LeftUpLeg').clone().sub(rp('Hips')).applyQuaternion(lie);
  const footLen = rp('LeftFoot').distanceTo(rp('LeftToeBase'));
  const A1 = rp('LeftArm').distanceTo(rp('LeftForeArm')), A2 = rp('LeftForeArm').distanceTo(rp('LeftHand'));
  const ARM = A1 + A2;
  const palmFwd = rp('LeftHand').distanceTo(rp('LeftHandMiddle1'));     // wrist -> knuckle
  const PALM_OUT = 0.027;                                               // knuckle line -> grip centre, on the palm side

  // Palm normals at rest (T-pose: palms down). n = +-(finger dir x thumb-pinky dir), signed to face down.
  const palmN = {};
  for (const side of ['Left', 'Right']) {
    const m = rp(`${side}HandMiddle1`).clone().sub(rp(`${side}Hand`)).normalize();
    const t = rp(`${side}HandThumb1`).clone().sub(rp(`${side}HandPinky1`)).normalize();
    const n = new THREE.Vector3().crossVectors(m, t).normalize();
    if (n.y > 0) n.negate();
    palmN[side] = n;
  }

  // ---- where she lies: hips such that c = 1 leaves the legs almost straight ----
  const FD0 = v3(0.55, -0.835, 0).normalize();
  const dorsalOf = (fd) => v3(-fd.y, fd.x, 0);
  const ballFor = (fd, z) => v3(BAR_X, BAR_Y, z).addScaledVector(dorsalOf(fd), BAR_R + 0.03);
  const ANKLE0 = ballFor(FD0, PAD_Z).addScaledVector(FD0, -footLen);
  const hipJointAt = (c, h, hy) => v3(CARRIAGE_HOME - CARRIAGE_TRAVEL * c + h, hy, 0).add(hipOffset);
  const HIP_Y_GUESS = CUSHION_TOP + 0.1;
  let lo = 0, hi = 0.46;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const d = hipJointAt(1, mid, HIP_Y_GUESS).setZ(PAD_Z).distanceTo(ANKLE0);
    if (d > LEG * MAX_REACH) lo = mid; else hi = mid;
  }
  const HIP_X = (lo + hi) / 2;

  // ---- frame F plumbing: the holder group is rotated by the cursor; compute everything holder-relative ----
  const Mp = new THREE.Matrix4(), Mpi = new THREE.Matrix4(), Qp = new THREE.Quaternion();
  function sync() {
    const par = root.parent;
    if (par) { par.updateWorldMatrix(true, false); Mp.copy(par.matrixWorld); } else Mp.identity();
    Mpi.copy(Mp).invert();
    Qp.setFromRotationMatrix(Mp);
  }
  const fpos = (b, out) => b.getWorldPosition(out).applyMatrix4(Mpi);

  const _pq = new THREE.Quaternion(), _q = new THREE.Quaternion(), _d = new THREE.Quaternion(), _t = new THREE.Quaternion(), _a = v3(0, 0, 0);
  const setFQ = (b, qF) => {                          // qF: desired orientation in frame F
    _t.copy(Qp).multiply(qF);
    b.parent.getWorldQuaternion(_pq);
    b.quaternion.copy(_pq.invert().multiply(_t));
    b.updateWorldMatrix(false, true);
  };
  const lying = (b, pitch = 0) => {
    _q.setFromAxisAngle(_a.set(0, 0, 1), pitch).multiply(lie).multiply(rest.get(b).q);
    setFQ(b, _q);
  };
  // Signed roll about `dir` that carries the bone's rest normal `nRest` (after the aim swing) onto `nWant`.
  const rollTo = (b, child, dir, nRest, nWant) => {
    const r = rest.get(b), rc = rest.get(child);
    const base = rc.p.clone().sub(r.p).normalize().applyQuaternion(lie);
    const delta = new THREE.Quaternion().setFromUnitVectors(base, dir);
    const n0 = nRest.clone().applyQuaternion(lie).applyQuaternion(delta);
    n0.addScaledVector(dir, -n0.dot(dir)).normalize();
    const n1 = nWant.clone().addScaledVector(dir, -nWant.dot(dir)).normalize();
    return Math.atan2(dir.dot(new THREE.Vector3().crossVectors(n0, n1)), n0.dot(n1));
  };
  const aim = (b, child, dir, twist = 0) => {
    const r = rest.get(b), rc = rest.get(child);
    const base = rc.p.clone().sub(r.p).normalize().applyQuaternion(lie);
    _d.setFromUnitVectors(base, dir);
    _q.copy(_d).multiply(lie).multiply(r.q);
    if (twist) _q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, twist));
    setFQ(b, _q);
  };

  // Two-bone IK: writes the middle joint (K) and the reached end point (A).
  const _ikDir = v3(0, 0, 0), _ikPerp = v3(0, 0, 0);
  function ik(Hp, T, l1, l2, pole, K, A, maxFrac) {
    _ikDir.copy(T).sub(Hp);
    const raw = _ikDir.length();
    const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 0.04), (l1 + l2) * maxFrac);
    _ikDir.normalize();
    A.copy(Hp).addScaledVector(_ikDir, d);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _ikPerp.copy(pole).addScaledVector(_ikDir, -pole.dot(_ikDir)).normalize();
    K.copy(Hp).addScaledVector(_ikDir, a).addScaledVector(_ikPerp, h);
    return { raw, d };
  }

  // Curl every finger toward the palm, around a bar. Axis = finger dir x palm normal, taken at rest.
  const FINGERS = [['Index', 1.0], ['Middle', 1.05], ['Ring', 1.1], ['Pinky', 1.15]];
  const CURL = [rad(52), rad(72), rad(46)];
  const THUMB = [rad(8), rad(26), rad(34)];
  const qa = new THREE.Quaternion(), ax = v3(0, 0, 0), fdir = v3(0, 0, 0);
  function curlChain(side, chain, angles, k) {
    const nR = palmN[side];
    chain.forEach((name, i) => {
      const b = B(name), next = B(chain[i + 1] ?? name.replace(/\d$/, '4'));
      if (!b || !next) return;
      const r = rest.get(b);
      fdir.copy(rest.get(next).p).sub(r.p).normalize();
      ax.crossVectors(fdir, nR).normalize().applyQuaternion(r.q.clone().invert());   // into the bone's own frame
      qa.setFromAxisAngle(ax, angles[i] * k);
      b.quaternion.copy(restLocal.get(b)).multiply(qa);
    });
    B(chain[0]).updateWorldMatrix(false, true);
  }
  function grip(side, wrap) {
    for (const [f, k] of FINGERS) curlChain(side, [1, 2, 3].map((i) => `${side}Hand${f}${i}`), CURL, k * wrap);
    curlChain(side, [1, 2, 3].map((i) => `${side}HandThumb${i}`), THUMB, wrap);
  }

  const hips = B('Hips');
  const hp = v3(0, 0, 0), tmp = v3(0, 0, 0);
  const H = v3(0, 0, 0), T = v3(0, 0, 0), K = v3(0, 0, 0), A = v3(0, 0, 0), pole = v3(0, 0, 0);
  const fd = v3(0, 0, 0), dorsal = v3(0, 0, 0), ball = v3(0, 0, 0), shank = v3(0, 0, 0);
  const grips = [v3(0, 0, 0), v3(0, 0, 0)];                 // [left, right] handle centres in frame F, for reformer.js
  grips.axes = [v3(1, 0, 0), v3(1, 0, 0)];                  // grip-bar axis of each handle (across the fist)
  const info = { c: 0, kneeDeg: [0, 0], ankleDeg: [0, 0], footErr: [0, 0], gripErr: [0, 0], elbowDeg: [0, 0], ropeClear: 0, kneeToTorso: 0 };
  let curC = 0, NECK_PITCH = -0.02, HEAD_PITCH = -0.04, ARM_UP = 1, baseline = 0;

  function leg(side, s, idx) {                              // s = +1 left (her left lies at -Z), -1 right
    const upLeg = B(`${side}UpLeg`), knee = B(`${side}Leg`), foot = B(`${side}Foot`), toe = B(`${side}ToeBase`);
    fpos(upLeg, H);
    const z = -s * PAD_Z;
    pole.set(-0.04, 1, -s * 0.07).normalize();               // knees up, tracking the line of the feet
    const plantar = rad(40 + 12 * curC);                     // ankle never near fully pointed (max ~50 deg real plantarflexion)
    fd.copy(FD0);
    for (let it = 0; it < 6; it++) {
      ball.copy(ballFor(fd, z));
      T.copy(ball).addScaledVector(fd, -footLen);
      ik(H, T, L1, L2, pole, K, A, 0.995);
      shank.copy(A).sub(K).normalize();
      const th = Math.atan2(shank.y, shank.x) - plantar;
      fd.set(Math.cos(th), Math.sin(th), 0);
    }
    ball.copy(ballFor(fd, z));
    T.copy(ball).addScaledVector(fd, -footLen);
    const r = ik(H, T, L1, L2, pole, K, A, 0.995);
    aim(upLeg, knee, tmp.copy(K).sub(H).normalize());
    aim(knee, foot, tmp.copy(A).sub(K).normalize());
    const soleWant = dorsalOf(fd).negate();
    aim(foot, toe, fd, rollTo(foot, toe, fd, v3(0, -1, 0), soleWant));
    // bookkeeping for the self-test
    info.kneeDeg[idx] = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - r.d * r.d) / (2 * L1 * L2), -1, 1)));
    info.ankleDeg[idx] = 180 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(shank.dot(fd), -1, 1)));
    fpos(toe, tmp); info.footErr[idx] = tmp.distanceTo(ball);
    info.reach = r.raw / LEG;
  }

  const Ws = v3(0, 0, 0), Gs = v3(0, 0, 0), E = v3(0, 0, 0), Wr = v3(0, 0, 0), df = v3(0, 0, 0), nIn = v3(0, 0, 0);
  function arm(side, s, idx) {
    const sh = B(`${side}Shoulder`), ar = B(`${side}Arm`), fa = B(`${side}ForeArm`), hd = B(`${side}Hand`);
    lying(sh);
    fpos(ar, H);
    // Hand target. Arms nearly straight (soft elbows), angled forward and a little out so the hands pass
    // outside the raised thighs and stay level with or just below the pulleys; the swing runs from
    // "reaching forward and up" at c = 0 to "pressing down toward the hips" at c = 1, so the rope pays
    // out like the machine's own straps do. Hand z matches the pulley z, so each rope stays in one plane.
    const Rg = ARM * ARM_REACH + palmFwd;                       // shoulder -> grip centre
    const zH = -s * 0.31;
    const lat = zH - H.z;
    const inPlane = Math.sqrt(Math.max(0.01, Rg * Rg - lat * lat));
    const phi = rad(44) + rad(22) * curC;                      // from vertical, toward the feet
    Gs.set(H.x + inPlane * Math.sin(phi), H.y + inPlane * Math.cos(phi), zH);
    nIn.set(0, 0, s);                                         // palm faces the midline (neutral grip)
    pole.set(0.1, -0.35, -s).normalize();                     // soft elbows, a little out and down
    df.copy(Gs).sub(H).normalize();
    for (let it = 0; it < 3; it++) {
      // grip centre = wrist + forearm dir * (wrist->knuckle) + palm normal * PALM_OUT
      Ws.copy(Gs).addScaledVector(df, -palmFwd).addScaledVector(nIn, -PALM_OUT);
      ik(H, Ws, A1, A2, pole, E, Wr, 0.985);
      df.copy(Wr).sub(E).normalize();
    }
    const tau = rollTo(hd, B(`${side}HandMiddle1`), df, palmN[side], nIn);
    aim(ar, fa, tmp.copy(E).sub(H).normalize());
    aim(fa, hd, df, tau * 0.65);
    aim(hd, B(`${side}HandMiddle1`), df, tau);
    grip(side, 1);
    // handle centre follows the actual palm: this is what reformer.js hangs the strap from
    fpos(B(`${side}HandMiddle1`), tmp);
    const g = grips[idx];
    g.copy(tmp).addScaledVector(nIn, PALM_OUT).addScaledVector(df, 0.012);
    grips.axes[idx].crossVectors(nIn, df).normalize();       // across the palm: perpendicular to forearm and palm normal
    info.gripErr[idx] = g.distanceTo(Gs);
    info.elbowDeg[idx] = 180 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp((A1 * A1 + A2 * A2 - Wr.distanceTo(H) ** 2) / (2 * A1 * A2), -1, 1)));
  }

  function place(carriageX) {
    hp.set(carriageX + HIP_X, HIP_Y_GUESS + baseline, 0).applyMatrix4(Mp);
    lying(hips);
    hips.parent.updateWorldMatrix(true, false);
    hips.position.copy(hips.parent.worldToLocal(hp));
    hips.updateWorldMatrix(false, true);
  }

  const seg = new THREE.Line3(), cp = v3(0, 0, 0);
  function checks() {
    // rope clearance: closest approach of each rope (pulley -> ring) to head, neck and trunk
    let m = 9;
    for (let i = 0; i < 2; i++) {
      const g = grips[i];
      const ring = tmp.copy(PULLEYS[i]).sub(g).normalize().multiplyScalar(RING_OFFSET).add(g);
      seg.set(PULLEYS[i], ring);
      for (const n of ['Head', 'Neck', 'Spine2', 'Spine1', 'Hips']) {
        fpos(B(n), K); seg.closestPointToPoint(K, true, cp); m = Math.min(m, cp.distanceTo(K));
      }
    }
    info.ropeClear = m;
    let k = 9;
    for (const side of ['Left', 'Right']) { fpos(B(`${side}Leg`), K); for (const n of ['Spine1', 'Spine2', 'Neck']) { fpos(B(n), A); k = Math.min(k, K.distanceTo(A)); } }
    info.kneeToTorso = k;
  }

  /** c: carriage extension 0..1, the same value passed to reformer.update(). */
  function update(c, time = 0) {
    curC = c;
    sync();
    place(CARRIAGE_HOME - CARRIAGE_TRAVEL * c);
    const breath = Math.sin(time * 1.4) * 0.5 + 0.5;
    lying(B('Spine'), 0);
    lying(B('Spine1'), 0.006 * breath);
    lying(B('Spine2'), 0.012 * breath);
    lying(B('Neck'), NECK_PITCH);
    lying(B('Head'), HEAD_PITCH);
    arm('Left', 1, 0); arm('Right', -1, 1);
    leg('Left', 1, 0); leg('Right', -1, 1);
    checks();
    info.c = c;
    return grips;
  }

  // Fit her vertically: the back of the torso settles a hair into the cushion. Fitted with arms
  // lifted (as they are in the exercise) so only the torso and pelvis define the contact.
  update(0, 0);
  const fit = new THREE.Box3();
  meshes.filter((m) => !/hair|head|teeth|eye|footwear/i.test(m.name)).forEach((m) => fit.expandByObject(m, true));
  // the legs/feet are above the cushion, so min.y is the back of the pelvis or shoulder blades
  baseline = (CUSHION_TOP - 0.022) - fit.min.y;
  update(0, 0);

  const dispose = () => {
    model.traverse((o) => {
      o.geometry?.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach((m) => { for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose(); m.dispose(); });
    });
  };

  return { root, update, dispose, info, grips, bones, meshes, params: { HIP_X, LEG, ARM, S, palmN } };
}
