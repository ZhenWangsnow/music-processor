function reverseBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sr = buffer.sampleRate;
  const offline = new OfflineAudioContext(numChannels, length, sr);
  const output = offline.createBuffer(numChannels, length, sr);
  for (let ch = 0; ch < numChannels; ch++) {
    const input = buffer.getChannelData(ch);
    const outData = output.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      outData[i] = input[length - 1 - i];
    }
  }
  return output;
}

function trimBuffer(buffer, startSec, endSec) {
  const sr = buffer.sampleRate;
  const startSample = Math.round(Math.max(0, startSec) * sr);
  const endSample = Math.round(Math.min(endSec, buffer.duration) * sr);
  const numChannels = buffer.numberOfChannels;
  const newLength = Math.max(1, endSample - startSample);
  const output = new OfflineAudioContext(numChannels, newLength, sr).createBuffer(numChannels, newLength, sr);
  for (let ch = 0; ch < numChannels; ch++) {
    const input = buffer.getChannelData(ch);
    const outData = output.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      outData[i] = input[Math.min(startSample + i, buffer.length - 1)];
    }
  }
  return output;
}

function shiftPitch(buffer, semitones) {
  if (semitones === 0) return Promise.resolve(buffer);
  const sr = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const rate = Math.pow(2, semitones / 12);
  const offlineLength = Math.round(length / rate);
  const offline = new OfflineAudioContext(numChannels, offlineLength, sr);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(offline.destination);
  src.start();
  return offline.startRendering();
}

async function processAudio(buffer, options) {
  let result = buffer;
  const { reverse, trimStart, trimEnd, pitchShift } = options;

  // Step 1: Reverse
  if (reverse) {
    result = reverseBuffer(result);
    // Copy to a real AudioBuffer since reverseBuffer creates one via OfflineAudioContext
    const sr = result.sampleRate;
    const nc = result.numberOfChannels;
    const len = result.length;
    const temp = new OfflineAudioContext(nc, len, sr).createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const d = temp.getChannelData(ch);
      const s = result.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = s[i];
    }
    result = temp;
  }

  // Step 2: Trim
  if (trimStart != null && trimEnd != null && trimEnd > trimStart) {
    result = trimBuffer(result, trimStart, trimEnd);
  }

  // Step 3: Pitch shift
  if (pitchShift !== 0) {
    result = await shiftPitch(result, pitchShift);
  }

  return result;
}
