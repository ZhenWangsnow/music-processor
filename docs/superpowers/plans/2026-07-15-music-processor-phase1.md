# Phase 1 - Basic Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the basic framework of the local music processor: HTML skeleton (sidebar layout), dark theme CSS, audio file loading, basic playback, and waveform visualization.

**Architecture:** 3-layer architecture: UI (HTML+CSS) → Audio Engine (Web Audio API wrapper) → Data (core state object). All files are plain JavaScript modules (ES2022+), no build step. The app is a single-page application loaded from `index.html`.

**Tech Stack:** HTML5 + CSS3 (no framework), Vanilla JS (ES2022+), Web Audio API, Canvas 2D

---

## File Structure

```
/
├── index.html                # CREATE - Entry point
├── css/
│   └── style.css             # CREATE - All styles
├── js/
│   ├── app.js                # CREATE - Main app logic
│   ├── audio-engine.js       # CREATE - Audio playback
│   └── waveform.js           # CREATE - Waveform canvas
├── docs/
│   └── superpowers/
│       ├── specs/            # Design documents
│       └── plans/            # Implementation plans
├── .gitignore                # Already created
└── PROJECT.md                # Already exists (outside workspace)
```

## Interfaces

### AudioEngine
```javascript
class AudioEngine {
  constructor()
  async loadFile(file)          // Returns AudioBuffer
  play(buffer, startTime=0)    // Starts playback
  pause()                       // Pauses, returns currentTime
  stop()                        // Stops, resets to 0
  setSpeed(rate)                // 0.25 - 4.0
  seek(time)                    // Jump to position (seconds)
  get currentTime()             // Current playback position
  get isPlaying()               // Boolean
  get sampleRate()             // From loaded buffer
  get duration()               // From loaded buffer
}
```

### WaveformRenderer
```javascript
class WaveformRenderer {
  constructor(canvas)
  render(buffer)                // Full waveform from AudioBuffer
  updateCursor(time)            // Move playback cursor
  clear()                       // Clear canvas
  get selection()               // { start, end } in seconds (Phase 2)
}
```

### App State
```javascript
const state = {
  originalBuffer: null,       // AudioBuffer | null
  isPlaying: false,
  currentTime: 0,
  speed: 1.0,
  fileName: '',
  audioContext: null          // Created on first gesture
}
```

---

### Task 1: index.html — Entry Page (Sidebar Layout B)

**Files:**
- Create: `index.html`

- [ ] **Write `index.html` with sidebar layout**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>本地音乐处理</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <!-- Sidebar -->
    <aside id="sidebar">
      <div class="sidebar-section">
        <h3 class="sidebar-title">文件</h3>
        <div id="dropZone" class="drop-zone">
          <div class="drop-zone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p class="drop-zone-text">拖拽音频文件到此处</p>
          <p class="drop-zone-hint">或点击选择文件</p>
          <input type="file" id="fileInput" accept="audio/*" hidden>
        </div>
      </div>

      <div id="fileInfo" class="sidebar-section hidden">
        <h3 class="sidebar-title">文件信息</h3>
        <div class="file-info-grid">
          <span class="info-label">文件名</span>
          <span class="info-value" id="fileName">—</span>
          <span class="info-label">时长</span>
          <span class="info-value" id="fileDuration">—</span>
          <span class="info-label">采样率</span>
          <span class="info-value" id="fileSampleRate">—</span>
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-title">倍速</h3>
        <div class="speed-presets" id="speedPresets">
          <button class="speed-btn" data-speed="0.25">0.25×</button>
          <button class="speed-btn" data-speed="0.5">0.5×</button>
          <button class="speed-btn active" data-speed="1.0">1×</button>
          <button class="speed-btn" data-speed="1.25">1.25×</button>
          <button class="speed-btn" data-speed="1.5">1.5×</button>
          <button class="speed-btn" data-speed="2.0">2×</button>
          <button class="speed-btn" data-speed="4.0">4×</button>
        </div>
      </div>

      <div class="sidebar-spacer"></div>

      <div class="sidebar-section">
        <p class="sidebar-footer">本地音乐处理 v1.0</p>
      </div>
    </aside>

    <!-- Main Content -->
    <main id="main">
      <!-- Waveform Area -->
      <div id="waveformContainer">
        <canvas id="waveformCanvas"></canvas>
        <div id="waveformPlaceholder" class="placeholder-text">
          <p>加载音频文件后显示波形</p>
        </div>
      </div>

      <!-- Transport Controls -->
      <div id="transportBar">
        <div class="transport-buttons">
          <button id="btnPlay" class="transport-btn" title="播放 (Space)" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button id="btnPause" class="transport-btn" title="暂停" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <button id="btnStop" class="transport-btn" title="停止" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>
          </button>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div id="progressFill" class="progress-fill"></div>
            <div id="progressThumb" class="progress-thumb"></div>
          </div>
          <div class="time-display">
            <span id="currentTime">0:00</span> / <span id="totalTime">0:00</span>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div id="statusBar">
        <span id="statusText">就绪</span>
      </div>
    </main>
  </div>

  <script src="js/audio-engine.js"></script>
  <script src="js/waveform.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Commit**

