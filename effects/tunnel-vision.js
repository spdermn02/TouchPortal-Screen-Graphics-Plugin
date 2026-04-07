// Tunnel Vision Effect
// Black closes in from all edges, leaving only a small circle of visibility
// in the center that pulses and drifts before slowly reopening.

const tunnelVision = {
  name: 'Tunnel Vision',
  description: 'Vision narrows to a small circle in the center that pulses and drifts',
  duration: 6000,

  execute: async (container, options) => {
    const { signal, duration = 6000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      // No screenshot layer — the live screen IS the visible content.
      // We only overlay the black tunnel mask and pulse effects.

      // Tunnel mask layer — radial gradient blacks out the edges
      const tunnelMask = document.createElement('div');
      tunnelMask.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 1;
        pointer-events: none;
      `;
      container.appendChild(tunnelMask);

      // Heartbeat/pulse overlay — subtle red tint at edges during tight tunnel
      const pulseOverlay = document.createElement('div');
      pulseOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 2;
        opacity: 0;
        pointer-events: none;
      `;
      container.appendChild(pulseOverlay);

      const startTime = performance.now();

      // Random drift offset for the tunnel center
      const driftPhaseX = Math.random() * Math.PI * 2;
      const driftPhaseY = Math.random() * Math.PI * 2;

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;

        // Tunnel size envelope:
        // 0-20%: closes from 100% to ~12% (narrowing)
        // 20-65%: holds tight with pulse between 10-18%
        // 65-100%: reopens from 12% to 100%+
        let tunnelRadius;
        if (progress < 0.20) {
          const p = progress / 0.20;
          const eased = Math.pow(p, 1.5);
          tunnelRadius = 100 - (88 * eased); // 100% -> 12%
        } else if (progress < 0.65) {
          // Pulse between 10-18%
          const pulse = Math.sin(t * 3) * 4;
          tunnelRadius = 12 + pulse;
        } else {
          const p = (progress - 0.65) / 0.35;
          const eased = 1 - Math.pow(1 - p, 2);
          tunnelRadius = 12 + (88 * eased); // 12% -> 100%
        }

        // Drift the tunnel center slightly
        const driftAmount = tunnelRadius < 30 ? (30 - tunnelRadius) * 0.15 : 0;
        const centerX = 50 + Math.sin(t * 0.8 + driftPhaseX) * driftAmount;
        const centerY = 50 + Math.cos(t * 0.6 + driftPhaseY) * driftAmount;

        // Apply tunnel mask as radial gradient
        const innerEdge = Math.max(0, tunnelRadius - 5);
        const outerEdge = tunnelRadius + 8;
        tunnelMask.style.background = `radial-gradient(
          ellipse at ${centerX}% ${centerY}%,
          transparent ${innerEdge}%,
          rgba(0,0,0,0.6) ${tunnelRadius}%,
          rgba(0,0,0,0.95) ${outerEdge}%,
          rgba(0,0,0,1) ${outerEdge + 15}%
        )`;

        // Heartbeat red pulse at edges when tunnel is tight
        if (tunnelRadius < 25) {
          const heartbeat = Math.pow(Math.sin(t * 4), 2) * 0.3;
          pulseOverlay.style.background = `radial-gradient(
            ellipse at ${centerX}% ${centerY}%,
            transparent ${tunnelRadius}%,
            rgba(80,0,0,${heartbeat}) ${tunnelRadius + 20}%,
            rgba(40,0,0,${heartbeat * 0.5}) 100%
          )`;
          pulseOverlay.style.opacity = '1';
        } else {
          pulseOverlay.style.opacity = '0';
        }

        // Fade the mask at very end
        if (progress > 0.92) {
          const fadeP = (progress - 0.92) / 0.08;
          tunnelMask.style.opacity = String(1 - fadeP);
          pulseOverlay.style.opacity = String(parseFloat(pulseOverlay.style.opacity || 0) * (1 - fadeP));
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
  module.exports = tunnelVision;
}
if (typeof window !== 'undefined') {
  window.__effectExport = tunnelVision;
}
