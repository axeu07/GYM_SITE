import { createLifter } from '../src/three/lifter.js';
const host = document.getElementById('host');
const L = createLifter(host, {});
window.__L = L;
L.ready.then((ok) => { window.__ready = ok; console.log('lifter ready', ok); });