```bash
git add index.html
git commit -m "feat: add index.html with sidebar layout (option B)"
```

---

### Task 2: style.css — Dark Theme DAW-Style CSS

**Files:**
- Create: `css/style.css`

- [ ] **Write `css/style.css` with dark theme and sidebar layout**

```css
/* === Reset & Base === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-sidebar: #0f0f23;
  --bg-surface: #1e1e3a;
  --bg-hover: #2a2a4a;
  --text-primary: #e0e0e0;
  --text-secondary: #8888aa;
  --text-muted: #555577;
  --accent: #00d4aa;
  --accent-hover: #00e6bb;
  --accent-dim: rgba(0, 212, 170, 0.15);
  --danger: #ff4757;
  --border: #2a2a4a;
  --radius: 6px;
  --sidebar-width: 240px;
  --transport-height: 60px;
  --status-height: 28px;
  font-size: 14px;
}

html, body {
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* === Layout === */
#app {
  display: flex;
  height: 100vh;
}

/* === Sidebar === */
#sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow-y: auto;
  z-index: 10;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-footer {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

/* === Drop Zone === */
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.drop-zone-icon {
  color: var(--text-muted);
  margin-bottom: 8px;
}

.drop-zone-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.drop-zone-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* === File Info === */
.hidden { display: none !important; }

.file-info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 12px;
}

.info-label {
  color: var(--text-muted);
}

.info-value {
  color: var(--text-primary);
  word-break: break-all;
}

/* === Speed Presets === */
.speed-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.speed-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px 0;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.speed-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.speed-btn.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
  font-weight: 600;
}

/* === Main Content === */
#main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* === Waveform Area === */
#waveformContainer {
  flex: 1;
  position: relative;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

#waveformCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

.placeholder-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 15px;
  pointer-events: none;
}

/* === Transport Bar === */
#transportBar {
  height: var(--transport-height);
  min-height: var(--transport-height);
  background: var(--bg-sidebar);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}

.transport-buttons {
  display: flex;
  gap: 8px;
}

.transport-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-hover);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}

.transport-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg-primary);
}

.transport-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  left: 0%;
  opacity: 0;
  transition: opacity 0.15s;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

.time-display {
  font-size: 13px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 90px;
}

/* === Status Bar === */
#statusBar {
  height: var(--status-height);
  min-height: var(--status-height);
  background: var(--bg-sidebar);
  display: flex;
  align-items: center;
  padding: 0 16px;
}

#statusText {
  font-size: 12px;
  color: var(--text-muted);
}

/* === Toast === */
.toast {
  position: fixed;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 10px 20px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  z-index: 100;
  animation: toastIn 0.3s ease;
  max-width: 400px;
  text-align: center;
  font-size: 13px;
}

.toast.error {
  border-color: var(--danger);
  color: var(--danger);
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

- [ ] **Commit**

```bash
git add css/style.css
git commit -m "feat: add dark theme DAW-style CSS"
```

---

### Task 3: audio-engine.js — Audio Engine Class

**Files:**
- Create: `js/audio-engine.js`

- [ ] **Write `js/audio-engine.js`**

```javascript
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
```

- [ ] **Commit**

```bash
git add js/audio-engine.js
git commit -m "feat: add AudioEngine class for playback control"
```

---

### Task 4: waveform.js — Waveform Renderer

**Files:**
- Create: `js/waveform.js`

- [ ] **Write `js/waveform.js`**

```javascript
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
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
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

    let maxPeak = 0;
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

      const avgMin = Math.abs(min);
      const avgMax = Math.abs(max);
      maxPeak = Math.max(maxPeak, avgMin, avgMax);

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
```

- [ ] **Commit**

```bash
git add js/waveform.js
git commit -m "feat: add WaveformRenderer with Canvas 2D waveform visualization"
```

---

### Task 5: app.js — Main Application Logic

**Files:**
- Create: `js/app.js`

- [ ] **Write `js/app.js`**

```javascript
(function() {
  'use strict';

  // === State ===
  const state = {
    originalBuffer: null,
    processedBuffer: null,
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    fileName: ''
  };

  // === Initialize ===
  const engine = new AudioEngine();
  const canvas = document.getElementById('waveformCanvas');
  const waveform = new WaveformRenderer(canvas);

  let animationFrame = null;
  let progressInterval = null;

  // === DOM References ===
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileNameEl = document.getElementById('fileName');
  const fileDurationEl = document.getElementById('fileDuration');
  const fileSampleRateEl = document.getElementById('fileSampleRate');
  const btnPlay = document.getElementById('btnPlay');
  const btnPause = document.getElementById('btnPause');
  const btnStop = document.getElementById('btnStop');
  const speedPresets = document.getElementById('speedPresets');
  const progressFill = document.getElementById('progressFill');
  const progressThumb = document.getElementById('progressThumb');
  const progressBar = document.querySelector('.progress-bar');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('totalTime');
  const statusText = document.getElementById('statusText');
  const waveformContainer = document.getElementById('waveformContainer');
  const waveformPlaceholder = document.getElementById('waveformPlaceholder');

  // === Helper Functions ===
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function updateFileInfo(buffer, name) {
    fileNameEl.textContent = name;
    fileDurationEl.textContent = formatTime(buffer.duration);
    fileSampleRateEl.textContent = `${buffer.sampleRate} Hz`;
    fileInfo.classList.remove('hidden');
  }

  function updatePlayButtons() {
    if (!state.originalBuffer) return;
    btnPlay.disabled = state.isPlaying;
    btnPause.disabled = !state.isPlaying;
    btnStop.disabled = !state.isPlaying && state.currentTime === 0;
  }

  function updateProgress(time) {
    const duration = state.originalBuffer ? state.originalBuffer.duration : 1;
    const pct = Math.min(100, (time / duration) * 100);
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
    currentTimeEl.textContent = formatTime(time);
  }

  function startProgressTracking() {
    stopProgressTracking();
    progressInterval = setInterval(() => {
      if (engine.isPlaying) {
        const ct = engine.currentTime;
        updateProgress(ct);
        waveform.updateCursor(ct);
        state.currentTime = ct;

        if (ct >= engine.duration) {
          stopProgressTracking();
          state.isPlaying = false;
          updatePlayButtons();
          statusText.textContent = '播放完成';
        }
      }
    }, 50);
  }

  function stopProgressTracking() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function loadAudioFile(file) {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg',
                        'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/x-m4a',
                        'audio/aac'];
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      showToast(`不支持的文件格式: ${ext || '未知'}。支持 MP3, WAV, OGG, FLAC, M4A`, 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('文件超过 100MB，处理大文件可能会导致性能问题', 'error');
      return;
    }

    statusText.textContent = '正在加载...';
    waveformPlaceholder.classList.add('hidden');

    engine.loadFile(file).then(buffer => {
      state.originalBuffer = buffer;
      state.fileName = file.name;
      state.currentTime = 0;
      state.isPlaying = false;

      waveform.render(buffer);
      updateFileInfo(buffer, file.name);
      updateProgress(0);
      updatePlayButtons();
      totalTimeEl.textContent = formatTime(buffer.duration);

      btnPlay.disabled = false;
      statusText.textContent = `已加载: ${file.name}`;

      // Enable transport controls
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnStop.disabled = true;
    }).catch(err => {
      console.error('Load error:', err);
      showToast('无法解码音频文件，请确认文件格式正确', 'error');
      waveformPlaceholder.classList.remove('hidden');
      statusText.textContent = '加载失败';
    });
  }

  // === Event Handlers ===
  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadAudioFile(file);
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadAudioFile(file);
  });

  // Playback controls
  btnPlay.addEventListener('click', () => {
    if (!state.originalBuffer) return;

    // Ensure AudioContext is created on user gesture
    if (engine.context.state === 'suspended') {
      engine.context.resume();
    }

    const startTime = state.currentTime > 0 ? state.currentTime : 0;
    engine.play(state.originalBuffer, startTime);
    state.isPlaying = true;
    updatePlayButtons();
    startProgressTracking();
    statusText.textContent = '播放中';
  });

  btnPause.addEventListener('click', () => {
    engine.pause();
    state.isPlaying = false;
    state.currentTime = engine.currentTime;
    updatePlayButtons();
    stopProgressTracking();
    updateProgress(state.currentTime);
    waveform.updateCursor(state.currentTime);
    statusText.textContent = '已暂停';
  });

  btnStop.addEventListener('click', () => {
    engine.stop();
    state.isPlaying = false;
    state.currentTime = 0;
    updatePlayButtons();
    stopProgressTracking();
    updateProgress(0);
    waveform.updateCursor(0);
    statusText.textContent = '已停止';
  });

  // Speed presets
  speedPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.speed-btn');
    if (!btn) return;

    speedPresets.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const speed = parseFloat(btn.dataset.speed);
    state.speed = speed;
    engine.setSpeed(speed);
  });

  // Progress bar seek
  progressBar.addEventListener('click', (e) => {
    if (!state.originalBuffer) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * engine.duration;
    state.currentTime = time;
    engine.seek(time);
    updateProgress(time);
    waveform.updateCursor(time);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (state.isPlaying) {
          btnPause.click();
        } else {
          btnPlay.click();
        }
        break;
      case 'KeyR':
        // Reverse toggle (Phase 2)
        break;
    }
  });

  // Handle AudioContext auto-stop
  engine.onStop(() => {
    state.isPlaying = false;
    state.currentTime = engine.duration;
    stopProgressTracking();
    updateProgress(state.currentTime);
    waveform.updateCursor(state.currentTime);
    updatePlayButtons();
    statusText.textContent = '播放完成';
  });

  // === Init ===
  updatePlayButtons();
})();
```

- [ ] **Commit**

```bash
git add js/app.js
git commit -m "feat: add main app logic with file loading, playback, waveform"
```

---

### Task 6: Wire Everything & Final Verification

**Files:**
- No new files. Verify all files exist and are internally consistent.

- [ ] **Verify all files exist and check for consistency**

```bash
# Verify file structure
ls -la index.html css/style.css js/audio-engine.js js/waveform.js js/app.js

# Check that index.html references all scripts correctly
grep -n "src=" index.html

# Verify CSS classes used in HTML are defined in style.css
grep -c "speed-btn\|drop-zone\|transport-btn\|progress-bar" css/style.css

# Verify JS class/function names are consistent
grep -c "class AudioEngine" js/audio-engine.js
grep -c "class WaveformRenderer" js/waveform.js
```

- [ ] **Open in browser for visual verification** (manual step)

Open `index.html` in Chrome/Edge. Verify:
- Layout renders correctly (sidebar on left, waveform area on right, transport at bottom)
- Drop zone is visible and clickable
- Clicking drop zone opens file picker
- After loading an audio file: waveform renders, file info shows, transport buttons enable
- Play/Pause/Stop work
- Speed presets highlight and affect playback
- Progress bar updates during playback
- Clicking on progress bar seeks
- Space key toggles play/pause

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 - basic framework"
```
