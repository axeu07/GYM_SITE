import * as THREE from 'three';

// The room: a polished maple floor, a fluted curved wall, three glowing arches and warm cove light.
// Everything is procedural (canvas textures + primitives), so there is nothing heavy to download.

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const rows = 16, h = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -Math.random() * 400;
    while (x < 1024) {
      const len = 380 + Math.random() * 360;
      const l = 58 + Math.random() * 9, sat = 38 + Math.random() * 12;
      g.fillStyle = `hsl(${30 + Math.random() * 5},${sat}%,${l}%)`;
      g.fillRect(x, r * h, len, h);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(110,70,34,${0.03 + Math.random() * 0.07})`; g.lineWidth = 0.6 + Math.random();
        const y = r * h + Math.random() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (Math.random() - 0.5) * 3); g.stroke();
      }
      g.fillStyle = 'rgba(40,24,10,0.5)'; g.fillRect(x, r * h, 1.6, h);
      x += len;
    }
    g.fillStyle = 'rgba(40,24,10,0.45)'; g.fillRect(0, r * h, 1024, 1.6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(5, 5);
  return t;
}

function flutedTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 8;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  for (let i = 0; i <= 16; i++) { gr.addColorStop(i / 16, i % 2 ? '#241a11' : '#15100b'); }
  g.fillStyle = '#1a130d'; g.fillRect(0, 0, 512, 8);
  for (let i = 0; i < 32; i++) {
    const x = i * 16;
    const l = g.createLinearGradient(x, 0, x + 16, 0);
    l.addColorStop(0, '#0e0a07'); l.addColorStop(0.5, '#33261a'); l.addColorStop(1, '#0e0a07');
    g.fillStyle = l; g.fillRect(x, 0, 16, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#fff0cf'); gr.addColorStop(0.5, '#e8b062'); gr.addColorStop(1, '#6a431c');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 64, 4, 128, 64, 126);
  gr.addColorStop(0, 'rgba(0,0,0,0.72)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.scale(1, 0.5); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.restore();
  return new THREE.CanvasTexture(c);
}

function archShape(w, h, inset) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath();
  const r2 = r - inset;
  const hole = new THREE.Path();
  hole.moveTo(-r2, 0); hole.lineTo(-r2, h - r); hole.absarc(0, h - r, r2, Math.PI, 0, true); hole.lineTo(r2, 0); hole.closePath();
  s.holes.push(hole);
  return s;
}

/** A dark studio of emissive softboxes. Gold reflects these as long, clean highlights. */
export function buildEnvironment(gl) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b0907, side: THREE.BackSide })));
  const box = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(2.4, 9, 0xfff0da, 6, -7, 2, 4);
  box(10, 1.8, 0xfff6e8, 4.5, 0, 7, 1);
  box(1.4, 8, 0xffb54f, 6, 7, 1, -1);
  box(9, 1, 0xffe3b8, 4, 0, 2, -8);
  box(8, 1.4, 0xc79a5a, 1.8, 0, -6, 3);
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(env, 0.02);
  pm.dispose();
  env.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

export function buildStudio({ small }) {
  const g = new THREE.Group();
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // floor
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: keep(floorTexture()), color: '#a98259', roughness: 0.4, metalness: 0, envMapIntensity: 0.7 }));
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(16, 16)), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  // curved wall
  const wallMat = keep(new THREE.MeshStandardMaterial({ map: keep(flutedTexture()), roughness: 0.65, side: THREE.BackSide, envMapIntensity: 0.4 }));
  const wall = new THREE.Mesh(keep(new THREE.CylinderGeometry(7, 7, 5, small ? 48 : 96, 1, true, Math.PI - 1.35, 2.7)), wallMat);
  wall.position.y = 2.5; g.add(wall);

  // cove light lines hugging the wall
  const coveMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc477').multiplyScalar(1.05), toneMapped: true }));
  for (const y of [0.06, 4.2]) {
    const arc = new THREE.Mesh(keep(new THREE.TorusGeometry(6.95, 0.022, 6, 96, 2.7)), coveMat);
    arc.rotation.x = Math.PI / 2; arc.rotation.z = -Math.PI / 2 - 1.35; arc.position.y = y; g.add(arc);
  }

  // arches
  const glow = keep(glowTexture());
  const archMat = keep(new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color('#ffffff').multiplyScalar(1.5) }));
  [[2.7, 3.3, -4.4], [3.5, 3.9, -5.3], [4.3, 4.5, -6.2]].forEach(([w, h, z]) => {
    const geo = keep(new THREE.ExtrudeGeometry(archShape(w, h, 0.05), { depth: 0.05, bevelEnabled: false, curveSegments: small ? 16 : 32 }));
    const m = new THREE.Mesh(geo, archMat); m.position.set(1.0, 0, z); g.add(m);
  });
  // the lit alcove behind the arches
  const alcove = new THREE.Mesh(
    keep(new THREE.ShapeGeometry(archShape(4.2, 4.4, 0).clone(), small ? 16 : 32)),
    keep(new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color('#ffffff').multiplyScalar(0.55) })),
  );
  alcove.position.set(1.0, 0, -6.45); g.add(alcove);

  // soft contact shadow under the machine
  const shadow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3.4, 1.35)),
    keep(new THREE.MeshBasicMaterial({ map: keep(shadowTexture()), transparent: true, depthWrite: false, opacity: 0.9 })),
  );
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; g.add(shadow);

  // lights
  const key = new THREE.SpotLight('#ffe2b6', 95, 16, 0.55, 0.85, 2);
  key.position.set(-2.4, 4.6, 2.8); key.target.position.set(0, 0.2, 0);
  key.castShadow = true; key.shadow.mapSize.set(small ? 512 : 1536, small ? 512 : 1536);
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
  const rim = new THREE.SpotLight('#ffb054', 70, 14, 0.6, 0.9, 2);
  rim.position.set(3.6, 2.8, -3); rim.target.position.set(0, 0.3, 0);
  const wash = new THREE.PointLight('#ffb561', 9, 9, 2); wash.position.set(0, 2.4, -4.2);
  const hemi = new THREE.HemisphereLight('#ffeacc', '#2a1c10', 0.45);
  g.add(key, key.target, rim, rim.target, wash, hemi);

  const dispose = () => disposables.forEach((d) => d.dispose?.());
  return { group: g, key, rim, shadow, dispose };
}
