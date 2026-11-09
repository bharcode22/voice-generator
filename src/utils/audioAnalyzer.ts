import { AudioMetrics } from '../types';

/**
 * Autocorrelation algorithm for pitch detection (fundamental frequency F0)
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number
): number {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // If signal is too quiet, no valid pitch
  if (rms < 0.01) {
    return 0;
  }

  // Trim silence from start and end
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const c = new Float32Array(trimmed.length).fill(0);

  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) {
    d++;
  }

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  if (maxpos <= 0) return 0;

  let T0 = maxpos;
  // Parabolic interpolation for fine frequency resolution
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) {
    T0 = T0 - b / (2 * a);
  }

  const pitch = sampleRate / T0;
  // Only accept standard human vocal range (60Hz to 600Hz)
  if (pitch >= 60 && pitch <= 600) {
    return Math.round(pitch);
  }
  return 0;
}

/**
 * Extracts acoustic metrics from an AudioBuffer
 */
export async function analyzeAudioBuffer(
  audioBuffer: AudioBuffer,
  fileSizeBytes?: number
): Promise<AudioMetrics> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const length = channelData.length;

  let totalRms = 0;
  let zcrCount = 0;
  const detectedPitches: number[] = [];

  // Analyze chunks of 2048 samples
  const chunkSize = 2048;
  const totalChunks = Math.floor(length / chunkSize);

  for (let c = 0; c < totalChunks; c++) {
    const chunk = channelData.slice(c * chunkSize, (c + 1) * chunkSize);
    let chunkSum = 0;

    for (let i = 0; i < chunk.length; i++) {
      chunkSum += chunk[i] * chunk[i];
      if (i > 0 && Math.sign(chunk[i]) !== Math.sign(chunk[i - 1])) {
        zcrCount++;
      }
    }
    const chunkRms = Math.sqrt(chunkSum / chunk.length);
    totalRms += chunkRms;

    if (chunkRms > 0.02) {
      const p = detectPitchAutocorrelation(chunk, sampleRate);
      if (p > 60 && p < 500) {
        detectedPitches.push(p);
      }
    }
  }

  // Median pitch
  detectedPitches.sort((a, b) => a - b);
  const dominantPitchHz =
    detectedPitches.length > 0
      ? detectedPitches[Math.floor(detectedPitches.length / 2)]
      : 130;

  const avgRms = totalChunks > 0 ? totalRms / totalChunks : 0.05;
  const zcrRate = length > 0 ? zcrCount / length : 0;

  return {
    durationSeconds: Math.round(audioBuffer.duration * 10) / 10,
    rmsVolume: Math.round(avgRms * 100) / 100,
    dominantPitchHz,
    spectralCentroidHz: Math.round(dominantPitchHz * 1.8),
    zeroCrossingRate: Math.round(zcrRate * 1000) / 1000,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    fileSizeBytes,
  };
}

export function classifyVoiceRange(pitchHz: number): string {
  if (pitchHz < 95) return 'Bass (Suara Rendah Dalam)';
  if (pitchHz < 140) return 'Baritone (Suara Pria Sedang / Resonan)';
  if (pitchHz < 185) return 'Tenor (Suara Pria Tinggi / Cerah)';
  if (pitchHz < 240) return 'Alto / Mezzo (Suara Wanita Sedang / Hangat)';
  return 'Soprano (Suara Wanita Tinggi / Jernih)';
}

/**
 * Renders a static audio waveform onto a HTMLCanvasElement for uploaded audio files
 */
export function drawStaticWaveform(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer,
  progressRatio = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  const barWidth = 3;
  const gap = 2;
  const totalBars = Math.floor(width / (barWidth + gap));
  const samplesPerBar = Math.floor(data.length / totalBars);

  for (let i = 0; i < totalBars; i++) {
    let min = 1.0;
    let max = -1.0;
    const startIdx = i * samplesPerBar;
    for (let j = 0; j < samplesPerBar; j++) {
      const datum = data[startIdx + j] || 0;
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    const barFraction = i / totalBars;
    if (barFraction <= progressRatio && progressRatio > 0) {
      ctx.fillStyle = '#818cf8';
    } else {
      ctx.fillStyle = '#4f46e5';
    }

    const peak = Math.max(0.04, Math.max(Math.abs(min), Math.abs(max)));
    const barHeight = Math.max(4, peak * height * 0.85);
    const x = i * (barWidth + gap);
    const y = amp - barHeight / 2;

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }
}
