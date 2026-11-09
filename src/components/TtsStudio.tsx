import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sliders,
  Check,
  RefreshCw,
  Copy,
  Wand2,
  BookmarkPlus,
  AlertCircle,
  FileText,
  VolumeX,
} from 'lucide-react';
import { VoiceProfile, GeneratedSpeechItem } from '../types';
import {
  VoiceDspPlayer,
  DspParams,
  audioBufferToWavBlob,
} from '../utils/webAudioDsp';

interface TtsStudioProps {
  userProfile: VoiceProfile | null;
  onSaveToHistory: (item: GeneratedSpeechItem) => void;
}

const SAMPLE_SCRIPTS = [
  {
    label: 'Kloning Persona',
    text: 'Halo! Ini adalah suara hasil sintesis Text-to-Speech yang telah disesuaikan dengan karakteristik akustik vokal saya. Terdengar natural dan siap digunakan untuk berbagai kebutuhan konten.',
  },
  {
    label: 'Konten YouTube / Podcast',
    text: 'Selamat datang kembali di episode hari ini. Jangan lupa untuk like dan subscribe agar kalian tidak ketinggalan pembahasan seputar dunia teknologi dan kecerdasan buatan.',
  },
  {
    label: 'Layanan Profesional',
    text: 'Terima kasih telah menghubungi layanan kami. Permintaan Anda saat ini sedang kami proses, dan tim kami akan segera menghubungi Anda kembali.',
  },
  {
    label: 'Berita & Pengumuman',
    text: 'Sekilas informasi hari ini: Perkembangan model generative AI kini semakin memudahkan para kreator dalam menghasilkan audio berkualitas tinggi secara instan.',
  },
];

const PREBUILT_VOICES = [
  {
    name: 'Fenrir',
    gender: 'Pria',
    desc: 'Mantap, berwibawa, nada rendah baritone',
  },
  {
    name: 'Kore',
    gender: 'Wanita',
    desc: 'Hangat, lembut, artikulasi jernih alami',
  },
  {
    name: 'Puck',
    gender: 'Pria / Netral',
    desc: 'Cerah, ramah, santai, gaya percakapan',
  },
  {
    name: 'Charon',
    gender: 'Pria',
    desc: 'Dalam, tenang, berwibawa untuk narasi serius',
  },
  {
    name: 'Zephyr',
    gender: 'Wanita / Netral',
    desc: 'Halus, tenang, santai, artikulasi rapi',
  },
];

const STYLE_PRESETS = [
  'Percakapan santai, hangat, intonasi bahasa Indonesia alami',
  'Formal, profesional, jelas seperti presenter berita',
  'Host podcast antusias, energik dan bersahabat',
  'Lembut, tenang, membimbing layaknya instruktur meditasi',
];

