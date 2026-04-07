// Mirror Flip Effect
// The entire screen rotates like a 3D cube, revealing the mirrored
// live feed on the adjacent face. Fully opaque — no transparency.

const mirrorFlip = {
  name: 'Mirror Flip',
  description: 'Rotates the screen like a 3D cube to reveal a fully mirrored live display',
  duration: 10000,
  useLiveStream: true,

  execute: async (container, options) => {
    const { screenshotDataUrl, liveVideo, signal, duration = 10000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) { resolve(); return; }

      const useLive = !!liveVideo;
      const W = container.clientWidth || window.innerWidth;
      const H = container.clientHeight || window.innerHeight;
      const halfW = W / 2;

      // Perspective on the container — distance creates the 3D depth
      container.style.perspective = `${W * 1.2}px`;
      container.style.perspectiveOrigin = '50% 50%';
      container.style.overflow = 'hidden';

      // Cube wrapper — this rotates as a whole
      const cube = document.createElement('div');
      cube.style.cssText = `
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        transform-style: preserve-3d;
        transform-origin: 50% 50%;
        transform: translateZ(-${halfW}px) rotateY(0deg);
      `;
      container.appendChild(cube);

      // === Front face — normal orientation ===
      let frontFace, frontCtx;
      if (useLive) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          transform: translateZ(${halfW}px);
          backface-visibility: hidden;
        `;
        cube.appendChild(canvas);
        frontFace = canvas;
        frontCtx = canvas.getContext('2d');
      } else {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          background-image: url(${screenshotDataUrl});
          background-size: cover;
          background-position: center;
          transform: translateZ(${halfW}px);
          backface-visibility: hidden;
        `;
        cube.appendChild(div);
        frontFace = div;
      }

      // === Right face — mirrored orientation ===
      let rightFace, rightCtx;
      if (useLive) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          transform: rotateY(90deg) translateZ(${halfW}px);
          backface-visibility: hidden;
        `;
        cube.appendChild(canvas);
        rightFace = canvas;
        rightCtx = canvas.getContext('2d');
      } else {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          background-image: url(${screenshotDataUrl});
          background-size: cover;
          background-position: center;
          transform: rotateY(90deg) translateZ(${halfW}px) scaleX(-1);
          backface-visibility: hidden;
        `;
        cube.appendChild(div);
        rightFace = div;
      }

      // === Back face — normal again (for the return rotation) ===
      let backFace, backCtx;
      if (useLive) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          transform: rotateY(180deg) translateZ(${halfW}px);
          backface-visibility: hidden;
        `;
        cube.appendChild(canvas);
        backFace = canvas;
        backCtx = canvas.getContext('2d');
      } else {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          background-image: url(${screenshotDataUrl});
          background-size: cover;
          background-position: center;
          transform: rotateY(180deg) translateZ(${halfW}px) scaleX(-1);
          backface-visibility: hidden;
        `;
        cube.appendChild(div);
        backFace = div;
      }

      // === Left face — mirrored (for full cube if needed) ===
      let leftFace, leftCtx;
      if (useLive) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          transform: rotateY(-90deg) translateZ(${halfW}px);
          backface-visibility: hidden;
        `;
        cube.appendChild(canvas);
        leftFace = canvas;
        leftCtx = canvas.getContext('2d');
      } else {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; top: 0; left: 0; width: ${W}px; height: ${H}px;
          background-image: url(${screenshotDataUrl});
          background-size: cover;
          background-position: center;
          transform: rotateY(-90deg) translateZ(${halfW}px) scaleX(-1);
          backface-visibility: hidden;
        `;
        cube.appendChild(div);
        leftFace = div;
      }

      // Edge lighting — highlights the rotating edge for depth
      const edgeGlow = document.createElement('div');
      edgeGlow.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 10;
        pointer-events: none;
        opacity: 0;
      `;
      container.appendChild(edgeGlow);

      const startTime = performance.now();

      // Timeline:
      // 0-12%   — rotate cube from 0° to -90° (front → right/mirrored)
      // 12-88%  — hold mirrored, live feed plays reversed
      // 88-100% — rotate cube from -90° to -180° (mirrored → back/normal)

      function paintFrames() {
        if (!useLive || !liveVideo || liveVideo.readyState < 2) return;

        // Front + back: normal
        if (frontCtx) {
          frontCtx.setTransform(1, 0, 0, 1, 0, 0);
          frontCtx.drawImage(liveVideo, 0, 0, W, H);
        }
        if (backCtx) {
          backCtx.setTransform(1, 0, 0, 1, 0, 0);
          backCtx.drawImage(liveVideo, 0, 0, W, H);
        }

        // Right + left: mirrored
        if (rightCtx) {
          rightCtx.setTransform(-1, 0, 0, 1, W, 0);
          rightCtx.drawImage(liveVideo, 0, 0, W, H);
        }
        if (leftCtx) {
          leftCtx.setTransform(-1, 0, 0, 1, W, 0);
          leftCtx.drawImage(liveVideo, 0, 0, W, H);
        }
      }

      // Ease in-out cubic
      function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function animate(now) {
        if (signal && signal.aborted) { resolve(); return; }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (useLive) paintFrames();

        let rotY, edgeOpacity;

        if (progress < 0.12) {
          // Rotate to mirrored face
          const p = progress / 0.12;
          const eased = easeInOut(p);
          rotY = -90 * eased;
          edgeOpacity = Math.sin(eased * Math.PI) * 0.6;
        } else if (progress < 0.88) {
          // Hold mirrored
          rotY = -90;
          edgeOpacity = 0;
        } else {
          // Rotate to back (normal) face
          const p = (progress - 0.88) / 0.12;
          const eased = easeInOut(p);
          rotY = -90 - 90 * eased;
          edgeOpacity = Math.sin(eased * Math.PI) * 0.6;
        }

        cube.style.transform = `translateZ(-${halfW}px) rotateY(${rotY}deg)`;

        // Edge glow — bright line on the leading edge during rotation
        if (edgeOpacity > 0.01) {
          const gradientDir = rotY > -90 ? 'to left' : 'to right';
          edgeGlow.style.background = `linear-gradient(${gradientDir}, rgba(255,255,255,${edgeOpacity}) 0%, transparent 15%)`;
          edgeGlow.style.opacity = '1';
        } else {
          edgeGlow.style.opacity = '0';
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
    container.style.perspective = '';
    container.style.perspectiveOrigin = '';
    container.style.overflow = '';
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = mirrorFlip;
}
if (typeof window !== 'undefined') {
  window.__effectExport = mirrorFlip;
}
