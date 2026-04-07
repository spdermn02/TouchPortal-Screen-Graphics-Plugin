// Flashbang Effect
// Blinding white flash with blur/distortion that fades over several seconds.
// Uses live screen capture when available for real-time distortion.

const flashbang = {
  name: 'Flashbang',
  description: 'Screen flash and distortion effect - blinding white flash that fades with blur',
  duration: 5000,
  useLiveStream: true,

  execute: async (container, options) => {
    const { screenshotDataUrl, liveVideo, signal, duration = 5000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      const useLive = !!liveVideo;
      const W = container.clientWidth || window.innerWidth;
      const H = container.clientHeight || window.innerHeight;

      // Screenshot/live layer — semi-transparent so live screen bleeds through.
      // Slightly oversized so rotation doesn't show corners.
      let screenshotLayer, canvasCtx;

      if (useLive) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.cssText = `
          position: absolute; top: -10%; left: -10%; width: 120%; height: 120%;
          filter: brightness(1) blur(0px) saturate(1);
          transform-origin: center center;
          opacity: 0.7;
          z-index: 1;
        `;
        container.appendChild(canvas);
        screenshotLayer = canvas;
        canvasCtx = canvas.getContext('2d');
      } else {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; top: -10%; left: -10%; width: 120%; height: 120%;
          background-image: url(${screenshotDataUrl});
          background-size: cover;
          background-position: center;
          filter: brightness(1) blur(0px) saturate(1);
          transform-origin: center center;
          opacity: 0.7;
          z-index: 1;
        `;
        container.appendChild(div);
        screenshotLayer = div;
      }

      // White flash overlay
      const flashLayer = document.createElement('div');
      flashLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: white;
        opacity: 0.9;
        z-index: 2;
      `;
      container.appendChild(flashLayer);

      // Vignette layer — radial mask that reveals center first
      const vignetteLayer = document.createElement('div');
      vignetteLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at center, transparent 0%, rgba(255,255,255,1) 100%);
        opacity: 0;
        z-index: 3;
      `;
      container.appendChild(vignetteLayer);

      const startTime = performance.now();
      const rotDir = Math.random() > 0.5 ? 1 : -1;

      function paintFrame() {
        if (useLive && liveVideo && liveVideo.readyState >= 2) {
          canvasCtx.drawImage(liveVideo, 0, 0, W, H);
        }
      }

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Paint live frame
        if (useLive) paintFrame();

        if (progress < 0.04) {
          const rot = rotDir * progress * 50;
          flashLayer.style.opacity = '0.9';
          screenshotLayer.style.filter = 'brightness(3) blur(0px) saturate(0.2)';
          screenshotLayer.style.transform = `rotate(${rot}deg) scale(1.02)`;
          screenshotLayer.style.opacity = '0.7';
          vignetteLayer.style.opacity = '0';

        } else if (progress < 0.30) {
          const p = (progress - 0.04) / 0.26;
          const flashOpacity = 0.85 - (p * 0.55);
          const blur = p * 15;
          const brightness = 3 - (p * 1.5);
          const saturate = 0.2 + (p * 0.3);

          const rot = rotDir * (2 + Math.sin(p * Math.PI * 3) * 3);
          const scale = 1.02 + p * 0.03;

          flashLayer.style.opacity = String(flashOpacity);
          screenshotLayer.style.filter = `brightness(${brightness}) blur(${blur}px) saturate(${saturate})`;
          screenshotLayer.style.transform = `rotate(${rot}deg) scale(${scale})`;
          screenshotLayer.style.opacity = String(0.7 - p * 0.05);

          vignetteLayer.style.opacity = String(p * 0.25);

        } else {
          const p = (progress - 0.30) / 0.70;
          const eased = 1 - Math.pow(1 - p, 2);

          const flashOpacity = 0.3 * (1 - p);
          const blur = 15 * (1 - eased);
          const brightness = 1.5 - (eased * 0.5);
          const saturate = 0.5 + (eased * 0.5);

          const wobbleDecay = Math.sin(p * Math.PI * 2) * (1 - p);
          const rot = rotDir * (2 * (1 - eased) + wobbleDecay * 1.5);
          const scale = 1.05 - (eased * 0.05);

          const screenshotOpacity = 0.65 * (1 - Math.pow(p, 2));

          flashLayer.style.opacity = String(flashOpacity);
          screenshotLayer.style.filter = `brightness(${brightness}) blur(${blur}px) saturate(${saturate})`;
          screenshotLayer.style.transform = `rotate(${rot}deg) scale(${scale})`;
          screenshotLayer.style.opacity = String(screenshotOpacity);

          const innerRadius = 10 + eased * 90;
          const outerRadius = Math.min(innerRadius + 30, 100);
          vignetteLayer.style.background = `radial-gradient(ellipse at center,
            transparent ${innerRadius}%,
            rgba(255,255,255,${0.5 * (1 - eased)}) ${outerRadius}%,
            rgba(255,255,255,${0.7 * (1 - eased)}) 100%)`;
          vignetteLayer.style.opacity = String((1 - Math.pow(p, 2)) * 0.8);
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
  module.exports = flashbang;
}
if (typeof window !== 'undefined') {
  window.__effectExport = flashbang;
}
