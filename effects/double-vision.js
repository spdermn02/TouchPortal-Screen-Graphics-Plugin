// Double Vision Effect
// Duplicates the screen into offset layers that drift and sway,
// with chromatic aberration and pulsing blur — like being dazed/drunk.

const doubleVision = {
  name: 'Double Vision',
  description: 'Dazed double/triple vision with drifting layers, chromatic aberration, and swaying motion',
  duration: 7000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 7000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      const baseCss = `
        position: absolute; top: -5%; left: -5%; width: 110%; height: 110%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        transform-origin: center center;
      `;

      // Base layer — semi-transparent so live screen shows through
      const baseLayer = document.createElement('div');
      baseLayer.style.cssText = baseCss + 'z-index: 1; opacity: 0.6;';
      container.appendChild(baseLayer);

      // Ghost layer 1 — drifts to upper-right with red tint
      const ghost1 = document.createElement('div');
      ghost1.style.cssText = baseCss + `
        z-index: 2; opacity: 0;
        mix-blend-mode: screen;
      `;
      container.appendChild(ghost1);

      // Ghost layer 2 — drifts to lower-left with blue tint
      const ghost2 = document.createElement('div');
      ghost2.style.cssText = baseCss + `
        z-index: 3; opacity: 0;
        mix-blend-mode: screen;
      `;
      container.appendChild(ghost2);

      const startTime = performance.now();

      // Randomize sway direction
      const swayPhase = Math.random() * Math.PI * 2;

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Time in seconds for oscillation calculations
        const t = elapsed / 1000;

        // Envelope: ramps up 0-15%, full 15-75%, ramps down 75-100%
        let envelope;
        if (progress < 0.15) {
          envelope = progress / 0.15; // 0 -> 1
        } else if (progress < 0.75) {
          envelope = 1;
        } else {
          envelope = 1 - ((progress - 0.75) / 0.25); // 1 -> 0
        }
        const env = Math.pow(envelope, 0.7); // slightly snappier ramp

        // === Base layer: gentle sway ===
        const baseSway = Math.sin(t * 1.2 + swayPhase) * 8 * env;
        const baseVertSway = Math.cos(t * 0.9 + swayPhase) * 4 * env;
        const baseRot = Math.sin(t * 0.7 + swayPhase) * 1.5 * env;
        const baseBlur = (1 + Math.sin(t * 2.5) * 0.5) * 2 * env;
        baseLayer.style.transform = `translate(${baseSway}px, ${baseVertSway}px) rotate(${baseRot}deg)`;
        baseLayer.style.filter = `blur(${baseBlur}px)`;
        baseLayer.style.opacity = String(0.6 + 0.1 * (1 - env)); // 0.6 at peak, 0.7 at edges

        // === Ghost 1: drifts upper-right, red/warm shift ===
        const g1Drift = 15 + Math.sin(t * 1.8) * 20;
        const g1Vert = -10 + Math.cos(t * 1.3) * 15;
        const g1Rot = Math.sin(t * 0.6) * 2;
        const g1Opacity = 0.35 * env;
        ghost1.style.transform = `translate(${g1Drift * env}px, ${g1Vert * env}px) rotate(${g1Rot * env}deg)`;
        ghost1.style.filter = `blur(${3 * env}px) hue-rotate(-15deg) saturate(1.3)`;
        ghost1.style.opacity = String(g1Opacity);

        // === Ghost 2: drifts lower-left, blue/cool shift ===
        const g2Drift = -12 + Math.sin(t * 1.5 + 2) * 18;
        const g2Vert = 8 + Math.cos(t * 1.1 + 1) * 12;
        const g2Rot = Math.sin(t * 0.8 + 1) * 2.5;
        const g2Opacity = 0.3 * env;
        ghost2.style.transform = `translate(${g2Drift * env}px, ${g2Vert * env}px) rotate(${g2Rot * env}deg)`;
        ghost2.style.filter = `blur(${4 * env}px) hue-rotate(20deg) saturate(1.2)`;
        ghost2.style.opacity = String(g2Opacity);

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
  module.exports = doubleVision;
}
if (typeof window !== 'undefined') {
  window.__effectExport = doubleVision;
}
