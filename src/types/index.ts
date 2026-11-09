export interface VoiceProfile {
  voiceType: string;
  clarityScore: number;
  pitchEstimateHz: number;
  warmthLevel: string;
  pacing: string;
  recommendedGeminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  recommendedVoicePitchShift: number;
  recommendedFormantShift: number;
  voiceCharacteristicsSummary: string;
  cloningTips: string[];
  sourceType?: 'upload' | 'mic' | 'preset';
  fileName?: string;
}

export interface AudioMetrics {
  durationSeconds: number;
  rmsVolume: number;
  dominantPitchHz: number;
  spectralCentroidHz: number;
  zeroCrossingRate: number;
  sampleRate?: number;
  channels?: number;
  fileSizeBytes?: number;
}

export interface GeneratedSpeechItem {
  id: string;
  timestamp: number;
  text: string;
  voiceName: string;
  style: string;
  audioBase64: string;
  mimeType: string;
  durationSeconds?: number;
  pitchShift: number;
  formantShift: number;
  speed: number;
}
