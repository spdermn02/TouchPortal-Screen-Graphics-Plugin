// Drunk Cam Effect
// Heavy swaying motion, fisheye-style zoom warping, color saturation shifts,
// and a nauseating wobble. Like the screen had way too many drinks.
// Uses live screen capture when available for real-time distortion.

const drunkCam = {
  name: 'Drunk Cam',
  description: 'Heavy swaying, zoom warping, and color saturation shifts — like being wasted',
  duration: 8000,
  useLiveStream: true,

  execute: async (container, options) => {
    const { screenshotDataUrl, liveVideo, signal, duration = 8000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      const useLive = !!liveVideo;

      // Helper to create a layer — either canvas-from-video or background-image
      function createLayer(zIndex, blendMode) {
        if (useLive) {
          const canvas = document.createElement('canvas');
          canvas.width = container.clientWidth || window.innerWidth;
          canvas.height = container.clientHeight || window.innerHeight;
          canvas.style.cssText = `
            position: absolute; top: -15%; left: -15%; width: 130%; height: 130%;
            transform-origin: center center;
            opacity: 0;
            z-index: ${zIndex};
            ${blendMode ? `mix-blend-mode: ${blendMode};` : ''}
          `;
          container.appendChild(canvas);
          return { el: canvas, ctx: canvas.getContext('2d'), isCanvas: true };
        } else {
          const div = document.createElement('div');
          div.style.cssText = `
            position: absolute; top: -15%; left: -15%; width: 130%; height: 130%;
            background-image: url(${screenshotDataUrl});
            background-size: cover;
            background-position: center;
            transform-origin: center center;
            opacity: 0;
            z-index: ${zIndex};
            ${blendMode ? `mix-blend-mode: ${blendMode};` : ''}
          `;
          container.appendChild(div);
          return { el: div, isCanvas: false };
        }
      }

      const mainLayer = createLayer(1, null);
      const echoLayer = createLayer(2, 'soft-light');

      // Green/queasy tint overlay
      const tintOverlay = document.createElement('div');
      tintOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 3;
        opacity: 0;
        pointer-events: none;
      `;
      container.appendChild(tintOverlay);

      // Vignette — dark fuzzy edges that pulse
      const vignette = document.createElement('div');
      vignette.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 4;
        pointer-events: none;
      `;
      container.appendChild(vignette);

      const startTime = performance.now();

      // Random phase offsets for organic feel
      const p1 = Math.random() * Math.PI * 2;
      const p2 = Math.random() * Math.PI * 2;
      const p3 = Math.random() * Math.PI * 2;

      // Paint the live video frame onto a canvas layer
      function paintVideoFrame(layer) {
        if (layer.isCanvas && liveVideo && liveVideo.readyState >= 2) {
          layer.ctx.drawImage(liveVideo, 0, 0, layer.el.width, layer.el.height);
        }
      }

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;

        // Paint live frames onto canvases
        if (useLive) {
          paintVideoFrame(mainLayer);
          paintVideoFrame(echoLayer);
        }

        // Envelope: ramp up over 1s, sustain, fade over last 2s
        let env;
        if (progress < 0.12) {
          env = progress / 0.12;
        } else if (progress < 0.75) {
          env = 1;
        } else {
          env = 1 - ((progress - 0.75) / 0.25);
        }
        env = Math.pow(env, 0.8);

        // === Main layer: heavy sway + zoom wobble ===
        const swayX = (Math.sin(t * 0.7 + p1) * 30 + Math.sin(t * 1.3 + p2) * 15) * env;
        const swayY = (Math.cos(t * 0.5 + p2) * 20 + Math.cos(t * 1.1 + p3) * 10) * env;
        const rot = (Math.sin(t * 0.4 + p3) * 5 + Math.sin(t * 0.9 + p1) * 3) * env;

        const zoomBase = 1.05;
        const zoomWobble = Math.sin(t * 0.6 + p1) * 0.08 + Math.sin(t * 1.4) * 0.04;
        const zoom = zoomBase + zoomWobble * env;

        const lurchFactor = Math.abs(Math.sin(t * 0.7 + p1));
        const blur = (2 + lurchFactor * 6) * env;
        const saturate = 1 + Math.sin(t * 0.8 + p2) * 0.6 * env;
        const hueShift = Math.sin(t * 0.3 + p3) * 15 * env;

        mainLayer.el.style.transform = `translate(${swayX}px, ${swayY}px) rotate(${rot}deg) scale(${zoom})`;
        mainLayer.el.style.filter = `blur(${blur}px) saturate(${saturate}) hue-rotate(${hueShift}deg)`;
        mainLayer.el.style.opacity = String(0.65 * env);

        // === Echo layer: same motion but delayed/offset ===
        const echoDelay = 0.4;
        const et = Math.max(0, t - echoDelay);
        const echoX = (Math.sin(et * 0.7 + p1) * 30 + Math.sin(et * 1.3 + p2) * 15) * env;
        const echoY = (Math.cos(et * 0.5 + p2) * 20 + Math.cos(et * 1.1 + p3) * 10) * env;
        const echoRot = (Math.sin(et * 0.4 + p3) * 5 + Math.sin(et * 0.9 + p1) * 3) * env;
        const echoZoom = zoomBase + (Math.sin(et * 0.6 + p1) * 0.08 + Math.sin(et * 1.4) * 0.04) * env;

        echoLayer.el.style.transform = `translate(${echoX}px, ${echoY}px) rotate(${echoRot}deg) scale(${echoZoom})`;
        echoLayer.el.style.filter = `blur(${blur + 3}px) saturate(${saturate * 1.3})`;
        echoLayer.el.style.opacity = String(0.35 * env);

        // === Queasy tint ===
        const tintProgress = (Math.sin(t * 0.5 + p1) + 1) / 2;
        const r = Math.round(20 + tintProgress * 30);
        const g = Math.round(60 - tintProgress * 40);
        const b = Math.round(10 + tintProgress * 20);
        tintOverlay.style.background = `rgba(${r},${g},${b},0.12)`;
        tintOverlay.style.opacity = String(env);

        // === Vignette ===
        const vignetteSize = 60 + Math.sin(t * 1.2) * 10 * env;
        vignette.style.background = `radial-gradient(
          ellipse at ${50 + Math.sin(t * 0.3) * 5}% ${50 + Math.cos(t * 0.4) * 3}%,
          transparent ${vignetteSize}%,
          rgba(0,0,0,${0.5 * env}) ${vignetteSize + 20}%,
          rgba(0,0,0,${0.7 * env}) 100%
        )`;

        // Fade out
        if (progress > 0.85) {
          const fadeP = (progress - 0.85) / 0.15;
          mainLayer.el.style.opacity = String(0.65 * env * (1 - fadeP));
          echoLayer.el.style.opacity = String(0.35 * env * (1 - fadeP));
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(animate);

      if (signal) {
        signal.addEventListener('abort', () => resolve(), { once: true });
      }
    });
  },

  cleanup: (container) => {
    container.innerHTML = '';
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = drunkCam;
}
if (typeof window !== 'undefined') {
  window.__effectExport = drunkCam;
}
