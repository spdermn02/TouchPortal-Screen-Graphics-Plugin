# Creating Custom Effects

You can create your own screen effects by adding a JavaScript file to the `user-effects/` folder. The plugin automatically discovers and loads any `.js` file in that directory when it starts.

## Quick Start

1. Create a new `.js` file in the `user-effects/` folder (e.g., `my-effect.js`)
2. Export an effect object with the required interface (see below)
3. Restart the plugin (or Touch Portal) to pick up the new effect
4. Your effect will appear in the Touch Portal action dropdown

## Effect Interface

Every effect file must export an object with the following shape:

```javascript
const myEffect = {
  // REQUIRED: Display name shown in Touch Portal dropdown
  name: 'My Effect',

  // OPTIONAL: Description of what the effect does
  description: 'A cool custom effect',

  // REQUIRED: Default duration in milliseconds
  // This is also used as a safety timeout (duration + 5s) to prevent
  // a broken effect from blocking the queue forever
  duration: 5000,

  // REQUIRED: Main effect function
  // Called when the effect should start playing
  execute: async (container, options) => {
    // Build your effect here (see API details below)
  },

  // REQUIRED: Cleanup function
  // Called when the effect ends or is interrupted
  cleanup: (container) => {
    container.innerHTML = '';
  },
};

// REQUIRED: These two export lines make the effect work in both
// Node.js (for metadata loading) and the browser (for rendering)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = myEffect;
}
if (typeof window !== 'undefined') {
  window.__effectExport = myEffect;
}
```

## The `execute` Function

```javascript
execute: async (container, options) => { ... }
```

### Parameters

**`container`** (HTMLElement)
- A full-screen `<div>` positioned over the entire display
- Append your effect elements to this container
- The container has `pointer-events: none` so it won't block mouse input
- Its dimensions match the target display

**`options`** (Object)
- `options.screenshotDataUrl` - A data URL (`data:image/png;base64,...`) of the screen captured at the moment the effect was triggered. Use this as a `background-image` to create distorted versions of the screen.
- `options.signal` - An [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal). Check `signal.aborted` in your animation loop and stop early if true. This fires when the user triggers "Stop Current Effect".
- `options.duration` - The duration in ms (may be overridden from the default).

### Return Value

`execute` must return a **Promise** that resolves when the effect is done. The simplest way is to wrap your animation in `new Promise((resolve) => { ... })` and call `resolve()` when finished.

### Important Rules

1. **Always check the abort signal** in your animation loop so effects can be stopped
2. **Always resolve the promise** - if your effect never resolves, the queue will stall (a safety timeout will eventually kill it, but this is not graceful)
3. **Use `requestAnimationFrame`** for smooth animations
4. **Keep the overlay transparent** - use semi-transparent layers (60-75% opacity) so the user can still see their game

## The `cleanup` Function

```javascript
cleanup: (container) => {
  container.innerHTML = '';
}
```

Called when the effect ends (naturally or via stop). Remove all DOM elements you created. At minimum, clear `container.innerHTML`. If you have running timers or other resources, clean those up too.

## Using the Screenshot

The screenshot lets you create effects that distort what was on screen. Use it as a CSS background:

```javascript
const layer = document.createElement('div');
layer.style.cssText = `
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url(${options.screenshotDataUrl});
  background-size: cover;
  background-position: center;
  opacity: 0.7;
`;
container.appendChild(layer);
```

For effects that don't need the screenshot (like Tunnel Vision which just overlays a mask), you can ignore `screenshotDataUrl` entirely.

## Template: Minimal Effect

A minimal working effect that flashes red:

```javascript
const redFlash = {
  name: 'Red Flash',
  description: 'Simple red flash overlay',
  duration: 2000,

  execute: async (container, options) => {
    const { signal, duration = 2000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) { resolve(); return; }

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 0, 0, 0.5);
      `;
      container.appendChild(overlay);

      const startTime = performance.now();

      function animate(now) {
        if (signal && signal.aborted) { resolve(); return; }

        const progress = Math.min((now - startTime) / duration, 1);

        // Fade from 0.5 opacity to 0
        overlay.style.opacity = String(0.5 * (1 - progress));

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
  module.exports = redFlash;
}
if (typeof window !== 'undefined') {
  window.__effectExport = redFlash;
}
```

## Template: Screenshot-Based Effect

An effect that uses the screenshot with CSS filters:

```javascript
const hueShift = {
  name: 'Hue Shift',
  description: 'Rotates the screen colors through the rainbow',
  duration: 4000,

  execute: async (container, options) => {
    const { screenshotDataUrl, signal, duration = 4000 } = options;

    return new Promise((resolve) => {
      if (signal && signal.aborted) { resolve(); return; }

      const layer = document.createElement('div');
      layer.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background-image: url(${screenshotDataUrl});
        background-size: cover;
        background-position: center;
        opacity: 0.7;
      `;
      container.appendChild(layer);

      const startTime = performance.now();

      function animate(now) {
        if (signal && signal.aborted) { resolve(); return; }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;

        // Rotate hue through 360 degrees
        const hue = t * 180; // degrees per second
        layer.style.filter = `hue-rotate(${hue}deg) saturate(1.5)`;

        // Fade out in the last 20%
        if (progress > 0.8) {
          layer.style.opacity = String(0.7 * (1 - (progress - 0.8) / 0.2));
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
  module.exports = hueShift;
}
if (typeof window !== 'undefined') {
  window.__effectExport = hueShift;
}
```

## Testing Your Effect

Use the test runner to preview without Touch Portal:

```bash
node test-effect.js "My Effect"
node test-effect.js "My Effect" 500   # with 500ms delay
```

Press **Enter** to replay, **s** to stop mid-effect, **q** to quit.

## Tips

- **Oversized layers**: If your effect rotates or scales the screenshot, make the layer larger than 100% (e.g., `top: -10%; width: 120%`) to prevent showing transparent corners.
- **CSS filters**: `blur()`, `brightness()`, `saturate()`, `hue-rotate()`, `invert()`, `contrast()`, and `sepia()` are all GPU-accelerated and perform well.
- **`mix-blend-mode`**: Use `screen`, `multiply`, `overlay`, or `soft-light` on stacked layers for interesting compositing effects.
- **Canvas**: You can create `<canvas>` elements for pixel-level effects like noise or custom distortion. See `static-glitch.js` for an example.
- **CSS animations**: You can inject `<style>` tags with `@keyframes` for CSS-driven animations. See `ufo-abduction.js` for an example.
- **No external dependencies**: Effects run in a plain browser context. You have access to standard Web APIs (Canvas, Web Animations, CSS) but not Node.js modules.
- **Performance**: Aim for 60fps. Avoid heavy DOM manipulation every frame — prefer CSS transforms and filters over changing layout properties.
- **Semi-transparency**: Keep your main layers at 60-75% opacity so the user can still see their game. A fully opaque overlay defeats the purpose.
