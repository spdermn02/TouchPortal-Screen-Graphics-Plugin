const fs = require('fs');
const path = require('path');

class EffectLoader {
  constructor(effectDirs) {
    this.effectDirs = effectDirs;
    this.effects = new Map(); // name -> { name, description, duration, filePath }
  }

  loadAll() {
    this.effects.clear();

    for (const dir of this.effectDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

      for (const file of files) {
        const filePath = path.resolve(dir, file);
        try {
          // Read metadata from the effect file
          // Effects export: { name, description, duration, execute, cleanup }
          // We only need metadata here (not execute/cleanup which run in renderer)
          const mod = require(filePath);
          if (mod.name && mod.duration) {
            this.effects.set(mod.name, {
              name: mod.name,
              description: mod.description || '',
              duration: mod.duration,
              filePath,
            });
            console.log(`Loaded effect: ${mod.name} from ${file}`);
          } else {
            console.warn(`Skipping ${file}: missing name or duration export`);
          }
        } catch (err) {
          console.error(`Failed to load effect ${file}:`, err.message);
        }
      }
    }
  }

  getEffectNames() {
    return Array.from(this.effects.keys());
  }

  getEffect(name) {
    return this.effects.get(name) || null;
  }
}

module.exports = { EffectLoader };
