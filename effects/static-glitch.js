// Static/Glitch Effect
// TV static with scanlines, RGB color channel splitting,
// random frame tearing, and flicker.

const staticGlitch = {
  name: 'Static Glitch',
  description: 'TV static with scanlines, color glitching, and frame tearing',
  duration: 5000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 5000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      // Base screenshot — semi-transparent so live screen shows through
      const baseLayer = document.createElement('div');
      baseLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        opacity: 0.65;
        z-index: 1;
      `;
      container.appendChild(baseLayer);

      // RGB split layers — red and blue channels offset
      const redLayer = document.createElement('div');
      redLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        mix-blend-mode: multiply;
        opacity: 0;
        z-index: 2;
      `;
      container.appendChild(redLayer);

      const blueLayer = document.createElement('div');
      blueLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        mix-blend-mode: screen;
        opacity: 0;
        z-index: 3;
      `;
      container.appendChild(blueLayer);

      // Scanline overlay
      const scanlines = document.createElement('canvas');
      scanlines.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        opacity: 0;
        z-index: 4;
        mix-blend-mode: overlay;
      `;
      scanlines.width = 4;
      scanlines.height = 800;
      const ctx = scanlines.getContext('2d');
      for (let y = 0; y < 800; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, y, 4, 2);
      }
      container.appendChild(scanlines);

      // Static noise canvas
      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = 256;
      noiseCanvas.height = 256;
      noiseCanvas.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        opacity: 0;
        z-index: 5;
        mix-blend-mode: overlay;
        image-rendering: pixelated;
      `;
      container.appendChild(noiseCanvas);
      const noiseCtx = noiseCanvas.getContext('2d');

      // Tear container — holds horizontal slice offsets
      const tearContainer = document.createElement('div');
      tearContainer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 6;
        overflow: hidden;
        pointer-events: none;
      `;
      container.appendChild(tearContainer);

      const startTime = performance.now();
      let nextGlitchTime = 0;
      let glitchActive = false;
      let glitchEnd = 0;
      let tearSlices = [];

      function generateNoise(opacity) {
        const imgData = noiseCtx.createImageData(256, 256);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.random() * 255;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
        noiseCtx.putImageData(imgData, 0, 0);
        noiseCanvas.style.opacity = String(opacity);
      }

      function createTearSlices(env) {
        tearContainer.innerHTML = '';
        tearSlices = [];
        const sliceCount = 3 + Math.floor(Math.random() * 5);

        for (let i = 0; i < sliceCount; i++) {
          const slice = document.createElement('div');
          const top = Math.random() * 100;
          const height = 1 + Math.random() * 8;
          const offsetX = (Math.random() - 0.5) * 60 * env;

          slice.style.cssText = `
            position: absolute;
            top: ${top}%;
            left: 0;
            width: 100%;
            height: ${height}%;
            background-image: url(${screenshotDataUrl});
            background-size: cover;
            background-position: ${offsetX}px center;
            opacity: 0.65;
          `;
          tearContainer.appendChild(slice);
          tearSlices.push(slice);
        }
      }

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Envelope: quick ramp, sustain, fade
        let env;
        if (progress < 0.08) {
          env = progress / 0.08;
        } else if (progress < 0.70) {
          env = 1;
        } else {
          env = 1 - ((progress - 0.70) / 0.30);
        }
        env = Math.pow(env, 0.6);

        // Random glitch bursts
        if (elapsed > nextGlitchTime) {
          glitchActive = true;
          glitchEnd = elapsed + 50 + Math.random() * 200;
          nextGlitchTime = elapsed + 100 + Math.random() * 400;
          createTearSlices(env);
        }

        if (elapsed > glitchEnd) {
          glitchActive = false;
          tearContainer.innerHTML = '';
        }

        // RGB split — constant drift + burst on glitch
        const rgbBase = Math.sin(elapsed / 200) * 3 * env;
        const rgbBurst = glitchActive ? (Math.random() - 0.5) * 20 * env : 0;
        const rgbOffset = rgbBase + rgbBurst;

        redLayer.style.transform = `translateX(${-rgbOffset}px)`;
        redLayer.style.filter = `hue-rotate(-40deg)`;
        redLayer.style.opacity = String(0.4 * env);

        blueLayer.style.transform = `translateX(${rgbOffset}px)`;
        blueLayer.style.filter = `hue-rotate(40deg)`;
        blueLayer.style.opacity = String(0.35 * env);

        // Base layer — flicker on glitch, semi-transparent
        const flicker = glitchActive ? 0.8 + Math.random() * 0.2 : 1;
        const baseBrightness = 0.9 + Math.sin(elapsed / 300) * 0.1 * env;
        baseLayer.style.filter = `brightness(${baseBrightness * flicker}) contrast(${1 + 0.2 * env})`;
        baseLayer.style.opacity = String(0.65 * flicker * env);

        // Scanlines
        scanlines.style.opacity = String(0.5 * env);

        // Noise — heavier during glitch bursts
        const noiseOpacity = glitchActive ? 0.15 + Math.random() * 0.15 : 0.05;
        generateNoise(noiseOpacity * env);

        // Fade out
        if (progress > 0.85) {
          const fadeP = (progress - 0.85) / 0.15;
          baseLayer.style.opacity = String(0.65 * (1 - fadeP) * flicker * env);
          redLayer.style.opacity = String(0.4 * env * (1 - fadeP));
          blueLayer.style.opacity = String(0.35 * env * (1 - fadeP));
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
  module.exports = staticGlitch;
}
if (typeof window !== 'undefined') {
  window.__effectExport = staticGlitch;
}
