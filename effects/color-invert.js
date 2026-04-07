// Color Invert Effect
// Colors flip to negative with pulsing strobe flashes between
// normal and inverted, intensifying then calming down.

const colorInvert = {
  name: 'Color Invert',
  description: 'Negative color inversion with strobe pulses between normal and inverted',
  duration: 4000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 4000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      // Normal screenshot layer — semi-transparent
      const normalLayer = document.createElement('div');
      normalLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        z-index: 1;
        opacity: 0.65;
      `;
      container.appendChild(normalLayer);

      // Inverted screenshot layer — semi-transparent
      const invertedLayer = document.createElement('div');
      invertedLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        filter: invert(1);
        z-index: 2;
        opacity: 0;
      `;
      container.appendChild(invertedLayer);

      // Flash overlay for strobe hits
      const strobeLayer = document.createElement('div');
      strobeLayer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 3;
        opacity: 0;
      `;
      container.appendChild(strobeLayer);

      const startTime = performance.now();

      // Pre-compute strobe hit times (randomized)
      const strobeHits = [];
      let hitTime = 100;
      while (hitTime < duration * 0.75) {
        strobeHits.push(hitTime);
        hitTime += 120 + Math.random() * 300;
      }

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;

        // Envelope
        let env;
        if (progress < 0.05) {
          env = progress / 0.05;
        } else if (progress < 0.65) {
          env = 1;
        } else {
          env = 1 - ((progress - 0.65) / 0.35);
        }

        // Inversion oscillation — semi-transparent, faster during peak
        const strobeSpeed = 3 + env * 8;
        const invertAmount = (Math.sin(t * strobeSpeed) * 0.5 + 0.5) * env * 0.7;
        invertedLayer.style.opacity = String(invertAmount);

        // Additional hue rotation for psychedelic feel
        const hueShift = Math.sin(t * 2) * 30 * env;
        invertedLayer.style.filter = `invert(1) hue-rotate(${hueShift}deg)`;
        normalLayer.style.filter = `hue-rotate(${-hueShift * 0.3}deg) saturate(${1 + 0.5 * env})`;
        normalLayer.style.opacity = String(0.65 * env);

        // Strobe flash hits — semi-transparent
        let strobeOpacity = 0;
        for (const hit of strobeHits) {
          const timeSinceHit = elapsed - hit;
          if (timeSinceHit >= 0 && timeSinceHit < 80) {
            const flash = 1 - (timeSinceHit / 80);
            strobeOpacity = Math.max(strobeOpacity, flash * 0.35 * env);
          }
        }
        const strobeColor = Math.random() > 0.5 ? 'white' : 'black';
        strobeLayer.style.background = strobeColor;
        strobeLayer.style.opacity = String(strobeOpacity);

        // Slight scale pulse
        const scalePulse = 1 + Math.sin(t * 4) * 0.01 * env;
        normalLayer.style.transform = `scale(${scalePulse})`;
        invertedLayer.style.transform = `scale(${scalePulse})`;

        // Fade out
        if (progress > 0.88) {
          const fadeP = (progress - 0.88) / 0.12;
          normalLayer.style.opacity = String(0.65 * env * (1 - fadeP));
          invertedLayer.style.opacity = String(invertAmount * (1 - fadeP));
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
  module.exports = colorInvert;
}
if (typeof window !== 'undefined') {
  window.__effectExport = colorInvert;
}
