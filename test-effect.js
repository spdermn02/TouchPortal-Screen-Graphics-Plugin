// Standalone test runner - launches Electron overlay and plays an effect
// without needing Touch Portal running.
//
// Usage: node test-effect.js [effectName] [delayMs]
// Example: node test-effect.js Flashbang 2000

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const readline = require('readline');

const effectName = process.argv[2] || 'Flashbang';
const delayMs = parseInt(process.argv[3], 10) || 2000;

// Load effect metadata
const { EffectLoader } = require('./src/effect-loader');
const loader = new EffectLoader([
  path.join(__dirname, 'effects'),
  path.join(__dirname, 'user-effects'),
]);
loader.loadAll();

const effect = loader.getEffect(effectName);
if (!effect) {
  console.error(`Effect "${effectName}" not found. Available: ${loader.getEffectNames().join(', ')}`);
  process.exit(1);
}

console.log(`Testing effect: ${effect.name} (${effect.duration}ms)`);
console.log(`Will trigger in ${delayMs}ms after Electron is ready...`);

let clientSocket = null;
let buffer = '';

// Create TCP server for IPC with Electron
const ipcServer = net.createServer((socket) => {
  clientSocket = socket;
  socket.setEncoding('utf8');

  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        handleMessage(JSON.parse(trimmed));
      } catch (e) {
        console.log(`[electron] ${trimmed}`);
      }
    }
  });

  socket.on('end', () => {
    clientSocket = null;
  });

  socket.on('error', () => {
    clientSocket = null;
  });
});

ipcServer.listen(0, '127.0.0.1', () => {
  const port = ipcServer.address().port;
  console.log(`IPC server on port ${port}`);
  spawnElectron(port);
});

function spawnElectron(port) {
  const electronPath = require('electron');
  const mainScript = path.join(__dirname, 'electron', 'main.js');

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(electronPath, [mainScript, `--ipc-port=${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  child.stdout.on('data', (data) => {
    console.log(`[electron:out] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.error(`[electron:err] ${text}`);
  });

  child.on('exit', (code) => {
    console.log(`Electron exited (code ${code})`);
    ipcServer.close();
    process.exit(0);
  });

  // Store ref for cleanup
  global._electronChild = child;
}

function sendToElectron(msg) {
  if (clientSocket && !clientSocket.destroyed) {
    clientSocket.write(JSON.stringify(msg) + '\n');
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'READY':
      console.log('Electron ready!');
      setTimeout(() => triggerEffect(), delayMs);
      break;

    case 'DISPLAYS_LIST':
      console.log(`Detected ${msg.payload.length} display(s):`);
      msg.payload.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.width}x${d.height} at (${d.x},${d.y})${d.primary ? ' [PRIMARY]' : ''}`);
      });
      break;

    case 'EFFECT_STARTED':
      console.log(`Effect started: ${msg.payload.name}`);
      break;

    case 'EFFECT_FINISHED':
      console.log(`Effect finished: ${msg.payload.name}`);
      console.log('Press Enter to replay, s to stop, q to quit');
      break;

    case 'EFFECT_ERROR':
      console.error(`Effect error: ${msg.payload.error}`);
      break;
  }
}

function triggerEffect() {
  console.log(`Triggering ${effect.name}...`);
  sendToElectron({
    type: 'PLAY_EFFECT',
    payload: {
      name: effect.name,
      filePath: effect.filePath,
      displayId: null,
      options: {},
    },
  });
}

// Interactive controls
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  if (cmd === 'q' || cmd === 'quit') {
    if (global._electronChild) global._electronChild.kill();
    ipcServer.close();
    process.exit(0);
  } else if (cmd === 's' || cmd === 'stop') {
    console.log('Stopping current effect...');
    sendToElectron({ type: 'STOP_EFFECT' });
  } else {
    triggerEffect();
  }
});

console.log('\nControls: [Enter] = replay, [s] = stop, [q] = quit\n');
