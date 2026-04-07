// Screen Shake Effect
// Earthquake/explosion tremor with intense camera shake that decays over time.
// Combines rapid random translation, slight rotation, and scale jolts.

const screenShake = {
  name: 'Screen Shake',
  description: 'Earthquake-style camera shake with decaying intensity',
  duration: 4000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 4000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      // Semi-transparent screenshot — live screen visible underneath the shake
      const screenshotLayer = document.createElement('div');
      screenshotLayer.style.cssText = `
        position: absolute; top: -10%; left: -10%; width: 120%; height: 120%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        transform-origin: center center;
        opacity: 0.7;
        z-index: 1;
      `;
      container.appendChild(screenshotLayer);

      // Impact flash — brief semi-transparent white on hit
      const impactFlash = document.createElement('div');
      impactFlash.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: white;
        opacity: 0;
        z-index: 2;
      `;
      container.appendChild(impactFlash);

      const startTime = performance.now();
      let lastShakeTime = 0;
      let shakeX = 0, shakeY = 0, shakeRot = 0;
      const shakeInterval = 16; // new shake position every ~16ms

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Intensity envelope: instant full, then exponential decay
        let intensity;
        if (progress < 0.02) {
          intensity = progress / 0.02; // instant ramp
        } else {
          intensity = Math.pow(1 - ((progress - 0.02) / 0.98), 2);
        }

        // Impact flash in first 100ms — semi-transparent
        if (progress < 0.025) {
          impactFlash.style.opacity = String(0.4 * (1 - progress / 0.025));
        } else {
          impactFlash.style.opacity = '0';
        }

        // Generate new random shake offset at intervals
        if (elapsed - lastShakeTime > shakeInterval) {
          lastShakeTime = elapsed;
          const maxOffset = 40 * intensity;
          const maxRot = 4 * intensity;
          shakeX = (Math.random() - 0.5) * 2 * maxOffset;
          shakeY = (Math.random() - 0.5) * 2 * maxOffset;
          shakeRot = (Math.random() - 0.5) * 2 * maxRot;
        }

        // Interpolate toward target for slightly smoother motion
        const scale = 1 + 0.03 * intensity;
        const blur = intensity * 2;

        screenshotLayer.style.transform = `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg) scale(${scale})`;
        screenshotLayer.style.filter = `blur(${blur}px)`;
        screenshotLayer.style.opacity = String(0.7 * intensity); // fades with shake intensity

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
  module.exports = screenShake;
}
if (typeof window !== 'undefined') {
  window.__effectExport = screenShake;
}
