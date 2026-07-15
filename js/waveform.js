class WaveformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._buffer = null;
    this._currentTime = 0;
    this._selection = { start: 0, end: 0 };
    this._resizeObserver = null;
    this._initResize();
  }

  render(buffer) {
    this._buffer = buffer;
    this._draw();
  }

  updateCursor(time) {
    this._currentTime = time;
    this._draw();
  }

  clear() {
    this._buffer = null;
    this._currentTime = 0;
    this._drawEmpty();
  }

  get selection() {
    return this._selection;
  }

  setSelection(start, end) {
    this._selection = { start, end };
    this._draw();
  }

  _initResize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(dpr, dpr);
      if (this._buffer) this._draw();
      else this._drawEmpty();
    };
    resize();
    this._resizeObserver = new ResizeObserver(resize);
    this._resizeObserver.observe(this.canvas.parentElement);
  }

  _drawEmpty() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
  }

  _draw() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    if (!this._buffer) return;

    const data = this._buffer.getChannelData(0);
    const duration = this._buffer.duration;
    const centerY = h / 2;
    const amplitude = h * 0.4;

    // Calculate samples per pixel
    const samplesPerPixel = Math.floor(data.length / w);
    if (samplesPerPixel < 1) return;

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    // Draw selection highlight if active
    if (this._selection.start > 0 || this._selection.end > 0) {
      const selStart = (this._selection.start / duration) * w;
      const selEnd = (this._selection.end / duration) * w;
      ctx.fillStyle = 'rgba(0, 212, 170, 0.08)';
      ctx.fillRect(selStart, 0, selEnd - selStart, h);
    }

    // Draw waveform
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let x = 0; x < w; x++) {
      let min = 1.0;
      let max = -1.0;
      const startSample = Math.floor(x * samplesPerPixel);
      const endSample = Math.min(startSample + samplesPerPixel, data.length);

      for (let s = startSample; s < endSample; s++) {
        const val = data[s];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      // Draw vertical line from min to max
      ctx.moveTo(x, centerY + min * amplitude);
      ctx.lineTo(x, centerY + max * amplitude);
    }

    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Draw playback cursor
    if (this._currentTime > 0) {
      const cursorX = (this._currentTime / duration) * w;
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();
    }
  }
}
