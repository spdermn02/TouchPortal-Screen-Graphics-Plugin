// Main renderer script - wires IPC events to the effect runner

const container = document.getElementById('effect-container');
const runner = new EffectRunner(container);

window.screenGraphics.onPlayEffect(async (data) => {
  try {
    window.screenGraphics.notifyStarted({ name: data.name });
    await runner.play(data);
    window.screenGraphics.notifyFinished({ name: data.name });
  } catch (err) {
    console.error('Effect play error:', err);
    window.screenGraphics.notifyError({
      name: data.name,
      error: err.message || String(err),
    });
  }
});

window.screenGraphics.onStopEffect(() => {
  runner.stopCurrent();
});

window.screenGraphics.onStopAll(() => {
  runner.stopAll();
});
