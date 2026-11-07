import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A Pilates Reformer built from primitives (no model download: a few KB of code instead of MBs of GLB).
// Metres, Y up. The long axis is X:  head end (headrest, rope poles) at -X, foot end (footbar,
// springs, standing platform) at +X, matching the Reformers in the studio's own photographs.
// Champagne-gold hardware and ivory upholstery on pale maple, per the brand palette.

const CARRIAGE_HOME = 0.3, CARRIAGE_TRAVEL = 0.55, CARRIAGE_HALF = 0.475, SPRING_END = 0.93;

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d9b480'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 150; i++) {
    const y = Math.random() * 128, a = 0.03 + Math.random() * 0.1;
    g.strokeStyle = Math.random() > 0.5 ? `rgba(120,78,36,${a})` : `rgba(255,236,200,${a})`;
    g.lineWidth = 0.5 + Math.random() * 1.6;
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(150, y + (Math.random() - 0.5) * 6, 330, y + (Math.random() - 0.5) * 6, 512, y + (Math.random() - 0.5) * 4);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// "AT FITNESS" wordmark as an alpha mask (white = ink), used for gold inlay on the frame and
// tone-on-tone embossing on the upholstery.
function brandMask() {
  const W = 1536, H = 128, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  const spaced = (txt, x, font, gap) => {
    g.font = font;
    for (const ch of txt) { g.fillText(ch, x, H / 2 + 3); x += g.measureText(ch).width + gap; }
    return x;
  };
  const measure = (txt, font, gap) => { g.font = font; let w = 0; for (const ch of txt) w += g.measureText(ch).width + gap; return w - gap; };
  const f1 = '800 92px "Montserrat", "Segoe UI", Arial, sans-serif', f2 = '500 92px "Montserrat", "Segoe UI", Arial, sans-serif';
  const w1 = measure('AT', f1, 8), w2 = measure('FITNESS', f2, 30), bar = 56;
  let x = (W - (w1 + bar + w2)) / 2;
  x = spaced('AT', x, f1, 8);
  g.fillRect(x + bar / 2 - 3, 24, 6, H - 48);
  spaced('FITNESS', x + bar, f2, 30);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Fine leather grain / wood pores as bump maps: what makes the surfaces catch the light like real material.
function grainTexture(kind) {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  if (kind === 'leather') {
    for (let i = 0; i < 2600; i++) {
      const v = 90 + Math.random() * 80;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.2, 0, 7); g.fill();
    }
  } else {
    for (let i = 0; i < 420; i++) {
      const v = 100 + Math.random() * 60;
      g.strokeStyle = `rgba(${v},${v},${v},0.5)`; g.lineWidth = 0.5 + Math.random();
      const y = Math.random() * S; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (Math.random() - 0.5) * 4); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

class Helix extends THREE.Curve {
  constructor(coils, radius) { super(); this.coils = coils; this.radius = radius; }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.coils;
    return target.set(t, Math.cos(a) * this.radius, Math.sin(a) * this.radius);
  }
}

export function buildReformer({ small }) {
  const seg = small ? 2 : 4;
  const root = new THREE.Group();
  const wood = woodTexture();
  const mask = brandMask(), leatherBump = grainTexture('leather'), woodBump = grainTexture('wood');
  leatherBump.repeat.set(5, 5); woodBump.repeat.set(2, 1);

  const M = {
    wood: () => new THREE.MeshStandardMaterial({ map: wood, color: '#f0d6ac', roughness: 0.45, metalness: 0, bumpMap: woodBump, bumpScale: 0.6 }),
    gold: () => new THREE.MeshPhysicalMaterial({ color: '#dcbc82', metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.2 }),
    brushed: () => new THREE.MeshStandardMaterial({ color: '#c9a768', metalness: 1, roughness: 0.42 }),
    leather: () => new THREE.MeshPhysicalMaterial({ color: '#ece1cc', roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color('#fff2da'), sheenRoughness: 0.5, bumpMap: leatherBump, bumpScale: 1.4, clearcoat: 0.12, clearcoatRoughness: 0.55 }),
    steel: () => new THREE.MeshStandardMaterial({ color: '#9a7a4c', metalness: 1, roughness: 0.34 }),
    webbing: () => new THREE.MeshStandardMaterial({ color: '#e4d3b0', roughness: 0.85 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: '#1d1713', roughness: 0.9 }),
  };
  // Each part owns its materials so hover can light it up without touching the rest.
  const mats = { frame: M.wood(), carriage: M.leather(), carriageMetal: M.gold(), head: M.leather(), foot: M.gold(), spring: M.steel(), strap: M.webbing(), strapMetal: M.gold(), trim: M.brushed(), rubber: M.rubber() };
  const parts = {};
  const mk = (name) => (parts[name] = { name, group: new THREE.Group(), mats: [], proxy: null });
  const P = { frame: mk('frame'), carriage: mk('carriage'), headrest: mk('headrest'), footbar: mk('footbar'), springs: mk('springs'), straps: mk('straps') };
  P.frame.mats = [mats.frame]; P.carriage.mats = [mats.carriage, mats.carriageMetal]; P.headrest.mats = [mats.head];
  P.footbar.mats = [mats.foot]; P.springs.mats = [mats.spring]; P.straps.mats = [mats.strap, mats.strapMetal];

  const add = (part, mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; part.group.add(mesh); return mesh;
  };
  const box = (part, w, h, d, mat, x, y, z, r = 0.01) => add(part, new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), mat), x, y, z);
  const cyl = (part, r, h, mat, x, y, z, axis = 'y') => {
    const m = add(part, new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, small ? 14 : 24), mat), x, y, z);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
    return m;
  };

  // ---------- frame ----------
  for (const z of [-0.29, 0.29]) {
    box(P.frame, 2.36, 0.1, 0.055, mats.frame, 0, 0.19, z, 0.012);
    box(P.frame, 2.2, 0.012, 0.028, mats.trim, 0, 0.2475, z, 0.004);          // the track
    for (const x of [-1.08, 1.08]) { box(P.frame, 0.06, 0.14, 0.06, mats.frame, x, 0.07, z, 0.012); box(P.frame, 0.075, 0.02, 0.075, mats.rubber, x, 0.01, z, 0.008); }
  }
  for (const x of [-1.16, 1.16]) box(P.frame, 0.06, 0.09, 0.64, mats.frame, x, 0.19, 0, 0.012);
  box(P.frame, 0.06, 0.07, 0.56, mats.frame, 0, 0.17, 0, 0.01);                // mid cross-beam
  box(P.footbar, 0.26, 0.045, 0.6, mats.carriage, 1.07, 0.268, 0, 0.02);        // standing platform

  // ---------- footbar ----------
  for (const z of [-0.26, 0.26]) {
    cyl(P.footbar, 0.014, 0.3, mats.foot, 0.88, 0.37, z);
    box(P.footbar, 0.05, 0.05, 0.04, mats.trim, 0.88, 0.235, z * 1.04, 0.006);
  }
  cyl(P.footbar, 0.017, 0.56, mats.foot, 0.88, 0.52, 0, 'z');
  for (const z of [-0.17, 0.17]) cyl(P.footbar, 0.021, 0.12, mats.head, 0.88, 0.52, z, 'z');

  // ---------- carriage (moves) ----------
  const carriage = new THREE.Group();
  const cb = (w, h, d, mat, x, y, z, r) => box(P.carriage, w, h, d, mat, x, y, z, r);
  const addTo = (grp, part, mesh) => { part.group.remove(mesh); grp.add(mesh); };
  const carriageMeshes = [
    cb(0.95, 0.035, 0.5, mats.carriageMetal, 0, 0, 0, 0.01),
    cb(0.9, 0.07, 0.46, mats.carriage, 0, 0.055, 0, 0.032),
    cb(0.95, 0.05, 0.016, mats.carriageMetal, 0, 0.0, 0.258, 0.006),
    cb(0.95, 0.05, 0.016, mats.carriageMetal, 0, 0.0, -0.258, 0.006),
    cb(0.02, 0.055, 0.46, mats.carriageMetal, CARRIAGE_HALF, -0.01, 0, 0.006),   // spring plate
  ];
  carriageMeshes.forEach((m) => addTo(carriage, P.carriage, m));
  const headMeshes = [
    box(P.headrest, 0.22, 0.05, 0.3, mats.head, -0.34, 0.12, 0, 0.022),
    box(P.headrest, 0.06, 0.1, 0.09, mats.head, -0.12, 0.14, 0.2, 0.02),
    box(P.headrest, 0.06, 0.1, 0.09, mats.head, -0.12, 0.14, -0.2, 0.02),
  ];
  headMeshes[0].rotation.z = 0.13;
  headMeshes.forEach((m) => addTo(carriage, P.headrest, m));
  // the carriage's two part-groups live inside the moving group
  root.add(P.frame.group, P.footbar.group, P.springs.group, P.straps.group);
  root.add(carriage);
  carriage.position.y = 0.285;

  // ---------- springs ----------
  const helix = new THREE.TubeGeometry(new Helix(small ? 18 : 24, 0.016), small ? 140 : 260, 0.0042, 5, false);
  const springs = [-0.2, -0.1, 0, 0.1, 0.2].map((z) => {
    const m = new THREE.Mesh(helix, mats.spring);
    m.castShadow = true; m.position.set(0, 0.238, z);
    P.springs.group.add(m);
    return m;
  });
  box(P.springs, 0.02, 0.07, 0.5, mats.trim, SPRING_END, 0.235, 0, 0.006);

  // ---------- rope poles, pulleys, straps (head end) ----------
  const handles = [];
  const POLE_X = -1.1, POLE_TOP = 1.02;
  for (const z of [-0.36, 0.36]) {
    cyl(P.straps, 0.016, POLE_TOP - 0.14, mats.strapMetal, POLE_X, (POLE_TOP + 0.14) / 2, z);
    box(P.straps, 0.07, 0.04, 0.07, mats.trim, POLE_X, 0.16, z, 0.008);
    const pulley = cyl(P.straps, 0.04, 0.016, mats.strapMetal, POLE_X + 0.03, POLE_TOP - 0.03, z * 0.84, 'z');
    pulley.rotation.x = Math.PI / 2;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 1, 6), mats.strap);
    rope.castShadow = true; P.straps.group.add(rope);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0065, 8, small ? 20 : 32), mats.strapMetal);
    ring.castShadow = true; P.straps.group.add(ring);
    const loop = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.13, 0.006, 1, 0.002), mats.strap);
    loop.castShadow = true; P.straps.group.add(loop);
    // the grip bar a hand closes round (axis along X); only shown when a rider supplies grip positions
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.115, small ? 12 : 20), mats.head);
    bar.rotation.z = Math.PI / 2; bar.castShadow = true;
    const grip = new THREE.Group(); grip.add(bar); grip.visible = false; P.straps.group.add(grip);
    handles.push({ rope, ring, loop, grip, z: z * 0.84, pulley: new THREE.Vector3(POLE_X + 0.03, POLE_TOP - 0.03, z * 0.84) });
  }
  cyl(P.straps, 0.013, 0.72, mats.strapMetal, POLE_X, POLE_TOP + 0.01, 0, 'z');

  // ---------- AT FITNESS branding: inlaid on every face so it reads from any viewing angle ----------
  const inlayMat = new THREE.MeshPhysicalMaterial({ color: '#e8c987', metalness: 1, roughness: 0.2, clearcoat: 0.5, transparent: true, alphaMap: mask, alphaTest: 0.35, polygonOffset: true, polygonOffsetFactor: -4 });
  const shadeMat = new THREE.MeshBasicMaterial({ color: '#2a170a', transparent: true, opacity: 0.55, alphaMap: mask, alphaTest: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const embossMat = new THREE.MeshStandardMaterial({ color: '#b79a6c', roughness: 0.6, transparent: true, alphaMap: mask, alphaTest: 0.35, polygonOffset: true, polygonOffsetFactor: -4 });
  const brandMeshes = [];
  const brand = (parent, w, pos, rot, mat = inlayMat, shade = true) => {
    const h = w * 128 / 1536, geo = new THREE.PlaneGeometry(w, h);
    const grp = new THREE.Group(); grp.position.set(...pos); grp.rotation.set(...rot);
    if (shade) { const sh = new THREE.Mesh(geo, shadeMat); sh.position.set(0.0012, -0.0016, -0.0003); grp.add(sh); }
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; grp.add(m);
    brandMeshes.push(geo); parent.add(grp);
  };
  const FZ = 0.29 + 0.0275 + 0.0008;
  brand(P.frame.group, 0.82, [0.0, 0.19, FZ], [0, 0, 0]);                  // near long side
  brand(P.frame.group, 0.82, [0.0, 0.19, -FZ], [0, Math.PI, 0]);           // far long side
  brand(P.frame.group, 0.5, [-1.16 - 0.0308, 0.19, 0], [0, -Math.PI / 2, 0]); // head end
  brand(P.frame.group, 0.5, [1.16 + 0.0308, 0.19, 0], [0, Math.PI / 2, 0]);   // foot end
  // upholstery: embossed on the carriage top (reads from either end) and the standing platform
  brand(carriage, 0.3, [-0.02, 0.0915, 0], [-Math.PI / 2, 0, Math.PI / 2], embossMat, false);
  brand(carriage, 0.3, [0.3, 0.0915, 0], [-Math.PI / 2, 0, -Math.PI / 2], embossMat, false);
  brand(P.footbar.group, 0.5, [1.07, 0.2912, 0], [-Math.PI / 2, 0, Math.PI / 2], embossMat, false);
  // carriage side plates and the rope-pole crossbar carry the mark too
  brand(carriage, 0.5, [0, 0, 0.2665], [0, 0, 0]);
  brand(carriage, 0.5, [0, 0, -0.2665], [0, Math.PI, 0]);
  // stitched seam round the carriage cushion
  const seamTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 8;
    const g = c.getContext('2d'); g.fillStyle = '#6b5638';
    for (let x = 0; x < 512; x += 16) g.fillRect(x, 2, 9, 3);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const seamMat = new THREE.MeshBasicMaterial({ map: seamTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
  const seam = (len, x, z, ry) => {
    const g = new THREE.PlaneGeometry(len, 0.006); const m = new THREE.Mesh(g, seamMat);
    m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.0903, z); carriage.add(m); brandMeshes.push(g);
  };
  seam(0.8, 0, 0.19, 0); seam(0.8, 0, -0.19, 0);
  // screw heads and brass bolts along the rails
  const screwGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 10);
  for (const z of [-1, 1]) for (const x of [-1.05, -0.55, 0, 0.55, 1.05]) {
    const sc = new THREE.Mesh(screwGeo, mats.trim); sc.rotation.x = Math.PI / 2;
    sc.position.set(x, 0.155, z * (0.29 + 0.0275 + 0.0015)); P.frame.group.add(sc);
  }
  brandMeshes.push(screwGeo);

  // ---------- hover proxies (cheap raycast targets; never rendered) ----------
  const proxy = (part, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z); m.userData.part = part.name; root.add(m); return m;
  };
  const proxies = {
    frame: proxy(P.frame, 2.4, 0.12, 0.7, 0, 0.17, 0),
    footbar: proxy(P.footbar, 0.5, 0.36, 0.68, 0.95, 0.38, 0),
    springs: proxy(P.springs, 0.9, 0.08, 0.5, 0.5, 0.238, 0),
    straps: proxy(P.straps, 0.4, 0.95, 0.8, -1.02, 0.55, 0),
    carriage: proxy(P.carriage, 0.95, 0.12, 0.52, 0, 0.3, 0),
    headrest: proxy(P.headrest, 0.3, 0.14, 0.52, -0.34, 0.37, 0),
  };

  // ---------- anchors for the DOM labels ----------
  const anchors = {
    carriage: new THREE.Vector3(), springs: new THREE.Vector3(0.55, 0.3, 0.2),
    footbar: new THREE.Vector3(0.88, 0.58, 0.24), straps: new THREE.Vector3(-1.05, 0.7, 0.34),
  };

  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const ringAt = new THREE.Vector3(), toPulley = new THREE.Vector3(), xAxis = new THREE.Vector3(1, 0, 0);
  /** c: carriage extension 0..1 (0 = home near the springs, 1 = fully drawn out).
   *  grips: optional [left, right] handle centres (reformer frame) held by a rider; the ropes then run
   *  pulley -> ring -> grip so rope, handle and hand are one connected chain. */
  function update(c, time, grips) {
    const x = CARRIAGE_HOME - CARRIAGE_TRAVEL * c;
    carriage.position.x = x;
    proxies.carriage.position.x = x; proxies.headrest.position.x = x - 0.34;
    const front = x + CARRIAGE_HALF;
    springs.forEach((m) => { m.position.x = front; m.scale.x = Math.max(0.05, SPRING_END - front); });
    anchors.carriage.set(x - 0.05, 0.42, 0);
    handles.forEach((h, i) => {
      const g = grips && grips[i];
      h.grip.visible = !!g;
      if (g) {
        toPulley.copy(h.pulley).sub(g).normalize();
        ringAt.copy(g).addScaledVector(toPulley, 0.075);       // RING_OFFSET in person.js
        h.grip.position.copy(g);
        if (grips.axes) h.grip.quaternion.setFromUnitVectors(xAxis, grips.axes[i]);
        h.rope.position.copy(h.pulley).add(ringAt).multiplyScalar(0.5);
        h.rope.scale.y = h.pulley.distanceTo(ringAt);
        h.rope.quaternion.setFromUnitVectors(up, tmp.copy(ringAt).sub(h.pulley).normalize());
        h.ring.position.copy(ringAt); h.ring.rotation.set(0, 0, 0);
        h.loop.position.copy(ringAt).add(g).multiplyScalar(0.5);   // short strap from ring to grip bar
        h.loop.scale.y = ringAt.distanceTo(g) / 0.13;
        h.loop.quaternion.setFromUnitVectors(up, tmp.copy(g).sub(ringAt).normalize());
        return;
      }
      // no rider: straps are drawn toward the carriage as it travels away, with a little life in them
      const hx = h.pulley.x + 0.16 + 0.55 * c, hy = 0.66 - 0.2 * c + Math.sin(time * 0.9 + i) * 0.005;
      tmp.set(hx, hy, h.z * (1 - 0.12 * c));
      const len = tmp.distanceTo(h.pulley);
      h.rope.position.copy(h.pulley).add(tmp).multiplyScalar(0.5);
      h.rope.scale.y = len;
      h.rope.quaternion.setFromUnitVectors(up, tmp.clone().sub(h.pulley).normalize());
      h.ring.position.copy(tmp); h.ring.rotation.y = Math.PI / 2; h.ring.rotation.z = -0.3;
      h.loop.position.set(tmp.x, tmp.y - 0.07, tmp.z); h.loop.rotation.set(0, Math.PI / 2, 0); h.loop.scale.y = 1; h.loop.quaternion.setFromEuler(h.loop.rotation);
    });
  }

  // Per-part smoothed highlight values so the glow eases in and out.
  const glow = Object.fromEntries(Object.keys(P).map((k) => [k, 0]));
  function ease(hover, dt) {
    for (const k of Object.keys(P)) {
      glow[k] += ((hover === k ? 0.34 : 0) - glow[k]) * Math.min(1, dt * 8);
      for (const m of P[k].mats) { m.emissive.setRGB(1, 0.6, 0.2); m.emissiveIntensity = glow[k]; }
    }
  }

  const dispose = () => {
    root.traverse((o) => { o.geometry?.dispose?.(); });
    Object.values(mats).forEach((m) => m.dispose());
    wood.dispose(); helix.dispose(); mask.dispose(); leatherBump.dispose(); woodBump.dispose(); seamTex.dispose();
    [inlayMat, shadeMat, embossMat, seamMat].forEach((m) => m.dispose()); brandMeshes.forEach((g) => g.dispose());
  };

  return { root, update, ease, anchors, proxies: Object.values(proxies), dispose };
}
