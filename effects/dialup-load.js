// Dial-Up Load Effect
// Covers the screen with a grid of opaque "pixels" that slowly
// reveal the live screen underneath one block at a time, like a
// 90s dial-up image loading progressively.

const dialupLoad = {
  name: 'Dial-Up Load',
  description: '90s dial-up style progressive image loading that reveals the screen block by block',
  duration: 30000,

  execute: async (container, options) => {
    const { signal, duration = 30000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) { resolve(); return; }

      const W = container.clientWidth || window.innerWidth;
      const H = container.clientHeight || window.innerHeight;

      // Block size — bigger = chunkier retro feel
      const blockSize = 24;
      const cols = Math.ceil(W / blockSize);
      const rows = Math.ceil(H / blockSize);
      const totalBlocks = cols * rows;

      // Create a canvas to act as the opaque mask
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      canvas.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 1;
        image-rendering: pixelated;
      `;
      container.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // "Loading" text overlay
      const loadingText = document.createElement('div');
      loadingText.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        color: #00ff00;
        font-family: "Courier New", monospace;
        font-size: 18px;
        z-index: 2;
        text-shadow: 0 0 8px rgba(0,255,0,0.5);
        white-space: pre;
        pointer-events: none;
        opacity: 0.9;
      `;
      container.appendChild(loadingText);

      // Progress bar at the bottom
      const progressBarBg = document.createElement('div');
      progressBarBg.style.cssText = `
        position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
        width: 320px; height: 22px;
        border: 2px solid #00aa00;
        background: #001100;
        z-index: 3;
        box-shadow: 0 0 10px rgba(0,255,0,0.2);
      `;
      container.appendChild(progressBarBg);

      const progressBarFill = document.createElement('div');
      progressBarFill.style.cssText = `
        width: 0%; height: 100%;
        background: linear-gradient(to right, #004400, #00cc00);
        transition: width 0.3s;
      `;
      progressBarBg.appendChild(progressBarFill);

      // Build the reveal order — mix of scan-line and random for that authentic feel
      // First pass: rough scan (every 8th row, left to right) — like progressive JPEG
      // Second pass: fill in remaining rows in random order
      const revealOrder = [];
      const blockSet = new Set();

      // Pass 1: Interlaced scan — every 8th row
      for (let rowStep = 8; rowStep >= 1; rowStep = Math.floor(rowStep / 2)) {
        for (let r = 0; r < rows; r += rowStep) {
          for (let c = 0; c < cols; c++) {
            const key = r * cols + c;
            if (!blockSet.has(key)) {
              revealOrder.push({ r, c, key });
              blockSet.add(key);
            }
          }
        }
      }

      // Fill the canvas with a dark retro color (simulating unloaded image)
      // Use a mix of dark blocks with slight color variation for texture
      const baseColors = ['#0a0a12', '#0c0c18', '#08081a', '#0e0e14', '#0a0a20'];

      function drawFullMask() {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const color = baseColors[(r * 7 + c * 13) % baseColors.length];
            ctx.fillStyle = color;
            ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
          }
        }
        // Subtle scanline pattern
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < H; y += 2) {
          ctx.fillRect(0, y, W, 1);
        }
      }

      drawFullMask();

      // Track revealed blocks
      let revealedCount = 0;
      const revealed = new Uint8Array(totalBlocks); // 0 = covered, 1 = revealed

      const startTime = performance.now();
      let lastPercent = -1;

      // Simulated download speed text
      const speeds = ['14.4 kbps', '28.8 kbps', '33.6 kbps', '56 kbps'];
      const chosenSpeed = speeds[Math.floor(Math.random() * speeds.length)];

      function animate(now) {
        if (signal && signal.aborted) { resolve(); return; }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // How many blocks should be revealed by now
        const targetRevealed = Math.floor(progress * revealOrder.length);

        // Reveal blocks in batches
        while (revealedCount < targetRevealed && revealedCount < revealOrder.length) {
          const block = revealOrder[revealedCount];
          // Clear this block (make it transparent so live screen shows)
          ctx.clearRect(block.c * blockSize, block.r * blockSize, blockSize, blockSize);
          revealed[block.key] = 1;
          revealedCount++;
        }

        // Update loading text
        const percent = Math.floor(progress * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          const kbLoaded = Math.floor(progress * 2048);
          const kbTotal = 2048;
          loadingText.textContent =
            `Loading image...\n` +
            `${kbLoaded} KB / ${kbTotal} KB  (${percent}%)\n` +
            `Speed: ${chosenSpeed}`;
          progressBarFill.style.width = `${percent}%`;

          // Hide loading text once mostly revealed
          if (percent > 85) {
            const fadeP = (percent - 85) / 15;
            loadingText.style.opacity = String(0.9 * (1 - fadeP));
            progressBarBg.style.opacity = String(1 - fadeP);
          }
        }

        // Fully done
        if (progress >= 1) {
          // Clear entire canvas for full transparency
          ctx.clearRect(0, 0, W, H);
          loadingText.style.opacity = '0';
          progressBarBg.style.opacity = '0';

          // Brief pause then resolve
          setTimeout(() => resolve(), 500);
          return;
        }

        requestAnimationFrame(animate);
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
  module.exports = dialupLoad;
}
if (typeof window !== 'undefined') {
  window.__effectExport = dialupLoad;
}
