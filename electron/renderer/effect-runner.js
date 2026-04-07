// EffectRunner - loads and executes effects in the renderer process

class EffectRunner {
  constructor(container) {
    this.container = container;
    this.currentEffect = null;
    this.abortController = null;
    this.effectCache = new Map();
    this.liveStream = null;
    this.liveVideo = null;
  }

  async loadEffect(filePath) {
    if (this.effectCache.has(filePath)) {
      return this.effectCache.get(filePath);
    }

    // Load effect module dynamically via script injection
    // Effect files assign to window.__effectExport
    return new Promise((resolve, reject) => {
      // Clear any previous export
      delete window.__effectExport;

      const script = document.createElement('script');
      script.src = `file://${filePath.replace(/\\/g, '/')}`;
      script.onload = () => {
        const effect = window.__effectExport;
        if (effect) {
          this.effectCache.set(filePath, effect);
          resolve(effect);
        } else {
          reject(new Error(`Effect file did not export via window.__effectExport: ${filePath}`));
        }
        script.remove();
      };
      script.onerror = () => {
        reject(new Error(`Failed to load effect script: ${filePath}`));
        script.remove();
      };
      document.head.appendChild(script);
    });
  }

  // Start a live screen capture stream and create a <video> element.
  // getUserMedia must be called here in the renderer context so the
  // MediaStream object stays alive (it can't cross the contextBridge).
  async startLiveStream(screenSourceId) {
    this.stopLiveStream();

    if (!screenSourceId) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSourceId,
            minWidth: 1,
            minHeight: 1,
          },
        },
      });
      if (!stream) return null;

      this.liveStream = stream;

      // Create a hidden video element playing the live stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(video);

      // Wait for the video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(resolve);
        };
        // Fallback timeout
        setTimeout(resolve, 2000);
      });

      this.liveVideo = video;
      return video;
    } catch (e) {
      console.error('Failed to start live stream:', e);
      return null;
    }
  }

  stopLiveStream() {
    if (this.liveStream) {
      this.liveStream.getTracks().forEach((track) => track.stop());
      this.liveStream = null;
    }
    if (this.liveVideo) {
      this.liveVideo.srcObject = null;
      this.liveVideo.remove();
      this.liveVideo = null;
    }
  }

  async play(data) {
    const { name, filePath, options } = data;

    // Stop any currently playing effect
    this.cleanup();

    // Load the effect module
    const effect = await this.loadEffect(filePath);

    // Start live stream if the effect wants it and a source ID is available
    let liveVideo = null;
    if (effect.useLiveStream && options.screenSourceId) {
      liveVideo = await this.startLiveStream(options.screenSourceId);
    }

    // Create an abort controller for this effect
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.currentEffect = effect;

    const duration = options.duration || effect.duration || 5000;
    const timeoutMs = duration + 5000; // safety margin

    // Run effect with timeout safety
    await Promise.race([
      effect.execute(this.container, { ...options, signal, duration, liveVideo }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Effect timed out')), timeoutMs)
      ),
      new Promise((resolve) => {
        const checkAbort = () => {
          if (signal.aborted) resolve();
        };
        signal.addEventListener('abort', checkAbort);
      }),
    ]);

    this.cleanup();
  }

  stopCurrent() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.cleanup();
  }

  stopAll() {
    this.stopCurrent();
  }

  cleanup() {
    if (this.currentEffect && this.currentEffect.cleanup) {
      try {
        this.currentEffect.cleanup(this.container);
      } catch (e) {
        console.error('Effect cleanup error:', e);
      }
    }
    this.container.innerHTML = '';
    this.currentEffect = null;
    this.abortController = null;
    this.stopLiveStream();
  }
}
