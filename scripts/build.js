const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const archiver = require('archiver');

const ROOT = path.join(__dirname, '..');
const OUTPUT_NAME = 'screen-graphics';
const TEMP_DIR = path.join(ROOT, '.build-temp');

// Node.js version to bundle (LTS)
const NODE_VERSION = '20.18.1';

// Platform configs
const PLATFORMS = {
  win32: {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe`,
    nodeFile: 'node.exe',
    electronBin: 'electron.exe',
  },
  darwin: {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    nodeFile: 'node',
    electronBin: 'Electron.app',
  },
  linux: {
    nodeUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`,
    nodeFile: 'node',
    electronBin: 'electron',
  },
};

// Plugin source files to include
const SOURCE_FILES = [
  'entry.tp',
  'plugin.js',
  'package.json',
];

const SOURCE_DIRS = [
  'src',
  'electron',
  'effects',
  'user-effects',
];

// Production node_modules to include (not electron — we bundle its dist separately)
const PROD_MODULES = [
  'touchportal-api',
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading ${url}...`);

    const makeRequest = (requestUrl) => {
      const lib = requestUrl.startsWith('https') ? https : http;
      lib.get(requestUrl, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build(targetPlatform) {
  const platform = targetPlatform || process.platform;
  const config = PLATFORMS[platform];

  if (!config) {
    console.error(`Unsupported platform: ${platform}`);
    console.error(`Supported: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  const suffix = platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux';
  const outputFile = path.join(ROOT, `${OUTPUT_NAME}-${suffix}.tpp`);
  const stageDir = path.join(TEMP_DIR, OUTPUT_NAME);

  console.log(`Building ${OUTPUT_NAME} for ${platform}...`);

  // Clean temp
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }
  fs.mkdirSync(stageDir, { recursive: true });

  // 1. Copy source files
  console.log('Copying source files...');
  for (const file of SOURCE_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(stageDir, file));
    }
  }

  for (const dir of SOURCE_DIRS) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) {
      copyDirSync(src, path.join(stageDir, dir));
    }
  }

  // 2. Copy production node_modules (only what's needed at runtime)
  // Recursively walk all transitive dependencies
  console.log('Copying production dependencies...');
  const nmSrc = path.join(ROOT, 'node_modules');
  const nmDest = path.join(stageDir, 'node_modules');
  fs.mkdirSync(nmDest, { recursive: true });

  const copied = new Set();
  function copyModuleTree(modName) {
    if (copied.has(modName)) return;
    copied.add(modName);

    const modSrc = path.join(nmSrc, modName);
    if (!fs.existsSync(modSrc)) return;

    copyDirSync(modSrc, path.join(nmDest, modName));

    // Recurse into this module's dependencies
    const pkgPath = path.join(modSrc, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies) {
        for (const dep of Object.keys(pkg.dependencies)) {
          copyModuleTree(dep);
        }
      }
    }
  }

  for (const mod of PROD_MODULES) {
    copyModuleTree(mod);
  }
  console.log(`  Included ${copied.size} packages: ${[...copied].join(', ')}`);

  // 3. Bundle Electron dist binary
  console.log('Copying Electron binary...');
  const electronDistSrc = path.join(ROOT, 'node_modules', 'electron', 'dist');
  const electronDistDest = path.join(stageDir, 'electron-dist');

  if (fs.existsSync(electronDistSrc)) {
    copyDirSync(electronDistSrc, electronDistDest);
  } else {
    console.error('Electron dist not found! Run npm install first.');
    process.exit(1);
  }

  // 4. Download standalone Node.js binary (Windows only for now)
  if (platform === 'win32') {
    console.log('Downloading Node.js binary...');
    const nodeDestPath = path.join(stageDir, config.nodeFile);

    // Check if we already have it cached
    const cachedNode = path.join(TEMP_DIR, `node-${NODE_VERSION}-${platform}.exe`);
    if (fs.existsSync(cachedNode)) {
      fs.copyFileSync(cachedNode, nodeDestPath);
      console.log('  Using cached node.exe');
    } else {
      await downloadFile(config.nodeUrl, nodeDestPath);
      // Cache for future builds
      fs.copyFileSync(nodeDestPath, cachedNode);
    }
  }

  // 5. Create .tpp (zip) archive
  console.log('Creating .tpp package...');

  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`\nBuilt: ${outputFile} (${sizeMB} MB)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add the entire staged directory under the plugin name prefix
    archive.directory(stageDir, OUTPUT_NAME);

    archive.finalize();
  });

  // Clean up
  fs.rmSync(TEMP_DIR, { recursive: true });

  console.log('Done!');
}

// Parse CLI args
const args = process.argv.slice(2);
const targetPlatform = args.find((a) => ['win32', 'darwin', 'linux'].includes(a));

build(targetPlatform).catch((err) => {
  console.error('Build failed:', err);
  // Clean up on failure
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }
  process.exit(1);
});
