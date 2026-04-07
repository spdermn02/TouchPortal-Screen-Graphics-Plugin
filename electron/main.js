const { app, BrowserWindow, screen, desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const net = require('net');

let overlayWindow = null;
let parentSocket = null;

// IPC port passed as command line arg
const ipcPort = parseInt(process.argv.find((a) => a.startsWith('--ipc-port='))?.split('=')[1], 10);

// Send JSON message to parent over TCP
function sendToParent(msg) {
  if (parentSocket && !parentSocket.destroyed) {
    parentSocket.write(JSON.stringify(msg) + '\n');
  }
}

// Prevent Electron from quitting when windows are hidden/closed
app.on('window-all-closed', () => {
  // Do nothing — we manage the lifecycle via IPC from parent
});

// Disable hardware acceleration for reliable transparency
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createOverlayWindow();
  connectToParent();

  // Listen for display changes
  screen.on('display-added', () => sendDisplaysList());
  screen.on('display-removed', () => sendDisplaysList());
});

function connectToParent() {
  if (!ipcPort) {
    console.error('No --ipc-port specified, cannot connect to parent');
    app.quit();
    return;
  }

  parentSocket = net.createConnection({ port: ipcPort, host: '127.0.0.1' }, () => {
    sendDisplaysList();
    sendToParent({ type: 'READY' });
  });

  let buffer = '';

  parentSocket.setEncoding('utf8');

  parentSocket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);
        handleParentMessage(msg);
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
  });

  parentSocket.on('end', () => {
    app.quit();
  });

  parentSocket.on('error', (err) => {
    console.error('IPC socket error:', err.message);
    app.quit();
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  // Try to exclude this window from screen capture so live mirroring
  // doesn't create a feedback loop
  try {
    overlayWindow.setContentProtection(true);
  } catch (e) {
    console.warn('setContentProtection not supported:', e.message);
  }

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function sendDisplaysList() {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;

  const sorted = displays.sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    return 0;
  });

  const payload = sorted.map((d) => ({
    id: d.id,
    width: d.size.width,
    height: d.size.height,
    x: d.bounds.x,
    y: d.bounds.y,
    primary: d.id === primaryId,
  }));

  sendToParent({ type: 'DISPLAYS_LIST', payload });
}

function positionOverlayOnDisplay(displayId) {
  const displays = screen.getAllDisplays();
  const target = displays.find((d) => d.id === displayId) || screen.getPrimaryDisplay();
  const { x, y, width, height } = target.bounds;
  overlayWindow.setBounds({ x, y, width, height });
}

async function captureScreenshot(displayId) {
  const displays = screen.getAllDisplays();
  const target = displays.find((d) => d.id === displayId) || screen.getPrimaryDisplay();
  const { width, height } = target.size;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });

  let source = sources.find((s) => s.display_id === String(target.id));
  if (!source && sources.length > 0) {
    source = sources[0];
  }

  if (source) {
    return source.thumbnail.toDataURL();
  }
  return null;
}

async function getScreenSourceId(displayId) {
  const displays = screen.getAllDisplays();
  const target = displays.find((d) => d.id === displayId) || screen.getPrimaryDisplay();

  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  let source = sources.find((s) => s.display_id === String(target.id));
  if (!source && sources.length > 0) {
    source = sources[0];
  }
  return source ? source.id : null;
}

async function handleParentMessage(msg) {
  switch (msg.type) {
    case 'PLAY_EFFECT': {
      const { name, filePath, displayId, options } = msg.payload;

      positionOverlayOnDisplay(displayId);

      const screenshotDataUrl = await captureScreenshot(displayId);
      const screenSourceId = await getScreenSourceId(displayId);

      overlayWindow.show();

      overlayWindow.webContents.send('play-effect', {
        name,
        filePath,
        options: {
          ...options,
          screenshotDataUrl,
          screenSourceId,
        },
      });
      break;
    }

    case 'STOP_EFFECT':
      overlayWindow.webContents.send('stop-effect');
      break;

    case 'STOP_ALL':
      overlayWindow.webContents.send('stop-all');
      break;

    case 'SHOW_OVERLAY':
      overlayWindow.show();
      break;

    case 'HIDE_OVERLAY':
      overlayWindow.hide();
      break;

    case 'GET_DISPLAYS':
      sendDisplaysList();
      break;
  }
}

// Renderer tells us an effect finished
ipcMain.on('effect-finished', (event, payload) => {
  overlayWindow.hide();
  sendToParent({ type: 'EFFECT_FINISHED', payload });
});

ipcMain.on('effect-error', (event, payload) => {
  overlayWindow.hide();
  sendToParent({ type: 'EFFECT_ERROR', payload });
});

ipcMain.on('effect-started', (event, payload) => {
  sendToParent({ type: 'EFFECT_STARTED', payload });
});
