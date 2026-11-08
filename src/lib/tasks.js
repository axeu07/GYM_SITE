// Scheduling helpers for one-time heavy work (compiling shaders, uploading textures, building geometry).
// The rule they enforce: nothing heavy ever runs inside a frame that is visible to the visitor. Work is cut
// into slices that each run right after a frame has been painted, with a whole frame of headroom.

/** Resolves just after the next frame has been painted, so the work that follows has a full frame to itself. */
export const afterFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export const frames = async (n) => { for (let i = 0; i < n; i++) await afterFrame(); };

/** Run `fn` when the browser is idle (with a fallback for Safari). */
export const idle = (fn, timeout = 2000) => {
  if (typeof requestIdleCallback === 'function') return requestIdleCallback(fn, { timeout });
  return setTimeout(fn, 80);
};

/**
 * Resolves once every shader program the renderer has created is fully linked.
 * With KHR_parallel_shader_compile (Chrome, Edge, Firefox, Safari 17+) this polls a status flag and never
 * blocks, so the GPU driver compiles in parallel while the page keeps animating. The first draw with a program
 * that is not linked yet is what freezes the main thread for hundreds of milliseconds, which is why every
 * program is built and waited for before anything is shown.
 */
export function programsReady(gl, timeout = 20000) {
  if (!gl.extensions?.has?.('KHR_parallel_shader_compile')) return Promise.resolve();
  return new Promise((resolve) => {
    const t0 = performance.now();
    const poll = () => {
      const list = gl.info.programs || [];
      if (list.every((p) => p.isReady()) || performance.now() - t0 > timeout) resolve();
      else setTimeout(poll, 20);
    };
    poll();
  });
}

/** Every texture a scene's materials reference (deduplicated). */
export function sceneTextures(root) {
  const set = new Set();
  root.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      for (const k in m) { const v = m[k]; if (v && v.isTexture) set.add(v); }
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (v && v.isTexture) set.add(v); }
    }
  });
  return [...set];
}

/**
 * Upload textures to the GPU a couple per frame, so the first frame that draws them does not have to
 * (a texture's first use is a synchronous upload plus mipmap generation).
 */
export async function uploadTextures(gl, root, perFrame = 2) {
  const list = sceneTextures(root);
  for (let i = 0; i < list.length; i += perFrame) {
    for (const t of list.slice(i, i + perFrame)) gl.initTexture(t);
    await afterFrame();
  }
  return list.length;
}

/** Rolling frame-time monitor: calls `onSlow` once if the average stays above `ms` for `n` frames. */
export function slowMonitor({ ms = 26, n = 45, grace = 2500, onSlow }) {
  let avg = 16.7, count = 0, t0 = 0;
  return {
    reset() { avg = 16.7; count = 0; t0 = performance.now(); },
    tick(dtMs) {
      if (!t0) t0 = performance.now();
      if (performance.now() - t0 < grace) return;
      avg += (Math.min(dtMs, 120) - avg) * 0.1;
      count = avg > ms ? count + 1 : 0;
      if (count >= n) { count = 0; t0 = performance.now(); avg = 16.7; onSlow(); }
    },
  };
}
