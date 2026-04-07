const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const EventEmitter = require('events');

class ElectronManager extends EventEmitter {
  constructor() {
    super();
    this.electronProcess = null;
    this.ipcServer = null;
    this.clientSocket = null;
    this.ready = false;
    this.messageQueue = [];
    this._buffer = '';
  }

  start() {
    if (this.electronProcess) return;

    // Create TCP server for IPC, then spawn Electron with the port
    this.ipcServer = net.createServer((socket) => {
      this.clientSocket = socket;
      socket.setEncoding('utf8');

      socket.on('data', (chunk) => {
        this._buffer += chunk;
        const lines = this._buffer.split('\n');
        this._buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const msg = JSON.parse(trimmed);

            if (msg.type === 'READY') {
              this.ready = true;
              for (const queued of this.messageQueue) {
                this._write(queued);
              }
              this.messageQueue = [];
            }

            this.emit('message', msg);
          } catch (e) {
            console.log(`[electron] ${trimmed}`);
          }
        }
      });

      socket.on('end', () => {
        this.clientSocket = null;
        this.ready = false;
      });

      socket.on('error', (err) => {
        console.error('IPC socket error:', err.message);
        this.clientSocket = null;
        this.ready = false;
      });
    });

    // Listen on a random available port
    this.ipcServer.listen(0, '127.0.0.1', () => {
      const port = this.ipcServer.address().port;
      console.log(`IPC server listening on port ${port}`);
      this._spawnElectron(port);
    });
  }

  _spawnElectron(port) {
    // In production the Electron binary is bundled at <plugin>/electron-dist/electron.exe
    // In development, fall back to require('electron') which resolves via node_modules
    const pluginRoot = path.join(__dirname, '..');
    const bundledElectron = process.platform === 'win32'
      ? path.join(pluginRoot, 'electron-dist', 'electron.exe')
      : path.join(pluginRoot, 'electron-dist', 'electron');

    let electronPath;
    try {
      const fs = require('fs');
      if (fs.existsSync(bundledElectron)) {
        electronPath = bundledElectron;
      } else {
        electronPath = require('electron');
      }
    } catch (e) {
      electronPath = require('electron');
    }

    const mainScript = path.join(__dirname, '..', 'electron', 'main.js');

    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    this.electronProcess = spawn(electronPath, [mainScript, `--ipc-port=${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    this.electronProcess.stdout.on('data', (data) => {
      console.log(`[electron] ${data.toString().trim()}`);
    });

    this.electronProcess.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) console.error(`[electron] ${text}`);
    });

    this.electronProcess.on('exit', (code) => {
      console.log(`Electron process exited with code ${code}`);
      this.electronProcess = null;
      this.clientSocket = null;
      this.ready = false;
    });

    this.electronProcess.on('error', (err) => {
      console.error('Electron process error:', err);
    });
  }

  _write(message) {
    if (this.clientSocket && !this.clientSocket.destroyed) {
      this.clientSocket.write(JSON.stringify(message) + '\n');
    }
  }

  send(message) {
    if (!this.electronProcess) {
      console.error('Electron process not running, cannot send message');
      return;
    }

    if (!this.ready) {
      this.messageQueue.push(message);
      return;
    }

    this._write(message);
  }

  stop() {
    if (this.clientSocket) {
      this.clientSocket.destroy();
      this.clientSocket = null;
    }
    if (this.electronProcess) {
      this.electronProcess.kill();
      this.electronProcess = null;
    }
    if (this.ipcServer) {
      this.ipcServer.close();
      this.ipcServer = null;
    }
    this.ready = false;
  }
}

module.exports = { ElectronManager };
