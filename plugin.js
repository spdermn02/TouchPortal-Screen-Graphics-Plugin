const path = require('path');
const { PLUGIN_ID, ACTIONS, DATA, STATES } = require('./src/constants');
const { TPClient, initTPClient } = require('./src/tp-client');
const { ElectronManager } = require('./src/electron-manager');
const { EffectQueue } = require('./src/effect-queue');
const { EffectLoader } = require('./src/effect-loader');

const effectLoader = new EffectLoader([
  path.resolve(__dirname, 'effects'),
  path.resolve(__dirname, 'user-effects'),
]);

const effectQueue = new EffectQueue();
const electronManager = new ElectronManager();

// Wire up effect queue to electron manager
effectQueue.on('playEffect', (effect) => {
  electronManager.send({
    type: 'PLAY_EFFECT',
    payload: {
      name: effect.name,
      filePath: effect.filePath,
      displayId: effect.displayId,
      options: effect.options || {},
    },
  });
});

effectQueue.on('stopEffect', () => {
  electronManager.send({ type: 'STOP_EFFECT' });
});

effectQueue.on('stopAll', () => {
  electronManager.send({ type: 'STOP_ALL' });
});

effectQueue.on('stateChanged', (state) => {
  TPClient.stateUpdate(STATES.CURRENT_EFFECT, state.currentEffect || 'None');
  TPClient.stateUpdate(STATES.QUEUE_LENGTH, String(state.queueLength));
});

// Wire up electron manager responses back to queue
electronManager.on('message', (msg) => {
  switch (msg.type) {
    case 'EFFECT_FINISHED':
      effectQueue.onEffectFinished();
      break;
    case 'EFFECT_ERROR':
      console.error(`Effect error (${msg.payload.name}): ${msg.payload.error}`);
      effectQueue.onEffectFinished();
      break;
    case 'READY':
      console.log('Electron overlay ready');
      TPClient.stateUpdate(STATES.STATUS, 'ready');
      break;
    case 'DISPLAYS_LIST':
      handleDisplaysList(msg.payload);
      break;
  }
});

let displayMap = new Map(); // display label -> display id

function handleDisplaysList(displays) {
  displayMap.clear();
  const labels = displays.map((d, i) => {
    const label = `Display ${i + 1} - ${d.width}x${d.height}`;
    displayMap.set(label, d.id);
    return label;
  });
  // Mark primary
  if (labels.length > 0) {
    labels[0] = labels[0] + ' (Primary)';
    const primaryLabel = labels[0];
    displayMap.set('Primary', displays[0].id);
    displayMap.set(primaryLabel, displays[0].id);
  }
  const choices = ['Primary', ...labels];
  TPClient.choiceUpdate(DATA.TARGET_DISPLAY, choices);
  TPClient.choiceUpdate(DATA.DELAYED_TARGET_DISPLAY, choices);
  TPClient.stateUpdate(STATES.DISPLAY_COUNT, String(displays.length));
}

function resolveDisplayId(displayLabel) {
  return displayMap.get(displayLabel) || displayMap.get('Primary') || null;
}

function getActionDataValue(data, dataId) {
  if (!data) return undefined;
  const entry = data.find((d) => d.id === dataId);
  return entry ? entry.value : undefined;
}

// Initialize Touch Portal client with action handler
initTPClient({
  onAction: (data) => {
    const actionId = data.actionId;

    switch (actionId) {
      case ACTIONS.QUEUE_EFFECT: {
        const effectName = getActionDataValue(data.data, DATA.EFFECT_NAME);
        const displayLabel = getActionDataValue(data.data, DATA.TARGET_DISPLAY);
        const effect = effectLoader.getEffect(effectName);
        if (effect) {
          effectQueue.enqueue({
            name: effect.name,
            filePath: effect.filePath,
            duration: effect.duration,
            displayId: resolveDisplayId(displayLabel),
          });
        } else {
          console.error(`Unknown effect: ${effectName}`);
        }
        break;
      }
      case ACTIONS.QUEUE_EFFECT_DELAYED: {
        const effectName = getActionDataValue(data.data, DATA.DELAYED_EFFECT_NAME);
        const displayLabel = getActionDataValue(data.data, DATA.DELAYED_TARGET_DISPLAY);
        const delaySec = parseInt(getActionDataValue(data.data, DATA.DELAY_SECONDS), 10) || 60;
        const effect = effectLoader.getEffect(effectName);
        if (effect) {
          effectQueue.enqueue(
            {
              name: effect.name,
              filePath: effect.filePath,
              duration: effect.duration,
              displayId: resolveDisplayId(displayLabel),
            },
            delaySec * 1000
          );
        } else {
          console.error(`Unknown effect: ${effectName}`);
        }
        break;
      }
      case ACTIONS.STOP_CURRENT:
        effectQueue.stopCurrent();
        break;
      case ACTIONS.STOP_ALL:
        effectQueue.stopAll();
        break;
      case ACTIONS.CLEAR_QUEUE:
        effectQueue.clearQueue();
        break;
    }
  },

  onConnected: () => {
    // Load effects and update choice list
    effectLoader.loadAll();
    const effectNames = effectLoader.getEffectNames();
    TPClient.choiceUpdate(DATA.EFFECT_NAME, effectNames);
    TPClient.choiceUpdate(DATA.DELAYED_EFFECT_NAME, effectNames);

    // Start Electron
    electronManager.start();
    TPClient.stateUpdate(STATES.STATUS, 'starting');
  },
});
