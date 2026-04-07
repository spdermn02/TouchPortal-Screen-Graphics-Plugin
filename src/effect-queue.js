const EventEmitter = require('events');

class EffectQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.currentEffect = null;
    this.isPlaying = false;
    this.delayTimers = [];
  }

  enqueue(effect, delayMs = 0) {
    if (delayMs > 0) {
      const timer = setTimeout(() => {
        this._removeTimer(timer);
        this._addToQueue(effect);
      }, delayMs);
      this.delayTimers.push(timer);
    } else {
      this._addToQueue(effect);
    }
  }

  _addToQueue(effect) {
    this.queue.push(effect);
    this._emitState();

    if (!this.isPlaying) {
      this._playNext();
    }
  }

  _playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentEffect = null;
      this._emitState();
      return;
    }

    const effect = this.queue.shift();
    this.currentEffect = effect;
    this.isPlaying = true;
    this._emitState();
    this.emit('playEffect', effect);
  }

  stopCurrent() {
    if (this.isPlaying) {
      this.emit('stopEffect');
      // onEffectFinished will be called when electron confirms stop
    }
  }

  stopAll() {
    // Clear all pending delay timers
    for (const timer of this.delayTimers) {
      clearTimeout(timer);
    }
    this.delayTimers = [];

    // Clear queue
    this.queue = [];

    // Stop current
    if (this.isPlaying) {
      this.emit('stopAll');
      this.isPlaying = false;
      this.currentEffect = null;
    }

    this._emitState();
  }

  clearQueue() {
    // Clear delay timers
    for (const timer of this.delayTimers) {
      clearTimeout(timer);
    }
    this.delayTimers = [];

    // Clear queued effects but let current finish
    this.queue = [];
    this._emitState();
  }

  onEffectFinished() {
    this.currentEffect = null;
    this.isPlaying = false;
    this._emitState();

    // Play next if available
    if (this.queue.length > 0) {
      this._playNext();
    }
  }

  _removeTimer(timer) {
    const idx = this.delayTimers.indexOf(timer);
    if (idx !== -1) {
      this.delayTimers.splice(idx, 1);
    }
  }

  _emitState() {
    this.emit('stateChanged', {
      currentEffect: this.currentEffect ? this.currentEffect.name : null,
      queueLength: this.queue.length,
      isPlaying: this.isPlaying,
    });
  }
}

module.exports = { EffectQueue };
