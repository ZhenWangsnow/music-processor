(function() {
  'use strict';

  // === State ===
  const state = {
    originalBuffer: null,
    processedBuffer: null,
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    fileName: '',
    playbackMode: 'original',
    reverse: false,
    pitchShift: 0,
    selection: null,
    isProcessing: false,
    loop: false
  };

  // === Initialize ===
  const engine = new AudioEngine();
  const canvas = document.getElementById('waveformCanvas');
  const waveform = new WaveformRenderer(canvas);

  let animationFrame = null;
  let progressInterval = null;
  let isDraggingSelection = false;

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

  // Processing controls
  const btnReverse = document.getElementById('btnReverse');
  const btnTrim = document.getElementById('btnTrim');
  const btnPitchDown = document.getElementById('btnPitchDown');
  const btnPitchUp = document.getElementById('btnPitchUp');
  const pitchValue = document.getElementById('pitchValue');
  const btnProcess = document.getElementById('btnProcess');
  const btnLoop = document.getElementById('btnLoop');
  const btnExport = document.getElementById('btnExport');
  const previewToggle = document.getElementById('previewToggle');
  const previewHint = document.getElementById('previewHint');

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
    const duration = getActiveDuration();
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
          if (state.loop && state.originalBuffer) {
            state.currentTime = 0;
            const buffer = updatePlayBuffer();
            engine.play(buffer, 0);
          } else {
            stopProgressTracking();
            state.isPlaying = false;
            updatePlayButtons();
            statusText.textContent = '播放完成';
          }
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

  function getActiveDuration() {
    const buf = state.playbackMode === 'processed' && state.processedBuffer
      ? state.processedBuffer : state.originalBuffer;
    return buf ? buf.duration : 1;
  }

  function updatePlayBuffer() {
    return state.playbackMode === 'processed' && state.processedBuffer
      ? state.processedBuffer : state.originalBuffer;
  }

  async function runProcessing() {
    if (!state.originalBuffer || state.isProcessing) return;
    state.isProcessing = true;
    btnProcess.disabled = true;
    btnProcess.textContent = '处理中...';
    statusText.textContent = '正在处理...';
    
    try {
      const options = {
        reverse: state.reverse,
        trimStart: state.selection ? state.selection.start : null,
        trimEnd: state.selection ? state.selection.end : null,
        pitchShift: state.pitchShift
      };
      
      state.processedBuffer = await processAudio(state.originalBuffer, options);
      
      state.currentTime = 0;
      engine.stop();
      state.playbackMode = 'processed';
      updatePreviewButtons();
      waveform.render(state.processedBuffer);
      totalTimeEl.textContent = formatTime(state.processedBuffer.duration);
      
      statusText.textContent = '处理完成';
      showToast('处理完成，点击原始可对比原声');
    } catch (err) {
      console.error('Processing error:', err);
      showToast('处理出错，请重试', 'error');
      statusText.textContent = '处理失败';
    } finally {
      state.isProcessing = false;
      btnProcess.disabled = false;
      btnProcess.textContent = '应用处理';
    }
  }

  function updatePreviewButtons() {
    const hasProcessed = state.processedBuffer !== null;
    document.getElementById('btnOriginal').classList.toggle('active', state.playbackMode === 'original');
    document.getElementById('btnProcessed').classList.toggle('active', state.playbackMode === 'processed');
    document.getElementById('btnProcessed').disabled = !hasProcessed;
    previewHint.textContent = hasProcessed
      ? (state.playbackMode === 'original' ? '当前：原始音频' : '当前：处理后音频')
      : '处理后可对比';
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

      // Enable processing controls
      state.processedBuffer = null;
      state.playbackMode = 'original';
      state.reverse = false;
      state.pitchShift = 0;
      state.selection = null;
      waveform.setSelection(0, 0);
      btnTrim.disabled = true;
      btnReverse.classList.remove('active');
      pitchValue.textContent = '0';
      btnReverse.disabled = false;
      btnPitchDown.disabled = false;
      btnPitchUp.disabled = false;
      btnProcess.disabled = false;
      btnExport.disabled = false;
      updatePreviewButtons();
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
    const buffer = updatePlayBuffer();
    if (!buffer) return;

    if (engine.context.state === 'suspended') {
      engine.context.resume();
    }

    const startTime = Math.min(state.currentTime > 0 ? state.currentTime : 0, buffer.duration);
    engine.play(buffer, startTime);
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

  // Reverse toggle
  btnReverse.addEventListener('click', () => {
    state.reverse = !state.reverse;
    btnReverse.classList.toggle('active');
 });

  // Trim button
  btnTrim.addEventListener('click', () => {
    if (state.selection) {
      showToast('裁剪已加入处理管线，点击「应用处理」执行');
    }
  });

  // Loop toggle
  btnLoop.addEventListener('click', () => {
    state.loop = !state.loop;
    btnLoop.classList.toggle('active');
    statusText.textContent = state.loop ? '循环播放已开启' : '循环播放已关闭';
  });
 
  // Export button
  btnExport.addEventListener('click', () => {
    const buffer = state.playbackMode === 'processed' && state.processedBuffer
      ? state.processedBuffer : state.originalBuffer;
    if (!buffer) return;
    const baseName = state.fileName.replace(/\.[^.]+$/, '');
    const mode = state.playbackMode === 'processed' ? 'processed' : 'original';
    const filename = exportAudio(buffer, `${baseName}_${mode}`);
    statusText.textContent = `已导出: ${filename}`;
    showToast(`已导出 ${filename}`);
  });

  // Pitch shift
  btnPitchDown.addEventListener('click', () => {
    state.pitchShift = Math.max(-12, state.pitchShift - 1);
    pitchValue.textContent = state.pitchShift;
  });

  btnPitchUp.addEventListener('click', () => {
    state.pitchShift = Math.min(12, state.pitchShift + 1);
    pitchValue.textContent = state.pitchShift;
  });

  // Process button
  btnProcess.addEventListener('click', () => {
    runProcessing();
  });

  // Preview toggle
  previewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.preview-btn');
    if (!btn || btn.disabled) return;
    
    const mode = btn.dataset.mode;
    if (mode === state.playbackMode) return;
    
    const wasPlaying = state.isPlaying;
    const seekTime = state.currentTime;
    engine.stop();
    state.isPlaying = false;
    
    state.playbackMode = mode;
    updatePreviewButtons();
    
    const buffer = state.playbackMode === 'processed' ? state.processedBuffer : state.originalBuffer;
    waveform.render(buffer);
    totalTimeEl.textContent = formatTime(buffer.duration);
    
    if (wasPlaying) {
      state.currentTime = Math.min(seekTime, buffer.duration);
      engine.play(buffer, state.currentTime);
      state.isPlaying = true;
      updatePlayButtons();
      startProgressTracking();
    } else {
      state.currentTime = Math.min(state.currentTime, buffer.duration);
      updateProgress(state.currentTime);
      waveform.updateCursor(state.currentTime);
    }
 });

  // Waveform click-to-seek
  canvas.addEventListener('click', (e) => {
    if (!state.originalBuffer || isDraggingSelection) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const buffer = state.playbackMode === 'processed' && state.processedBuffer ? state.processedBuffer : state.originalBuffer;
    const time = (x / rect.width) * buffer.duration;
    state.currentTime = time;
    engine.seek(time);
    updateProgress(time);
    waveform.updateCursor(time);
  });

  // Waveform selection drag
  let selectionDragStart = null;

  canvas.addEventListener('mousedown', (e) => {
    if (!state.originalBuffer || e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const buffer = state.playbackMode === 'processed' && state.processedBuffer ? state.processedBuffer : state.originalBuffer;
    selectionDragStart = (x / rect.width) * buffer.duration;
    isDraggingSelection = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDraggingSelection || selectionDragStart === null) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const buffer = state.playbackMode === 'processed' && state.processedBuffer ? state.processedBuffer : state.originalBuffer;
    const currentPos = (x / rect.width) * buffer.duration;
    const start = Math.min(selectionDragStart, currentPos);
    const end = Math.max(selectionDragStart, currentPos);
    canvas.style.cursor = 'col-resize';
    waveform.setSelection(start, end);
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDraggingSelection) return;
    isDraggingSelection = false;
    canvas.style.cursor = '';

    if (selectionDragStart !== null) {
      const rect = canvas.getBoundingClientRect();
      if (rect) {
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const buffer = state.playbackMode === 'processed' && state.processedBuffer ? state.processedBuffer : state.originalBuffer;
        const currentPos = (x / rect.width) * buffer.duration;
        const start = Math.min(selectionDragStart, currentPos);
        const end = Math.max(selectionDragStart, currentPos);
        const minSel = 0.1;

        if (end - start >= minSel) {
          state.selection = { start, end };
          btnTrim.disabled = false;
          statusText.textContent = `已选择 ${formatTime(end - start)} 片段`;
          showToast(`已选择 ${formatTime(end - start)}，点击「裁剪」可裁剪选区`);
        } else {
          state.selection = null;
          waveform.setSelection(0, 0);
          btnTrim.disabled = true;
        }
      }
      selectionDragStart = null;
    }
  });

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
        if (state.originalBuffer) {
          btnReverse.click();
        }
        break;
      case 'KeyS':
        if (state.originalBuffer) {
          btnStop.click();
        }
        break;
      case 'Equal':
      case 'NumpadAdd':
        if (state.originalBuffer) {
          btnPitchUp.click();
        }
        break;
      case 'Minus':
      case 'NumpadSubtract':
        if (state.originalBuffer) {
          btnPitchDown.click();
        }
        break;
      case 'ArrowLeft':
        if (state.originalBuffer) {
          const seekLeft = Math.max(0, state.currentTime - 5);
          state.currentTime = seekLeft;
          engine.seek(seekLeft);
          updateProgress(seekLeft);
          waveform.updateCursor(seekLeft);
        }
        break;
      case 'ArrowRight':
        if (state.originalBuffer) {
          const seekRight = Math.min(getActiveDuration(), state.currentTime + 5);
          state.currentTime = seekRight;
          engine.seek(seekRight);
          updateProgress(seekRight);
          waveform.updateCursor(seekRight);
        }
        break;
      case 'Digit0': case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
      case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8':
        if (state.originalBuffer) {
          const digits = ['0','1','2','3','4','5','6','7','8'];
          const speeds = [1,0.25,0.5,0.75,1,1.25,1.5,2,4];
          const idx = digits.indexOf(e.code.replace('Digit',''));
          const targetSpeed = speeds[idx];
          if (targetSpeed) {
            const btns = speedPresets.querySelectorAll('.speed-btn');
            btns.forEach(b => {
              b.classList.toggle('active', Math.abs(parseFloat(b.dataset.speed) - targetSpeed) < 0.01);
            });
            state.speed = targetSpeed;
            engine.setSpeed(targetSpeed);
          }
        }
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
  btnExport.disabled = true;
  updatePlayButtons();
})();
