// The athlete model (public/models/athlete.glb) is used twice: by the opening and by the Reformer studio.
// It is downloaded once, here, as raw bytes (no three.js import, so the main bundle stays light). Each scene
// then parses its own copy (three/athlete.js), because each owns a skeleton it poses differently.

let bytes = null;

export const athleteUrl = () => `${import.meta.env.BASE_URL}models/athlete.glb`;

/** Start (or join) the download. Safe to call as early and as often as you like. */
export function prefetchAthlete() {
  if (!bytes) {
    bytes = fetch(athleteUrl()).then((r) => {
      if (!r.ok) throw new Error(`athlete.glb: HTTP ${r.status}`);
      return r.arrayBuffer();
    }).catch((err) => { bytes = null; throw err; });
  }
  return bytes;
}
