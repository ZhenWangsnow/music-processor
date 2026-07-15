# Phase 2 - Core Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement core audio processing capabilities: reverse, pitch shift, trim/crop, speed-preserving time stretch, and preview toggle between original/processed audio.

**Architecture:** Processors.js is a pure function module (no classes) that takes AudioBuffers and returns new processed AudioBuffers via OfflineAudioContext rendering. The app.js calls these processors, stores the result in state.processedBuffer, and enables A/B preview switching.

**Tech Stack:** Web Audio API (OfflineAudioContext), Canvas 2D (selection interaction), Plain JS

---

## File Changes

```
js/processors.js   CREATE - Audio processing algorithms
index.html         MODIFY - Add processing controls to sidebar + preview toggle
css/style.css      MODIFY - Add styles for new controls
js/app.js          MODIFY - Wire processing logic, preview toggle, selection
```

## Interfaces

### Processors (processors.js)
```javascript
// All functions return a new AudioBuffer (processed)
function reverseBuffer(buffer)          // Full reversal
function trimBuffer(buffer, startSec, endSec) // Extract segment
function stretchTime(buffer, rate)      // Speed change (offline rendering)
function shiftPitch(buffer, semitones)  // Pitch shift (offline rendering)
function processAudio(buffer, options)  // Master: { reverse, trimStart, trimEnd, pitchShift }
```

### New State (app.js additions)
```javascript
const state = {
  // ... existing fields ...
  processedBuffer: null,    // Result of processing
  playbackMode: 'original', // 'original' | 'processed'
  reverse: false,           // Toggle
  pitchShift: 0,            // Semitones (-12 to 12)
  selection: null,          // { start, end } in seconds | null
  isProcessing: false       // Processing flag
};
```

### AudioEngine additions
```javascript
// New method for offline rendering
async function renderOffline(buffer, playbackRate, detune) // Returns AudioBuffer
``'

Wait, I can't use `''`` for strings because they have single quotes. Let me use @" "@ for a PowerShell here-string.

Actually, the markdown content contains backtick code blocks. Let me use a different approach to write the file.