export const TtsStudio: React.FC<TtsStudioProps> = ({
  userProfile,
  onSaveToHistory,
}) => {
  const [text, setText] = useState(
    'Halo! Ini adalah contoh suara hasil sintesis Text-to-Speech berbasis AI. Anda bisa mengetik teks apa saja dan mendengarkan suaranya langsung.'
  );
  const [selectedVoice, setSelectedVoice] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'>(
    userProfile?.recommendedGeminiVoice || 'Fenrir'
  );
  const [stylePrompt, setStylePrompt] = useState(
    'Percakapan santai, hangat, intonasi bahasa Indonesia alami'
  );
  const [modelType, setModelType] = useState<'lite' | 'flagship'>('lite');

  // DSP Acoustic Tuning Parameters
  const [pitchShift, setPitchShift] = useState(
    userProfile?.recommendedVoicePitchShift || 0
  );
  const [formantShift, setFormantShift] = useState(
    userProfile?.recommendedFormantShift || 1.0
  );
  const [speedRate, setSpeedRate] = useState(1.0);
  const [warmthGainDb, setWarmthGainDb] = useState(1.5);
  const [clarityGainDb, setClarityGainDb] = useState(1.0);
  const [enableDsp, setEnableDsp] = useState(true);

  // Synthesis & Playback State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isSaved, setIsSaved] = useState(false);

  const playerRef = useRef<VoiceDspPlayer | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerAnimRef = useRef<number | null>(null);

  // Initialize DSP player
  useEffect(() => {
    playerRef.current = new VoiceDspPlayer();
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (visualizerAnimRef.current) {
        cancelAnimationFrame(visualizerAnimRef.current);
      }
    };
  }, []);

  // Update voice if userProfile changes
  useEffect(() => {
    if (userProfile) {
      setSelectedVoice(userProfile.recommendedGeminiVoice);
      setPitchShift(userProfile.recommendedVoicePitchShift);
      setFormantShift(userProfile.recommendedFormantShift);
    }
  }, [userProfile]);

  const drawPlaybackVisualizer = () => {
    const canvas = visualizerCanvasRef.current;
    const player = playerRef.current;
    if (!canvas || !player) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = player.getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      visualizerAnimRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#4f46e5');
        grad.addColorStop(0.6, '#818cf8');
        grad.addColorStop(1, '#c084fc');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  const stopPlaybackProgress = () => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (visualizerAnimRef.current) {
      cancelAnimationFrame(visualizerAnimRef.current);
      visualizerAnimRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setErrorMessage('Teks tidak boleh kosong.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setIsSaved(false);

    if (playerRef.current) {
      playerRef.current.stop();
      stopPlaybackProgress();
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceName: selectedVoice,
          style: stylePrompt,
          modelType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal memproses Text-to-Speech.');
      }

      const data = await res.json();
      setCurrentAudioBase64(data.audioBase64);

      // Load into DSP engine
      if (playerRef.current && data.audioBase64) {
        const buffer = await playerRef.current.loadAudio(data.audioBase64);
        decodedBufferRef.current = buffer;
        setAudioDuration(buffer.duration);
        setPlaybackTime(0);

        // Auto-play synthesized result!
        startDspPlayback(0);
      }
    } catch (err: any) {
      console.error('TTS Synthesis error:', err);
      setErrorMessage(
        err.message || 'Terjadi gangguan saat memanggil Gemini TTS API.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const startDspPlayback = (offsetSeconds = 0) => {
    if (!playerRef.current || !decodedBufferRef.current) return;

    const params: DspParams = {
      pitchShiftSemitones: enableDsp ? pitchShift : 0,
      formantShift: enableDsp ? formantShift : 1.0,
      speedRate: enableDsp ? speedRate : 1.0,
      warmthGainDb: enableDsp ? warmthGainDb : 0,
      clarityGainDb: enableDsp ? clarityGainDb : 0,
    };

    playerRef.current.play(params, offsetSeconds, () => {
      stopPlaybackProgress();
      setPlaybackTime(0);
    });

    setIsPlaying(true);
    drawPlaybackVisualizer();

    // Progress timer
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = window.setInterval(() => {
      if (playerRef.current) {
        const state = playerRef.current.getPlaybackState();
        setPlaybackTime(state.currentOffset);
      }
    }, 100);
  };

  const togglePlay = () => {
    if (!playerRef.current || !decodedBufferRef.current) return;
    if (isPlaying) {
      const current = playerRef.current.pause();
      stopPlaybackProgress();
      setPlaybackTime(current);
    } else {
      startDspPlayback(playbackTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setPlaybackTime(newTime);
    if (isPlaying && playerRef.current) {
      startDspPlayback(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
    }
  };

  const handleDownload = () => {
    if (!decodedBufferRef.current) return;
    try {
      const blob = audioBufferToWavBlob(decodedBufferRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SuaraKu-TTS-${selectedVoice}-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleSaveToHistory = () => {
    if (!currentAudioBase64) return;
    const newItem: GeneratedSpeechItem = {
      id: `tts-${Date.now()}`,
      timestamp: Date.now(),
      text,
      voiceName: selectedVoice,
      style: stylePrompt,
      audioBase64: currentAudioBase64,
      mimeType: 'audio/wav',
      durationSeconds: audioDuration,
      pitchShift,
      formantShift,
      speed: speedRate,
    };
    onSaveToHistory(newItem);
    setIsSaved(true);
  };

  const applyUserProfileValues = () => {
    if (!userProfile) return;
    setSelectedVoice(userProfile.recommendedGeminiVoice);
    setPitchShift(userProfile.recommendedVoicePitchShift);
    setFormantShift(userProfile.recommendedFormantShift);
    setSpeedRate(1.0);
    setWarmthGainDb(2.0);
  };

  const resetDspValues = () => {
    setPitchShift(0);
    setFormantShift(1.0);
    setSpeedRate(1.0);
    setWarmthGainDb(0);
    setClarityGainDb(0);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner if user has profile */}
      {userProfile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-100">
                Profil Suara Terhubung: {userProfile.voiceType} ({userProfile.pitchEstimateHz} Hz)
                {userProfile.fileName ? ` — ${userProfile.fileName}` : ''}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                <span>Persona: {userProfile.recommendedGeminiVoice}</span>
                <span aria-hidden="true">·</span>
                <span>Pitch Offset: {userProfile.recommendedVoicePitchShift} st</span>
                <span aria-hidden="true">·</span>
                <span>Formant: {userProfile.recommendedFormantShift}x</span>
              </div>
            </div>
          </div>

          <button
            onClick={applyUserProfileValues}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Sinkronkan Ulang Parameter
          </button>
        </div>
      )}

      {/* Main Grid: Left editor & Right controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text & Persona (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Teks yang Ingin Diucapkan (TTS)
              </label>
              <span className="text-xs text-slate-500 font-mono">
                {text.length} karakter
              </span>
            </div>

            {/* Quick Script Chips */}
            <div className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                Contoh Kalimat Siap Pakai:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SCRIPTS.map((script, idx) => (
                  <button
                    key={idx}
                    onClick={() => setText(script.text)}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    {script.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Ketik atau tempel teks bahasa Indonesia di sini untuk disuarakan..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-y"
            />

            {/* Voice Persona Selector */}
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Pilih Base Voice Persona (Gemini 3.8):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PREBUILT_VOICES.map((v) => {
                  const isSelected = selectedVoice === v.name;
                  const isRecommended =
                    userProfile?.recommendedGeminiVoice === v.name;
                  return (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVoice(v.name as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-slate-100 shadow-md shadow-indigo-500/10'
                          : 'border-slate-800/80 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-2 right-2 text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-bold uppercase">
                          Cocok
                        </span>
                      )}
                      <div className="font-bold text-sm text-slate-200 flex items-center justify-between">
                        <span>{v.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-normal">
                          {v.gender}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {v.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Style / Prompt */}
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Gaya Pengucapan & Emosi (Speech Style):
              </label>
              <input
                type="text"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="misal: Ramah, santai, aksen Indonesia alami..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setStylePrompt(preset)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                      stylePrompt === preset
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {preset.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Model & Generate Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
                <span className="text-slate-400 font-medium">Model:</span>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as any)}
                  className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="lite" className="bg-slate-900">
                    gemini-3.8-flash-lite-tts (Cepat & Halus)
                  </option>
                  <option value="flagship" className="bg-slate-900">
                    gemini-3.8-flash-tts (Ekspresif Flagship)
                  </option>
                </select>
              </div>

              <button
                onClick={handleSynthesize}
                disabled={isGenerating || !text.trim()}
                className="w-full sm:flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mensintesis Suara AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 text-indigo-200" />
                    <span>Generate Suara (TTS)</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Acoustic DSP Morphing & Player (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* DSP Acoustic Shifter Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Tuning Akustik Personal (DSP)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetDspValues}
                  title="Reset ke Netral"
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableDsp}
                    onChange={(e) => setEnableDsp(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>

            <div className={`mt-4 space-y-4 ${!enableDsp ? 'opacity-40 pointer-events-none' : ''}`}>
              {/* Pitch Shift Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">
                    Pergeseran Nada (Pitch Shift)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {pitchShift > 0 ? `+${pitchShift}` : pitchShift} semitone
                  </span>
                </div>
                <input
                  type="range"
                  min="-6"
                  max="6"
                  step="0.5"
                  value={pitchShift}
                  onChange={(e) => setPitchShift(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>-6st (Lebih Berat)</span>
                  <span>0 (Asli)</span>
                  <span>+6st (Lebih Tinggi)</span>
                </div>
              </div>

              {/* Formant / Vocal Resonance */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">
                    Resonansi Rongga Vokal (Formant)
                  </span>
                  <span className="font-mono text-violet-400 font-bold">
                    {formantShift.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.25"
                  step="0.05"
                  value={formantShift}
                  onChange={(e) => setFormantShift(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>0.8x (Dada Dalam)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.25x (Tenggorokan)</span>
                </div>
              </div>

              {/* Speed Rate */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">
                    Kecepatan Artikulasi (Speed)
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {speedRate.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.4"
                  step="0.05"
                  value={speedRate}
                  onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Warmth & Clarity EQ */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Warmth (Bass EQ)</span>
                    <span className="font-mono text-slate-200">
                      {warmthGainDb > 0 ? `+${warmthGainDb}` : warmthGainDb} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="6"
                    step="0.5"
                    value={warmthGainDb}
                    onChange={(e) => setWarmthGainDb(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Clarity (Treble EQ)</span>
                    <span className="font-mono text-slate-200">
                      {clarityGainDb > 0 ? `+${clarityGainDb}` : clarityGainDb} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="5"
                    step="0.5"
                    value={clarityGainDb}
                    onChange={(e) => setClarityGainDb(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Player & Visualizer Deck */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between mb-3">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Player Hasil Sintesis
              </span>
              {decodedBufferRef.current && (
                <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  24kHz WAV Siap
                </span>
              )}
            </h3>

            {/* Spectrum Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 mb-3 shadow-inner">
              <canvas
                ref={visualizerCanvasRef}
                width={360}
                height={80}
                className="w-full h-20 block bg-slate-950"
              />
              {!currentAudioBase64 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                  Belum ada suara. Klik "Generate Suara" di sebelah kiri.
                </div>
              )}
            </div>

            {/* Seek Bar */}
            <div className="space-y-1 mb-4">
              <input
                type="range"
                min="0"
                max={audioDuration || 1}
                step="0.05"
                value={playbackTime}
                onChange={handleSeek}
                disabled={!decodedBufferRef.current}
                className="w-full h-1.5 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{formatSeconds(playbackTime)}</span>
                <span>{formatSeconds(audioDuration)}</span>
              </div>
            </div>

            {/* Main Play Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  disabled={!decodedBufferRef.current}
                  className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                {/* Volume slider */}
                <div className="flex items-center gap-1.5 ml-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-950 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions: Save & Download */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToHistory}
                  disabled={!currentAudioBase64 || isSaved}
                  title="Simpan ke Riwayat"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Simpan</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!decodedBufferRef.current}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download WAV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
