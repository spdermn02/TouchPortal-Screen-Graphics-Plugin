const TouchPortalAPI = require('touchportal-api');
const { PLUGIN_ID, STATES } = require('./constants');

const TPClient = new TouchPortalAPI.Client();

function initTPClient({ onAction, onConnected, onSettings }) {
  TPClient.connect({ pluginId: PLUGIN_ID });

  TPClient.on('connected', () => {
    console.log('Connected to Touch Portal');
    TPClient.stateUpdate(STATES.STATUS, 'connected');
    if (onConnected) onConnected();
  });

  TPClient.on('Action', (data, hold) => {
    // Ignore hold events (button held down) — only respond to press
    if (hold) return;
    if (onAction) onAction(data);
  });

  // Fires with the initial values on connect and again whenever the user changes a setting
  TPClient.on('Settings', (data) => {
    console.log('Settings updated:', data);
    if (onSettings) onSettings(data);
  });

  TPClient.on('Info', (data) => {
    console.log('Touch Portal info:', data);
  });

  TPClient.on('Close', () => {
    console.log('Touch Portal connection closed');
    process.exit(0);
  });

  TPClient.on('disconnected', () => {
    console.log('Disconnected from Touch Portal');
  });

  TPClient.on('error', (err) => {
    console.error('Touch Portal client error:', err);
  });
}

module.exports = { TPClient, initTPClient };
