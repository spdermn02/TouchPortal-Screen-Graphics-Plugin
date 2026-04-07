// UFO Abduction Effect
// A flying saucer descends into frame, projects a tractor beam,
// and sucks up taskbar icons from the bottom of the screen.

const ufoAbduction = {
  name: 'UFO Abduction',
  description: 'A UFO flies in and abducts taskbar icons with a tractor beam',
  duration: 8000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 8000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) {
        resolve();
        return;
      }

      const W = container.clientWidth || window.innerWidth;
      const H = container.clientHeight || window.innerHeight;

      // === Dark sky tint — strong nighttime/eerie feel ===
      const skyTint = document.createElement('div');
      skyTint.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at 50% 30%, rgba(5,15,40,0.55) 0%, rgba(0,0,0,0.8) 100%);
        opacity: 0;
        z-index: 1;
      `;
      container.appendChild(skyTint);

      // === UFO container — holds the saucer ===
      const ufoContainer = document.createElement('div');
      ufoContainer.style.cssText = `
        position: absolute;
        left: 0;
        top: -200px;
        z-index: 10;
        pointer-events: none;
      `;
      container.appendChild(ufoContainer);

      // Build the UFO from CSS
      const ufo = document.createElement('div');
      ufo.style.cssText = `position: relative; width: 180px; height: 90px;`;

      // Dome (top)
      const dome = document.createElement('div');
      dome.style.cssText = `
        position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%);
        width: 70px; height: 40px;
        background: radial-gradient(ellipse at 50% 80%, #b8d4e8 0%, #6a9cc4 40%, #3a6a8a 100%);
        border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
        box-shadow: 0 0 15px rgba(100,200,255,0.4);
      `;
      ufo.appendChild(dome);

      // Body (main disc)
      const body = document.createElement('div');
      body.style.cssText = `
        position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
        width: 180px; height: 40px;
        background: linear-gradient(to bottom, #8a8a8a 0%, #c0c0c0 30%, #707070 70%, #505050 100%);
        border-radius: 50%;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5), 0 0 30px rgba(100,200,255,0.3);
      `;
      ufo.appendChild(body);

      // Lights ring
      const lightsContainer = document.createElement('div');
      lightsContainer.style.cssText = `
        position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
        width: 160px; height: 20px;
      `;
      const lightColors = ['#ff3333', '#33ff33', '#ffff33', '#33ffff', '#ff33ff', '#ff8833', '#33ff33', '#ff3333'];
      for (let i = 0; i < lightColors.length; i++) {
        const light = document.createElement('div');
        const angle = (i / lightColors.length) * Math.PI;
        const lx = 80 + Math.cos(angle) * 70;
        const ly = 10 + Math.sin(angle) * 6;
        light.style.cssText = `
          position: absolute; left: ${lx - 5}px; top: ${ly - 5}px;
          width: 10px; height: 10px;
          background: ${lightColors[i]};
          border-radius: 50%;
          box-shadow: 0 0 8px ${lightColors[i]}, 0 0 15px ${lightColors[i]};
          animation: ufo-light-blink ${0.3 + i * 0.1}s ease-in-out infinite alternate;
        `;
        light.dataset.idx = i;
        lightsContainer.appendChild(light);
      }
      ufo.appendChild(lightsContainer);

      // Bottom emitter
      const emitter = document.createElement('div');
      emitter.style.cssText = `
        position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
        width: 60px; height: 15px;
        background: radial-gradient(ellipse, rgba(120,255,200,0.9) 0%, rgba(80,200,255,0.5) 60%, transparent 100%);
        border-radius: 50%;
      `;
      ufo.appendChild(emitter);

      ufoContainer.appendChild(ufo);

      // === Tractor beam — positioned dynamically to follow UFO ===
      const beam = document.createElement('div');
      beam.style.cssText = `
        position: absolute;
        top: 0;
        width: 0;
        height: 0;
        opacity: 0;
        z-index: 5;
        pointer-events: none;
      `;
      container.appendChild(beam);

      // === Style tag for animations ===
      const style = document.createElement('style');
      style.textContent = `
        @keyframes ufo-light-blink {
          0% { opacity: 0.4; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes beam-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.7; }
          100% { opacity: 0.5; }
        }
      `;
      container.appendChild(style);

      // === Extract "icons" from the taskbar area of the screenshot ===
      // Taskbar is typically at the bottom, ~48px tall, icons centered
      const icons = [];
      const taskbarH = 48;
      const iconSize = 36;
      const taskbarY = H - taskbarH;
      // Create ~12 icon-like pieces clustered under the beam
      const iconCount = 12;
      const beamHalfWidth = 300; // icons spawn within this radius of center
      const centerX = W / 2;

      for (let i = 0; i < iconCount; i++) {
        const iconEl = document.createElement('div');
        const ix = centerX - beamHalfWidth + Math.random() * beamHalfWidth * 2;
        const iy = taskbarY + (taskbarH - iconSize) / 2;

        iconEl.style.cssText = `
          position: absolute;
          left: ${ix}px;
          top: ${iy}px;
          width: ${iconSize}px;
          height: ${iconSize}px;
          background-image: url(${screenshotDataUrl});
          background-size: ${W}px ${H}px;
          background-position: -${ix}px -${iy}px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 8;
          opacity: 0.9;
          pointer-events: none;
        `;

        icons.push({
          el: iconEl,
          startX: ix,
          startY: iy,
          delay: 0.3 + Math.random() * 0.4, // staggered suck-up delay
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 2 + Math.random() * 3,
          rotSpeed: (Math.random() - 0.5) * 720, // degrees per second
          suckedUp: false,
        });

        container.appendChild(iconEl);
      }

      // === Add a cow somewhere on the ground to get abducted ===
      const cowEl = document.createElement('div');
      const cowX = W / 2 - 32 + (Math.random() - 0.5) * 60; // centered under UFO with slight randomness
      const cowY = H - 140 - Math.random() * 40; // ground level, above taskbar
      const cowSize = 64;
      cowEl.style.cssText = `
        position: absolute;
        left: ${cowX}px;
        top: ${cowY}px;
        width: ${cowSize}px;
        height: ${cowSize}px;
        font-size: ${cowSize}px;
        line-height: 1;
        text-align: center;
        z-index: 8;
        opacity: 0;
        pointer-events: none;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      `;
      cowEl.textContent = '🐄';
      container.appendChild(cowEl);

      icons.push({
        el: cowEl,
        startX: cowX,
        startY: cowY,
        delay: 0.15 + Math.random() * 0.2, // cow gets grabbed early-mid
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5 + Math.random() * 2,
        rotSpeed: (Math.random() - 0.5) * 400,
        isCow: true,
      });

      // Sort icons by delay so they get sucked up in a natural order
      icons.sort((a, b) => a.delay - b.delay);

      const startTime = performance.now();
      const ufoTargetY = H * 0.25;
      const ufoHalfW = 90; // half the UFO width (180/2)
      const emitterOffsetY = 75; // distance from ufoContainer top to emitter bottom

      function animate(now) {
        if (signal && signal.aborted) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;

        // Track UFO center X in pixels (not CSS calc)
        let ufoY, ufoCenterX;
        const halfW = W / 2;

        if (progress < 0.15) {
          const p = progress / 0.15;
          const eased = 1 - Math.pow(1 - p, 3);
          ufoY = -200 + (ufoTargetY + 200) * eased;
          const sway = Math.sin(t * 4) * 30 * p;
          ufoCenterX = halfW + sway;
        } else if (progress < 0.90) {
          ufoY = ufoTargetY;
          const bob = Math.sin(t * 1.5) * 8;
          const sway = Math.sin(t * 0.7) * 15;
          ufoY += bob;
          ufoCenterX = halfW + sway;
        } else {
          const p = (progress - 0.90) / 0.10;
          const eased = Math.pow(p, 2);
          ufoY = ufoTargetY - (ufoTargetY + 300) * eased;
          const sway = Math.sin(t * 6) * 20 * (1 - p);
          ufoCenterX = halfW + sway;
        }

        // Position UFO using pixel left (center of 180px UFO)
        ufoContainer.style.left = `${ufoCenterX - ufoHalfW}px`;
        ufoContainer.style.top = `${ufoY}px`;

        // Animate UFO lights
        const lights = lightsContainer.children;
        for (let i = 0; i < lights.length; i++) {
          const phase = (t * 3 + i * 0.8) % 1;
          lights[i].style.opacity = String(0.4 + phase * 0.6);
        }

        // Sky tint — much more noticeable
        if (progress < 0.15) {
          skyTint.style.opacity = String(progress / 0.15 * 0.85);
        } else if (progress > 0.85) {
          skyTint.style.opacity = String(0.85 * (1 - (progress - 0.85) / 0.15));
        } else {
          skyTint.style.opacity = '0.85';
        }

        // === Beam — anchored to UFO emitter position ===
        const beamActive = progress > 0.12 && progress < 0.85;
        if (beamActive) {
          let beamOpacity;
          if (progress < 0.20) {
            beamOpacity = (progress - 0.12) / 0.08;
          } else if (progress > 0.78) {
            beamOpacity = (0.85 - progress) / 0.07;
          } else {
            beamOpacity = 1;
          }

          const beamTopY = ufoY + emitterOffsetY;
          const beamTopWidth = 60;
          const beamHeight = Math.max(0, H - beamTopY);
          const beamBottomWidth = beamTopWidth + beamHeight * 0.8;

          // Center beam on the UFO's current X
          beam.style.left = `${ufoCenterX - beamBottomWidth / 2}px`;
          beam.style.width = `${beamBottomWidth}px`;
          beam.style.height = `${beamHeight}px`;
          beam.style.top = `${beamTopY}px`;
          beam.style.opacity = String(beamOpacity * 0.7);

          const shimmer = 0.3 + Math.sin(t * 4) * 0.1;
          beam.style.background = `linear-gradient(
            to bottom,
            rgba(120,255,200,${0.6 + shimmer}) 0%,
            rgba(80,220,255,${0.3 + shimmer * 0.5}) 40%,
            rgba(100,255,180,${0.1 + shimmer * 0.3}) 80%,
            transparent 100%
          )`;
          beam.style.clipPath = `polygon(
            ${50 - (beamTopWidth / beamBottomWidth) * 50}% 0%,
            ${50 + (beamTopWidth / beamBottomWidth) * 50}% 0%,
            100% 100%,
            0% 100%
          )`;

          const particleY = ((t * 100) % beamHeight);
          beam.style.boxShadow = `
            inset 0 ${-particleY}px 20px rgba(150,255,220,0.15),
            inset 0 ${-particleY * 0.6}px 15px rgba(100,200,255,0.1)
          `;
        } else {
          beam.style.opacity = '0';
        }

        // === Show the cow once the beam is near it ===
        if (progress > 0.15 && progress < 0.85) {
          const cowShowP = Math.min(1, (progress - 0.15) / 0.05);
          if (parseFloat(cowEl.style.opacity) < 0.01 || cowShowP < 1) {
            cowEl.style.opacity = String(cowShowP * 0.9);
          }
        }

        // === Icons + cow getting sucked up — target the UFO's current position ===
        const suckPhaseStart = 0.25;
        const suckPhaseEnd = 0.78;

        if (progress >= suckPhaseStart && progress <= suckPhaseEnd + 0.05) {
          const suckProgress = (progress - suckPhaseStart) / (suckPhaseEnd - suckPhaseStart);
          const targetY = ufoY + emitterOffsetY;

          for (let i = 0; i < icons.length; i++) {
            const icon = icons[i];
            const iconProgress = Math.max(0, Math.min(1, (suckProgress - icon.delay) / (1 - icon.delay)));

            if (iconProgress <= 0) continue;

            const eased = Math.pow(iconProgress, 0.6);
            const itemSize = icon.isCow ? cowSize : iconSize;

            // Lerp toward the UFO's current center X
            const x = icon.startX + (ufoCenterX - itemSize / 2 - icon.startX) * eased;
            const y = icon.startY + (targetY - icon.startY) * eased;

            // Cow gets extra frantic wobble
            const wobbleMult = icon.isCow ? 40 : 25;
            const wobbleX = Math.sin(t * icon.wobbleSpeed + icon.wobblePhase) * wobbleMult * (1 - eased);
            const rot = t * icon.rotSpeed * eased;
            const scale = icon.isCow ? (1.2 - eased * 0.9) : (1 - eased * 0.7);
            const opacity = eased > 0.85 ? (1 - eased) / 0.15 : 0.9;

            icon.el.style.left = `${x + wobbleX}px`;
            icon.el.style.top = `${y}px`;
            icon.el.style.transform = `rotate(${rot}deg) scale(${scale})`;
            icon.el.style.opacity = String(opacity);

            if (iconProgress > 0.1) {
              const glowColor = icon.isCow ? 'rgba(100,255,200,0.7)' : `rgba(100,255,200,${0.5 * eased})`;
              icon.el.style.filter = icon.isCow
                ? `drop-shadow(0 0 ${20 * eased}px rgba(100,255,200,${0.6 * eased}))`
                : `none`;
              if (!icon.isCow) {
                icon.el.style.boxShadow = `0 0 ${15 * eased}px rgba(100,255,200,${0.5 * eased})`;
              }
            }
          }
        }

        // Fade everything out at the very end
        if (progress > 0.92) {
          const fadeP = (progress - 0.92) / 0.08;
          container.style.opacity = String(1 - fadeP);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          container.style.opacity = '1';
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
    container.style.opacity = '1';
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ufoAbduction;
}
if (typeof window !== 'undefined') {
  window.__effectExport = ufoAbduction;
}
