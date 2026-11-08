import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prefetchAthlete } from '../lib/athlete';

/**
 * Parse the shared athlete download into a fresh glTF (own scene graph, skeleton, materials).
 *
 * The head, eyes and teeth ship with 67 facial morph targets that no scene ever drives (every weight is 0).
 * Left in, they put a 67-way morph loop into those meshes' vertex shaders (bigger programs to compile, more
 * work per vertex in every pass); stripped, the rendering is identical.
 */
export async function loadAthleteGLTF() {
  const buf = await prefetchAthlete();
  const base = `${import.meta.env.BASE_URL}models/`;
  const gltf = await new GLTFLoader().parseAsync(buf.slice(0), base);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) { g.morphAttributes = {}; g.morphTargetsRelative = false; }
    o.morphTargetInfluences = undefined;
    o.morphTargetDictionary = undefined;
  });
  return gltf;
}
