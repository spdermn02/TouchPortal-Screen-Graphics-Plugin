const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenGraphics', {
  onPlayEffect: (callback) => {
    ipcRenderer.on('play-effect', (event, data) => callback(data));
  },
  onStopEffect: (callback) => {
    ipcRenderer.on('stop-effect', () => callback());
  },
  onStopAll: (callback) => {
    ipcRenderer.on('stop-all', () => callback());
  },
  notifyStarted: (payload) => {
    ipcRenderer.send('effect-started', payload);
  },
  notifyFinished: (payload) => {
    ipcRenderer.send('effect-finished', payload);
  },
  notifyError: (payload) => {
    ipcRenderer.send('effect-error', payload);
  },
});
