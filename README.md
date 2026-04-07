# Screen Graphics - Touch Portal Plugin

A Touch Portal plugin that spawns transparent on-screen overlay effects for streamers. Viewers can trigger visual effects (flashbangs, screen shake, glitches, and more) that appear over the streamer's game without blocking input.

## Features

- 8 built-in screen effects
- Effect queue system with delay support
- Multi-monitor support - choose which display the effect appears on
- Fully transparent, click-through overlay - the streamer can still play
- Extensible - create your own effects with a simple JS file
- Works with any game running in borderless windowed mode

## Installation

1. Download the latest `.tpp` file from Releases
2. Open Touch Portal and go to **Settings > Plug-ins > Import**
3. Select the `.tpp` file
4. Restart Touch Portal when prompted

### Development Setup

```bash
git clone <repo-url>
cd TouchPortal-Screen-Graphics
npm install
```

## Built-in Effects

| Effect | Duration | Description |
|---|---|---|
| **Flashbang** | 5s | Blinding white flash with blur, rotation wobble, and radial recovery from center outward |
| **Double Vision** | 7s | Three drifting image layers with chromatic aberration and swaying motion |
| **Screen Shake** | 4s | Intense earthquake tremor with impact flash that decays over time |
| **Static Glitch** | 5s | TV static with scanlines, RGB channel splitting, and random frame tearing |
| **Tunnel Vision** | 6s | Black closes in from edges to a small pulsing circle with heartbeat red tint |
| **Color Invert** | 4s | Strobing negative color inversion with hue rotation |
| **Drunk Cam** | 8s | Heavy multi-frequency swaying, zoom breathing, queasy tint, and dark vignette |
| **UFO Abduction** | 8s | A flying saucer descends, projects a tractor beam, and abducts taskbar icons (and a cow) |

All effects are semi-transparent (60-75% opacity) so the streamer can still see their game underneath.

## Touch Portal Actions

### Queue Effect

Triggers an effect immediately (or after the current one finishes if one is playing).

| Parameter | Type | Description |
|---|---|---|
| Effect | Choice | Which effect to play |
| Target Display | Choice | Which monitor to show the effect on |

### Queue Effect (Delayed)

Queues an effect to play after a specified delay.

| Parameter | Type | Description |
|---|---|---|
| Effect | Choice | Which effect to play |
| Target Display | Choice | Which monitor to show the effect on |
| Delay (seconds) | Number | How long to wait before playing |

### Stop Current Effect

Immediately stops the currently playing effect. If there are queued effects, the next one will play.

### Stop All Effects

Stops the current effect AND clears the entire queue.

### Clear Effect Queue

Clears all queued effects but lets the currently playing effect finish naturally.

## Touch Portal States

These states update in real-time and can be used in Touch Portal buttons and conditionals.

| State | Description | Example Values |
|---|---|---|
| **SG: Current Effect** | Name of the currently playing effect | "Flashbang", "None" |
| **SG: Queue Length** | Number of effects waiting in the queue | "0", "3" |
| **SG: Plugin Status** | Current plugin state | "initializing", "connected", "ready" |
| **SG: Display Count** | Number of detected monitors | "1", "2" |

## Testing Effects Without Touch Portal

You can preview any effect without Touch Portal running:

```bash
# Default: Flashbang with 2 second delay
node test-effect.js

# Specific effect with custom delay
node test-effect.js "Screen Shake" 1000
node test-effect.js "UFO Abduction" 500
```

**Controls while running:**
- **Enter** - Replay the effect
- **s** - Stop the current effect
- **q** - Quit

## Multi-Monitor Support

The plugin automatically detects all connected displays when it starts. Each display appears as a choice in the Touch Portal action dropdown (e.g., "Display 1 - 2560x1440 (Primary)"). Select "Primary" to always target the main monitor.

## Known Limitations

- **Exclusive fullscreen games**: The overlay cannot appear above games running in exclusive fullscreen mode (Vulkan/DX12). The game must be in **borderless windowed** mode.
- **Screenshot timing**: The effect captures a screenshot of the screen at the moment it triggers. Since this is a frozen snapshot, it won't perfectly match a rapidly changing game scene.
- **GPU errors**: Some systems may occasionally log GPU-related errors in the console. These are typically harmless Electron/Chromium messages and don't affect the effect playback.

## Building the Plugin Package

```bash
npm run build
```

This creates `screen-graphics.tpp` in the project root, which can be imported into Touch Portal.

## Architecture

```
Touch Portal <--socket--> plugin.js (Node.js)
                              |
                    TCP IPC (localhost)
                              |
                    Electron main process
                              |
                    Renderer (transparent overlay)
```

Touch Portal launches `plugin.js`, which connects via the `touchportal-api` package. When an effect is triggered, the plugin spawns (or reuses) an Electron process that creates a transparent, click-through, always-on-top window covering the target display. Effects run as animations in the Electron renderer.

## License

MIT
