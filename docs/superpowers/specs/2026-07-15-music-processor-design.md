# Local Audio Music Processor - Design Document

## Overview
A pure frontend local audio processing web application built with HTML5 + CSS3 + JavaScript (ES2022+). All audio processing happens in-browser via Web Audio API. No backend, no data upload.

## Phase 1 Scope
Phase 1 delivers the basic framework: HTML skeleton, CSS styling (dark theme, sidebar layout), audio file loading, basic playback, and waveform visualization.

### Deliverables
1. **HTML skeleton** - index.html with sidebar layout (Option B from brainstorming)
2. **Dark theme CSS** - Professional DAW-style dark theme, responsive layout
3. **Audio file loading** - Drag-and-drop + file picker; supports MP3, WAV, OGG, FLAC, M4A
4. **Basic playback** - Play/Pause/Stop via AudioContext
5. **Waveform rendering** - Canvas 2D drawing of PCM data, playback position indicator

### Architecture (3-layer)
- **UI Layer** - HTML + CSS (no framework), event-driven
- **Audio Engine Layer** - AudioEngine class wrapping AudioContext, manages playback state
- **Data Layer** - Core state object with originalBuffer, playbackMode, etc.

## Layout (Option B - Sidebar/DAW Style)
```
┌─────────┬──────────────────────────────────┐
│ Sidebar │      Waveform + Timeline          │
│ (240px) │      (Main Canvas Area)           │
│         │                                   │
│  File   │                                   │
│  Load   │                                   │
│         │                                   │
│ Speed   ├──────────────────────────────────┤
│ ──────  │      Transport Controls           │
│         │   ◀◀  ▶  ⏹  Reverse  Pitch      │
│ Effects │          Progress Bar             │
│  Chain  │                                   │
│         ├──────────────────────────────────┤
│ Status  │      Status Bar                   │
└─────────┴──────────────────────────────────┘
```

## File Structure
```
C:\Users\wxy\Documents\music\
├── index.html              # Entry point
├── css/
│   └── style.css           # All styles (dark theme, DAW layout)
├── js/
│   ├── app.js              # Main app logic, state management, event binding
│   ├── audio-engine.js     # AudioEngine class (AudioContext, play/pause/stop)
│   ├── processors.js       # (Phase 2 - audio algorithms)
│   ├── waveform.js         # WaveformRenderer class (Canvas 2D)
│   └── export.js           # (Phase 4 - WAV export)
├── PROJECT.md              # Project specification
└── README.md               # User guide
```

## Core State (Phase 1)
```javascript
const state = {
  originalBuffer: null,      // Original AudioBuffer
  isPlaying: false,          // Playback state
  currentTime: 0,            // Current playback position
  speed: 1.0,                // Playback rate (0.25-4.0)
  reverse: false,            // Reverse flag (Phase 2)
};
```

## Component Details

### AudioEngine
- Singleton AudioContext (created on first user gesture)
- Methods: loadFile(file), play(), pause(), stop(), setSpeed(rate)
- loadFile() returns decoded AudioBuffer via decodeAudioData()
- play() connects buffer → gainNode → destination via AudioBufferSourceNode
- Supports source node reuse (create new source on each play)

### WaveformRenderer
- Canvas-based waveform drawing
- Takes AudioBuffer, renders downsampled PCM data
- Playback position indicator line
- Methods: render(buffer), updateCursor(position), setSelection(start, end) (Phase 2)

### App
- Event binding for all UI controls
- File drag-drop handlers (dragenter/dragover/drop)
- State management
- LoadWaveforms on file change
- Coordinate: AudioEngine ↔ WaveformRenderer ↔ DOM

## Implementation Order (within Phase 1)
1. Create `index.html` with full sidebar layout structure
2. Create `css/style.css` with dark theme, responsive DAW layout
3. Create `js/audio-engine.js` - AudioEngine class
4. Create `js/waveform.js` - WaveformRenderer class
5. Create `js/app.js` - Main application logic
6. Wire everything together and test

## Error Handling (Phase 1)
- Unsupported file format → show error toast
- AudioContext creation failure → fallback message
- Large file (>100MB) → warning before loading
- Empty state → placeholder in waveform area

## Acceptance Criteria (Phase 1)
- File loads via drag-drop and file picker
- File metadata (name, duration, sample rate) displayed
- Waveform renders correctly after file load
- Play/Pause/Stop work correctly
- Progress bar updates during playback
- Layout renders correctly at 1280x720+
- No network requests (verified via DevTools)