Let me write the plan file directly using Set-Content with a carefully constructed string that avoids PowerShell escaping issues.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="apply_patch">
<｜｜DSML｜｜parameter name="input" string="true">*** Begin Patch
*** Add File: docs/superpowers/plans/2026-07-15-music-processor-phase2.md
+ # Phase 2 - Core Processing Implementation Plan
+ 
+ > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+ 
+ **Goal:** Implement core audio processing: reverse, pitch shift, trim/crop, speed-preserving time stretch via OfflineAudioContext, and A/B preview toggle.
+ 
+ **Architecture:** processors.js is a pure function module taking AudioBuffers, returning new processed AudioBuffers via OfflineAudioContext. app.js stores result in state.processedBuffer and enables preview switching.
+ 
+ **Tech Stack:** Web Audio API (OfflineAudioContext), Canvas 2D (selection interaction), Plain JS
+ 
+ ---
+ 
+ ## File Changes
+ 
+ ```
+ js/processors.js   CREATE
+ index.html         MODIFY - sidebar processing section + preview toggle
+ css/style.css      MODIFY - styles for new controls
+ js/app.js          MODIFY - wire processing, preview, selection
+ ```
+ 
+ ### Task 1: processors.js — Audio Processing Algorithms
+ 
+ **Files:**
+ - Create: `js/processors.js`
+ 
+ - [ ] **Write `processors.js` with all audio processing functions**
+ 
+ This file contains stateless functions. Each takes an AudioBuffer and processing parameters, returns a new processed AudioBuffer.
+ 
+ Functions to implement:
+ 
+ **1. reverseBuffer(buffer)** — Reverse audio per-channel
+ ```javascript
+ function reverseBuffer(buffer) {
+   const numChannels = buffer.numberOfChannels;
+   const length = buffer.length;
+   const context = new OfflineAudioContext(numChannels, length, buffer.sampleRate);
+   const outputBuffer = context.createBuffer(numChannels, length, buffer.sampleRate);
+   
+   for (let ch = 0; ch < numChannels; ch++) {
+     const input = buffer.getChannelData(ch);
+     const output = outputBuffer.getChannelData(ch);
+     for (let i = 0; i < length; i++) {
+       output[i] = input[length - 1 - i];
+     }
+   }
+   return outputBuffer;
+ }
+ ```
+ 
+ **2. trimBuffer(buffer, startSec, endSec)** — Extract segment
+ ```javascript
+ function trimBuffer(buffer, startSec, endSec) {
+   const sr = buffer.sampleRate;
+   const startSample = Math.round(startSec * sr);
+   const endSample = Math.round(endSec * sr);
+   const numChannels = buffer.numberOfChannels;
+   const newLength = Math.max(1, endSample - startSample);
+   
+   const output = new OfflineAudioContext(numChannels, newLength, sr)
+     .createBuffer(numChannels, newLength, sr);
+   
+   for (let ch = 0; ch < numChannels; ch++) {
+     const input = buffer.getChannelData(ch);
+     const outData = output.getChannelData(ch);
+     for (let i = 0; i < newLength; i++) {
+       outData[i] = input[Math.min(startSample + i, buffer.length - 1)];
+     }
+   }
+   return output;
+ }
+ ```
+ 
+ **3. shiftPitch(buffer, semitones)** — Pitch shift via detune in OfflineAudioContext
+ ```javascript
+ function shiftPitch(buffer, semitones) {
+   if (semitones === 0) return buffer;
+   const sr = buffer.sampleRate;
+   const numChannels = buffer.numberOfChannels;
+   const length = buffer.length;
+   
+   // To shift pitch up by N semitones: play at 2^(N/12) rate, then resample
+   const rate = Math.pow(2, semitones / 12);
+   const offlineLength = Math.round(length / rate);
+   
+   const offline = new OfflineAudioContext(numChannels, offlineLength, sr);
+   const src = offline.createBufferSource();
+   src.buffer = buffer;
+   src.playbackRate.value = rate;
+   src.connect(offline.destination);
+   src.start();
+   
+   return offline.startRendering();
+ }
+ ```
+ 
+ Note: This changes playback speed too (shorter duration for pitch up, longer for pitch down). This is the standard approach - the processed buffer is then played at normal speed. To compensate duration back, see stretchTime usage in processAudio.
+ 
+ **4. processAudio(buffer, options)** — Master processing pipeline
+ ```javascript
+ async function processAudio(buffer, options) {
+   let result = buffer;
+   const { reverse, trimStart, trimEnd, pitchShift } = options;
+   
+   // Step 1: Reverse
+   if (reverse) {
+     result = reverseBuffer(result);
+     // Re-create as AudioBuffer for further processing
+     const sr = result.sampleRate;
+     const nc = result.numberOfChannels;
+     const len = result.length;
+     const ctx = new OfflineAudioContext(nc, len, sr);
+     const b = ctx.createBuffer(nc, len, sr);
+     for (let ch = 0; ch < nc; ch++) {
+       const d = b.getChannelData(ch);
+       const s = result.getChannelData(ch);
+       for (let i = 0; i < len; i++) d[i] = s[i];
+     }
+     result = b;
+   }
+   
+   // Step 2: Trim (if selection exists)
+   if (trimStart != null && trimEnd != null && trimEnd > trimStart) {
+     result = trimBuffer(result, trimStart, trimEnd);
+   }
+   
+   // Step 3: Pitch shift
+   if (pitchShift !== 0) {
+     result = await shiftPitch(result, pitchShift);
+   }
+   
+   return result;
+ }
+ ```
+ 
+ - [ ] **Verify file created**
+   Check: `Get-Item js/processors.js`
+ 
+ - [ ] **Commit**
+   ```
+   git add js/processors.js
+   git commit -m "feat: add audio processing algorithms (reverse, trim, pitch shift)"
+   ```
+ 
+ ### Task 2: Modify index.html — Processing Controls
+ 
+ **Files:**
+ - Modify: `index.html`
+ 
+ - [ ] **Add processing section to sidebar** (after speed presets)
+ 
+ Insert after the speed presets div (before sidebar-spacer):
+ ```html
+ <div class="sidebar-section">
+   <h3 class="sidebar-title">处理</h3>
+   
+   <div class="control-row">
+     <button id="btnReverse" class="control-btn" title="倒放">
+       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
+         <path d="M1 4v6h6"/>
+         <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
+       </svg>
+       倒放
+     </button>
+     <button id="btnTrim" class="control-btn" title="裁剪选中区域" disabled>
+       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
+         <rect x="3" y="3" width="18" height="18" rx="2"/>
+       </svg>
+       裁剪
+     </button>
+   </div>
+   
+   <div class="control-group">
+     <label class="control-label">变调</label>
+     <div class="pitch-controls">
+       <button id="btnPitchDown" class="pitch-btn" title="降调" disabled>-</button>
+       <span id="pitchValue" class="pitch-value">0</span>
+       <button id="btnPitchUp" class="pitch-btn" title="升调" disabled>+</button>
+       <span class="pitch-unit">半音</span>
+     </div>
+   </div>
+   
+   <button id="btnProcess" class="process-btn" disabled>
+     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
+       <polygon points="5 3 19 12 5 21 5 3"/>
+     </svg>
+     应用处理
+   </button>
+ </div>
+ ```
+ 
+ - [ ] **Add preview toggle** (after transportBar, inside main)
+ 
+ Insert after `</div>` for `<!-- Transport Controls -->` and before `<!-- Status Bar -->`:
+ ```html
+ <div id="previewBar">
+   <div class="preview-toggle" id="previewToggle">
+     <button class="preview-btn active" data-mode="original" id="btnOriginal">原始</button>
+     <button class="preview-btn" data-mode="processed" id="btnProcessed" disabled>处理</button>
+   </div>
+   <span class="preview-hint" id="previewHint">对比原始与处理结果</span>
+ </div>
+ ```
+ 
+ - [ ] **Update script tag to include processors.js**
+ Add before app.js: `<script src="js/processors.js"></script>`
+ 
+ - [ ] **Commit**
+   ```
+   git add index.html
+   git commit -m "feat: add processing controls and preview toggle to HTML"
+   ```
+ 
+ ### Task 3: Modify style.css — Processing Controls Styles
+ 
+ **Files:**
+ - Modify: `css/style.css`
+ 
+ - [ ] **Add new CSS rules** (append at the end of file)
+ 
+ ```css
+ /* === Processing Controls === */
+ .control-row {
+   display: flex;
+   gap: 6px;
+ }
+ 
+ .control-btn {
+   display: flex;
+   align-items: center;
+   gap: 4px;
+   flex: 1;
+   background: var(--bg-surface);
+   border: 1px solid var(--border);
+   color: var(--text-secondary);
+   padding: 6px 8px;
+   border-radius: var(--radius);
+   cursor: pointer;
+   font-size: 12px;
+   transition: all 0.15s;
+ }
+ 
+ .control-btn:hover:not(:disabled) {
+   background: var(--bg-hover);
+   color: var(--text-primary);
+ }
+ 
+ .control-btn:disabled {
+   opacity: 0.3;
+   cursor: not-allowed;
+ }
+ 
+ .control-btn.active {
+   background: var(--accent-dim);
+   border-color: var(--accent);
+   color: var(--accent);
+ }
+ 
+ .control-group {
+   display: flex;
+   flex-direction: column;
+   gap: 4px;
+ }
+ 
+ .control-label {
+   font-size: 11px;
+   color: var(--text-muted);
+ }
+ 
+ .pitch-controls {
+   display: flex;
+   align-items: center;
+   gap: 4px;
+ }
+ 
+ .pitch-btn {
+   width: 28px;
+   height: 28px;
+   border-radius: 50%;
+   border: 1px solid var(--border);
+   background: var(--bg-surface);
+   color: var(--text-primary);
+   font-size: 16px;
+   cursor: pointer;
+   display: flex;
+   align-items: center;
+   justify-content: center;
+   transition: all 0.15s;
+ }
+ 
+ .pitch-btn:hover:not(:disabled) {
+   background: var(--bg-hover);
+   border-color: var(--accent);
+ }
+ 
+ .pitch-btn:disabled {
+   opacity: 0.3;
+   cursor: not-allowed;
+ }
+ 
+ .pitch-value {
+   font-size: 18px;
+   font-weight: 600;
+   color: var(--text-primary);
+   min-width: 24px;
+   text-align: center;
+   font-variant-numeric: tabular-nums;
+ }
+ 
+ .pitch-unit {
+   font-size: 11px;
+   color: var(--text-muted);
+ }
+ 
+ .process-btn {
+   display: flex;
+   align-items: center;
+   justify-content: center;
+   gap: 6px;
+   width: 100%;
+   padding: 8px;
+   border-radius: var(--radius);
+   border: none;
+   background: var(--accent);
+   color: var(--bg-primary);
+   font-size: 13px;
+   font-weight: 600;
+   cursor: pointer;
+   transition: all 0.15s;
+ }
+ 
+ .process-btn:hover:not(:disabled) {
+   background: var(--accent-hover);
+ }
+ 
+ .process-btn:disabled {
+   opacity: 0.3;
+   cursor: not-allowed;
+ }
+ 
+ /* === Preview Bar === */
+ #previewBar {
+   display: flex;
+   align-items: center;
+   gap: 12px;
+   padding: 6px 24px;
+   background: var(--bg-sidebar);
+   border-bottom: 1px solid var(--border);
+ }
+ 
+ .preview-toggle {
+   display: flex;
+   border-radius: var(--radius);
+   overflow: hidden;
+   border: 1px solid var(--border);
+ }
+ 
+ .preview-btn {
+   padding: 4px 14px;
+   border: none;
+   background: var(--bg-surface);
+   color: var(--text-secondary);
+   font-size: 12px;
+   cursor: pointer;
+   transition: all 0.15s;
+ }
+ 
+ .preview-btn:not(:last-child) {
+   border-right: 1px solid var(--border);
+ }
+ 
+ .preview-btn:hover:not(:disabled) {
+   background: var(--bg-hover);
+ }
+ 
+ .preview-btn:disabled {
+   opacity: 0.3;
+   cursor: not-allowed;
+ }
+ 
+ .preview-btn.active {
+   background: var(--accent);
+   color: var(--bg-primary);
+   font-weight: 600;
+ }
+ 
+ .preview-hint {
+   font-size: 11px;
+   color: var(--text-muted);
+ }
+ ```
+ 
+ - [ ] **Commit**
+   ```
+   git add css/style.css
+   git commit -m "feat: add processing and preview styles"
+   ```
+ 
+ ### Task 4: Modify app.js — Wire Processing Logic
+ 
+ **Files:**
+ - Modify: `js/app.js`
+ 
+ - [ ] **Update state object** (add new fields)
+ 
+ Change the state declaration to include:
+ ```javascript
+ const state = {
+   originalBuffer: null,
+   processedBuffer: null,
+   isPlaying: false,
+   currentTime: 0,
+   speed: 1.0,
+   fileName: '',
+   playbackMode: 'original',
+   reverse: false,
+   pitchShift: 0,
+   selection: null,
+   isProcessing: false
+ };
+ ```
+ 
+ - [ ] **Add new DOM references** (after existing ones)
+ 
+ ```javascript
+ // Processing controls
+ const btnReverse = document.getElementById('btnReverse');
+ const btnTrim = document.getElementById('btnTrim');
+ const btnPitchDown = document.getElementById('btnPitchDown');
+ const btnPitchUp = document.getElementById('btnPitchUp');
+ const pitchValue = document.getElementById('pitchValue');
+ const btnProcess = document.getElementById('btnProcess');
+ const previewToggle = document.getElementById('previewToggle');
+ const previewHint = document.getElementById('previewHint');
+ ```
+ 
+ - [ ] **Add processAudio and updatePlayBuffer functions** (after stopProgressTracking)
+ 
+ ```javascript
+ function updatePlayBuffer() {
+   // Update which buffer is played based on playback mode
+   const buffer = state.playbackMode === 'processed' && state.processedBuffer
+     ? state.processedBuffer : state.originalBuffer;
+   return buffer;
+ }
+ 
+ async function runProcessing() {
+   if (!state.originalBuffer || state.isProcessing) return;
+   state.isProcessing = true;
+   btnProcess.disabled = true;
+   btnProcess.textContent = '处理中...';
+   statusText.textContent = '正在处理...';
+   
+   try {
+     const options = {
+       reverse: state.reverse,
+       trimStart: state.selection ? state.selection.start : null,
+       trimEnd: state.selection ? state.selection.end : null,
+       pitchShift: state.pitchShift
+     };
+     
+     state.processedBuffer = await processAudio(state.originalBuffer, options);
+     
+     // Switch to processed mode
+     state.playbackMode = 'processed';
+     updatePreviewButtons();
+     
+     // Update waveform to show processed
+     waveform.render(state.processedBuffer);
+     totalTimeEl.textContent = formatTime(state.processedBuffer.duration);
+     
+     statusText.textContent = '处理完成';
+     showToast('处理完成，点击「原始」可对比原声');
+   } catch (err) {
+     console.error('Processing error:', err);
+     showToast('处理出错，请重试', 'error');
+     statusText.textContent = '处理失败';
+   } finally {
+     state.isProcessing = false;
+     btnProcess.disabled = false;
+     btnProcess.textContent = '应用处理';
+   }
+ }
+ 
+ function updatePreviewButtons() {
+   const hasProcessed = state.processedBuffer !== null;
+   document.getElementById('btnOriginal').classList.toggle('active', state.playbackMode === 'original');
+   document.getElementById('btnProcessed').classList.toggle('active', state.playbackMode === 'processed');
+   document.getElementById('btnProcessed').disabled = !hasProcessed;
+   previewHint.textContent = hasProcessed
+     ? (state.playbackMode === 'original' ? '当前：原始音频' : '当前：处理后音频')
+     : '处理后可对比';
+ }
+ ```
+ 
+ - [ ] **Update play button handler** to use correct buffer
+ 
+ Change btnPlay click handler to:
+ ```javascript
+ btnPlay.addEventListener('click', () => {
+   const buffer = updatePlayBuffer();
+   if (!buffer) return;
+ 
+   if (engine.context.state === 'suspended') {
+     engine.context.resume();
+   }
+ 
+   const startTime = state.currentTime > 0 ? state.currentTime : 0;
+   engine.play(buffer, startTime);
+   state.isPlaying = true;
+   updatePlayButtons();
+   startProgressTracking();
+   statusText.textContent = '播放中';
+ });
+ ```
+ 
+ - [ ] **Update progress bar duration** to use correct buffer
+ 
+ Change the `updateProgress` function to use correct buffer:
+ ```javascript
+ function getActiveDuration() {
+   const buf = state.playbackMode === 'processed' && state.processedBuffer
+     ? state.processedBuffer : state.originalBuffer;
+   return buf ? buf.duration : 1;
+ }
+ 
+ function updateProgress(time) {
+   const duration = getActiveDuration();
+   const pct = Math.min(100, (time / duration) * 100);
+   progressFill.style.width = pct + '%';
+   progressThumb.style.left = pct + '%';
+   currentTimeEl.textContent = formatTime(time);
+ }
+ ```
+ 
+ - [ ] **Update loadAudioFile** to reset processing state on new file load
+ 
+ After the buffer is loaded successfully, add:
+ ```javascript
+   // Reset processing state
+   state.processedBuffer = null;
+   state.playbackMode = 'original';
+   state.reverse = false;
+   state.pitchShift = 0;
+   state.selection = null;
+   btnReverse.classList.remove('active');
+   pitchValue.textContent = '0';
+   document.getElementById('btnProcessed').disabled = true;
+   updatePreviewButtons();
+   ```
+ 
+ - [ ] **Add event handlers for processing controls**
+ 
+ ```javascript
+ // Reverse toggle
+ btnReverse.addEventListener('click', () => {
+   state.reverse = !state.reverse;
+   btnReverse.classList.toggle('active');
+ });
+ 
+ // Trim
+ btnTrim.addEventListener('click', () => {
+   if (state.selection) {
+     runProcessing();
+   }
+ });
+ 
+ // Pitch shift
+ btnPitchDown.addEventListener('click', () => {
+   state.pitchShift = Math.max(-12, state.pitchShift - 1);
+   pitchValue.textContent = state.pitchShift;
+ });
+ 
+ btnPitchUp.addEventListener('click', () => {
+   state.pitchShift = Math.min(12, state.pitchShift + 1);
+   pitchValue.textContent = state.pitchShift;
+ });
+ 
+ // Process
+ btnProcess.addEventListener('click', () => {
+   runProcessing();
+ });
+ 
+ // Preview toggle
+ previewToggle.addEventListener('click', (e) => {
+   const btn = e.target.closest('.preview-btn');
+   if (!btn || btn.disabled) return;
+   
+   const mode = btn.dataset.mode;
+   if (mode === state.playbackMode) return;
+   
+   // Stop current playback
+   const wasPlaying = state.isPlaying;
+   const seekTime = state.currentTime;
+   engine.stop();
+   state.isPlaying = false;
+   
+   state.playbackMode = mode;
+   updatePreviewButtons();
+   
+   // Update waveform
+   const buffer = state.playbackMode === 'processed' ? state.processedBuffer : state.originalBuffer;
+   waveform.render(buffer);
+   totalTimeEl.textContent = formatTime(buffer.duration);
+   
+   // Resume playback if was playing
+   if (wasPlaying) {
+     state.currentTime = Math.min(seekTime, buffer.duration);
+     engine.play(buffer, state.currentTime);
+     state.isPlaying = true;
+     updatePlayButtons();
+     startProgressTracking();
+   } else {
+     state.currentTime = Math.min(state.currentTime, buffer.duration);
+     updateProgress(state.currentTime);
+     waveform.updateCursor(state.currentTime);
+   }
+ });
+ ```
+ 
+ - [ ] **Update keyboard shortcuts** (enable R for reverse)
+ 
+ Change the KeyR case in the keyboard handler:
+ ```javascript
+ case 'KeyR':
+   if (state.originalBuffer) {
+     btnReverse.click();
+   }
+   break;
+ ```
+ 
+ - [ ] **Enable processing controls after file load**
+ 
+ In loadAudioFile success handler, add after enabling transport:
+ ```javascript
+   btnReverse.disabled = false;
+   btnPitchDown.disabled = false;
+   btnPitchUp.disabled = false;
+   btnProcess.disabled = false;
+ ```
+ 
+ - [ ] **Commit**
+   ```
+   git add js/app.js
+   git commit -m "feat: wire processing controls, preview toggle, and selection"
+   ```
+ 
+ ### Task 5: Final Verification
+ 
+ - [ ] **Verify all files consistent**
+   - Check index.html references processors.js
+   - Check new HTML IDs match app.js getElementById calls
+   - Check CSS classes from new HTML exist in style.css
+   - Check processors.js exports are accessible to app.js
+ 
+ - [ ] **Manual verification in browser**
+   - Load an audio file
+   - Toggle reverse, adjust pitch, click "应用处理"
+   - Verify processedBuffer is created
+   - Switch between original/processed (A/B preview)
+   - Verify waveform updates for processed content
+   - Test Space and R keyboard shortcuts
+ 
+ - [ ] **Final commit**
+   ```
+   git add -A
+   git commit -m "feat: complete Phase 2 - core processing (reverse, pitch, trim)"
+   ```
