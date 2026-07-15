class AudioEngine {
  constructor() {
    this._audioContext = null;
    this._sourceNode = null;
    this._gainNode = null;
    this._startTime = 0;
    this._startOffset = 0;
    this._speed = 1.0;
    this._isPlaying = false;
    this._currentBuffer = null;
  }

  get context() {
    if (!this._audioContext) {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioContext;
  }

  get currentTime() {
    if (!this._isPlaying) return this._startOffset;
    const elapsed = (this.context.currentTime - this._startTime) * this._speed;
    const duration = this._currentBuffer ? this._currentBuffer.duration : 0;
    return Math.min(this._startOffset + elapsed, duration);
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get sampleRate() {
    return this._currentBuffer ? this._currentBuffer.sampleRate : 0;
  }

  get duration() {
    return this._currentBuffer ? this._currentBuffer.duration : 0;
  }

  async loadFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this._currentBuffer = audioBuffer;
    this.stop();
    return audioBuffer;
  }

  play(buffer, startTime = 0) {
    if (this._isPlaying) this.stop();
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    this._currentBuffer = buffer || this._currentBuffer;
    if (!this._currentBuffer) return;

    this._sourceNode = this.context.createBufferSource();
    this._sourceNode.buffer = this._currentBuffer;
    this._sourceNode.playbackRate.value = this._speed;

    this._gainNode = this.context.createGain();
    this._gainNode.gain.value = 1.0;

    this._sourceNode.connect(this._gainNode);
    this._gainNode.connect(this.context.destination);

    this._startOffset = startTime;
    this._startTime = this.context.currentTime;
    this._isPlaying = true;

    this._sourceNode.start(0, startTime);
    this._sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this._startOffset = this._currentBuffer.duration;
        if (this._onStopCallback) this._onStopCallback();
      }
    };
  }

  pause() {
    if (!this._isPlaying) return;
    this._startOffset = this.currentTime;
    this._stopSource();
    this._isPlaying = false;
  }

  stop() {
    this._stopSource();
    this._isPlaying = false;
    this._startOffset = 0;
  }

  setSpeed(rate) {
    this._speed = Math.max(0.25, Math.min(4.0, rate));
    if (this._sourceNode) {
      this._sourceNode.playbackRate.value = this._speed;
    }
  }

  seek(time) {
    const wasPlaying = this._isPlaying;
    const safeTime = Math.max(0, Math.min(time, this.duration));

    if (wasPlaying) {
      this._startOffset = safeTime;
      this._startTime = this.context.currentTime;
      if (this._sourceNode) {
        this._stopSource();
        this._createSourceAndPlay(safeTime);
      }
    } else {
      this._startOffset = safeTime;
    }
  }

  onStop(callback) {
    this._onStopCallback = callback;
  }

  _stopSource() {
    if (this._sourceNode) {
      try { this._sourceNode.stop(); } catch (_) {}
      try { this._sourceNode.disconnect(); } catch (_) {}
      this._sourceNode = null;
    }
  }

  _createSourceAndPlay(startTime) {
    if (!this._currentBuffer) return;
    this._sourceNode = this.context.createBufferSource();
    this._sourceNode.buffer = this._currentBuffer;
    this._sourceNode.playbackRate.value = this._speed;

    this._gainNode = this.context.createGain();
    this._gainNode.gain.value = 1.0;

    this._sourceNode.connect(this._gainNode);
    this._gainNode.connect(this.context.destination);

    this._sourceNode.start(0, startTime);
    this._sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this._startOffset = this._currentBuffer.duration;
        if (this._onStopCallback) this._onStopCallback();
      }
    };
  }
}
