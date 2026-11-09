import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  FileAudio,
} from 'lucide-react';
import { VoiceProfile, AudioMetrics } from '../types';

interface VoiceProfileCardProps {
  profile: VoiceProfile;
  metrics?: AudioMetrics;
  transcription?: string;
  onApplyToTts: () => void;
}

export const VoiceProfileCard: React.FC<VoiceProfileCardProps> = ({
  profile,
  metrics,
  transcription,
  onApplyToTts,
}) => {
  const sourceLabel =
    profile.sourceType === 'upload'
      ? `File Diunggah (${profile.fileName || 'Audio File'})`
      : profile.sourceType === 'preset'
      ? `Sampel Contoh (${profile.fileName || 'Preset WAV'})`
      : 'Rekaman Mikrofon Langsung';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profil Karakter Vokal Aktif</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400 font-normal">{sourceLabel}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            02. Hasil Ekstraksi Akustik Suara Anda
          </h3>
        </div>

        <button
          onClick={onApplyToTts}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <span>Gunakan di Studio Text-to-Speech</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4-Column Metric Strip with Tabular Numerals */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs text-slate-400">Nada Dasar (Pitch F0)</div>
          <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums mt-1">
            {profile.pitchEstimateHz} Hz
          </div>
          <div className="text-xs text-indigo-400 mt-1">
            {profile.voiceType}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Kejelasan Artikulasi</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {profile.clarityScore}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Tempo: {profile.pacing}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Warna Suara (Timbre)</div>
          <div className="text-base font-bold text-slate-100 mt-1.5">
            {profile.warmthLevel}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Formant Ratio: {profile.recommendedFormantShift}x
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Base Persona & Offset</div>
          <div className="text-lg font-bold text-indigo-300 font-mono tabular-nums mt-1">
            {profile.recommendedGeminiVoice}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Pitch Shift: {profile.recommendedVoicePitchShift > 0 ? '+' : ''}
            {profile.recommendedVoicePitchShift} st
          </div>
        </div>
      </div>

      {/* Summary & Transcription */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">
            Ringkasan Karakteristik Vokal
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {profile.voiceCharacteristicsSummary}
          </p>
        </div>

        {transcription && (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transkripsi Terdeteksi dari Audio</span>
            </div>
            <p className="text-sm text-slate-300 italic leading-relaxed">
              "{transcription}"
            </p>
          </div>
        )}
      </div>

      {/* Cloning Tips */}
      {profile.cloningTips && profile.cloningTips.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Rekomendasi Optimasi Kloning Suara</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.cloningTips.map((tip, idx) => (
              <div
                key={idx}
                className="text-xs text-slate-300 leading-relaxed"
              >
                <span className="font-mono tabular-nums text-indigo-400 font-semibold mr-1.5">
                  0{idx + 1}.
                </span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
