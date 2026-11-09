/**
 * Web Audio DSP Engine for Personalized Voice Morphing & TTS Playback
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export interface DspParams {
  pitchShiftSemitones: number; // e.g. -6 to +6 semitones
  speedRate: number; // 0.7x to 1.5x
  warmthGainDb: number; // -6 to +8 dB
  formantShift: number; // 0.8 to 1.3 factor
  clarityGainDb: number; // -4 to +6 dB
}

export class VoiceDspPlayer {
  private ctx: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode;
  private gainNode: GainNode;
  private lowFilter: BiquadFilterNode;
  private formantFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;
  private decodedBuffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isPlaying = false;
  private onEndedCallback?: () => void;

  constructor() {
    this.ctx = getAudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 1.0;

    // Vocal warmth low-shelf filter (around 180Hz)
    this.lowFilter = this.ctx.createBiquadFilter();
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 200;
    this.lowFilter.gain.value = 0;

    // Formant body peaking filter (around 1800Hz)
    this.formantFilter = this.ctx.createBiquadFilter();
    this.formantFilter.type = 'peaking';
    this.formantFilter.frequency.value = 1800;
    this.formantFilter.Q.value = 1.2;
    this.formantFilter.gain.value = 0;

    // Articulation high-shelf filter (around 5000Hz)
    this.highFilter = this.ctx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 5000;
    this.highFilter.gain.value = 0;

    // Chain: lowFilter -> formantFilter -> highFilter -> gainNode -> analyser -> destination
    this.lowFilter.connect(this.formantFilter);
    this.formantFilter.connect(this.highFilter);
    this.highFilter.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  public async loadAudio(arrayBufferOrBase64: ArrayBuffer | string): Promise<AudioBuffer> {
    let arrayBuffer: ArrayBuffer;
    if (typeof arrayBufferOrBase64 === 'string') {
      const clean = arrayBufferOrBase64.replace(/^data:[^;]+;base64,/, '');
      const binaryString = window.atob(clean);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      arrayBuffer = arrayBufferOrBase64;
    }

    this.stop();
    this.pauseOffset = 0;
    this.decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    return this.decodedBuffer;
  }

  public play(params: DspParams, offsetSeconds = 0, onEnded?: () => void) {
    if (!this.decodedBuffer) return;
    this.stop();

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.onEndedCallback = onEnded;

    // Apply DSP Filter Params
    this.lowFilter.gain.setValueAtTime(params.warmthGainDb, this.ctx.currentTime);
    this.highFilter.gain.setValueAtTime(params.clarityGainDb, this.ctx.currentTime);

    // Formant shift modifies the peak frequency
    const baseFormant = 1800;
    this.formantFilter.frequency.setValueAtTime(
      Math.max(600, Math.min(4000, baseFormant * params.formantShift)),
      this.ctx.currentTime
    );
    this.formantFilter.gain.setValueAtTime((params.formantShift - 1) * 6, this.ctx.currentTime);

    const source = this.ctx.createBufferSource();
    source.buffer = this.decodedBuffer;

    // Pitch shift via detune (in cents: 1 semitone = 100 cents)
    const totalCents = params.pitchShiftSemitones * 100;
    source.detune.setValueAtTime(totalCents, this.ctx.currentTime);

    // Speed / Playback rate
    source.playbackRate.setValueAtTime(params.speedRate, this.ctx.currentTime);

    source.connect(this.lowFilter);

    const safeOffset = Math.max(0, Math.min(offsetSeconds, this.decodedBuffer.duration - 0.05));
    source.start(0, safeOffset);
    this.startTime = this.ctx.currentTime - safeOffset / params.speedRate;
    this.currentSource = source;
    this.isPlaying = true;

    source.onended = () => {
      if (this.currentSource === source) {
        this.isPlaying = false;
        this.currentSource = null;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };
  }

  public pause(): number {
    if (!this.isPlaying || !this.currentSource) return this.pauseOffset;
    const elapsed = (this.ctx.currentTime - this.startTime) * (this.currentSource.playbackRate.value || 1);
    this.pauseOffset = Math.max(0, Math.min(elapsed, this.decodedBuffer?.duration || 0));
    this.stop();
    return this.pauseOffset;
  }

  public stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Ignored if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  public setVolume(val: number) {
    this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1.5, val)), this.ctx.currentTime);
  }

  public getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      duration: this.decodedBuffer ? this.decodedBuffer.duration : 0,
      currentOffset: this.isPlaying
        ? (this.ctx.currentTime - this.startTime) * (this.currentSource?.playbackRate.value || 1)
        : this.pauseOffset,
    };
  }
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV Blob for download
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const length = buffer.length * numChannels * 2;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
