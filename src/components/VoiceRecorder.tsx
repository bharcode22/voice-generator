import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  FileAudio,
  AlertCircle,
  Trash2,
  Check,
  Volume2,
} from 'lucide-react';
import { VoiceProfile, AudioMetrics } from '../types';
import {
  analyzeAudioBuffer,
  classifyVoiceRange,
  drawStaticWaveform,
} from '../utils/audioAnalyzer';
import { getAudioContext } from '../utils/webAudioDsp';

interface VoiceRecorderProps {
  onProfileGenerated: (
    profile: VoiceProfile,
    metrics: AudioMetrics,
    transcription: string,
    sampleBase64: string,
    autoSwitchToTts: boolean
  ) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
}

const READING_PROMPTS = [
  {
    title: 'Standar Fonetik',
    text: 'Halo! Perkenalkan, ini adalah sampel suara asli saya. Saya sedang mencoba teknologi kloning suara AI untuk mengubah teks menjadi ucapan dengan karakter vokal saya.',
  },
  {
    title: 'Ekspresif & Santai',
    text: 'Selamat pagi teman-teman semua! Semoga hari kalian menyenangkan dan penuh semangat. Hari ini ada banyak hal menarik yang ingin saya ceritakan.',
  },
  {
    title: 'Profesional & Presentasi',
    text: 'Selamat datang di pembaruan teknologi kali ini. Pada kesempatan ini, kita akan meninjau perkembangan inovasi kecerdasan buatan dalam pemrosesan suara digital.',
  },
];

const BUILTIN_SAMPLE_PRESETS = [
  {
    id: 'sample-male',
    label: 'Contoh Rekaman Pria (Baritone .WAV)',
    voiceName: 'Fenrir',
    style: 'Natural Indonesian male voice, warm and clear baritone',
    sampleText:
      'Halo semuanya, ini adalah contoh file rekaman suara pria dengan nada baritone yang diunggah untuk dianalisis menjadi profil Text to Speech.',
  },
  {
    id: 'sample-female',
    label: 'Contoh Rekaman Wanita (Alto .WAV)',
    voiceName: 'Kore',
    style: 'Natural Indonesian female voice, articulate and friendly',
    sampleText:
      'Halo, ini adalah contoh file rekaman suara wanita yang jernih dan hangat untuk pengujian ekstraksi karakter vokal secara otomatis.',
  },
];

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onProfileGenerated,
  isLoading,
  setIsLoading,
  error,
  setError,
}) => {
  // Default to 'upload' mode since the user specifically asked about uploading their voice
  const [inputMode, setInputMode] = useState<'upload' | 'mic'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [autoSwitchToTts, setAutoSwitchToTts] = useState(true);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<'upload' | 'mic' | 'preset'>('upload');
  const [localMetrics, setLocalMetrics] = useState<AudioMetrics | null>(null);

  // Playback preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticWaveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Context stream analyzer refs
  const streamAudioContextRef = useRef<AudioContext | null>(null);
  const streamAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Draw static waveform whenever audioBuffer or previewProgress updates
  useEffect(() => {
    if (audioBuffer && staticWaveformCanvasRef.current) {
      drawStaticWaveform(
        staticWaveformCanvasRef.current,
        audioBuffer,
        previewProgress
      );
    }
  }, [audioBuffer, previewProgress, inputMode]);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (
      streamAudioContextRef.current &&
      streamAudioContextRef.current.state !== 'closed'
    ) {
      streamAudioContextRef.current.close().catch(() => {});
      streamAudioContextRef.current = null;
    }
  };

  const drawLiveVisualizer = () => {
    const canvas = liveCanvasRef.current;
    const analyser = streamAnalyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = Math.abs(dataArray[i] - 128);
        if (v > maxVal) maxVal = v;
      }
      setMicVolumeLevel(Math.min(100, Math.round((maxVal / 128) * 120)));

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6366f1';

      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  };

  const processLoadedBlob = async (
    blob: Blob,
    fileName: string,
    origin: 'upload' | 'mic' | 'preset'
  ) => {
    setError(null);
    setAudioBlob(blob);
    setUploadedFileName(fileName);
    setUploadedFileSize(blob.size);
    setSourceType(origin);
    setPreviewProgress(0);
    setIsPlayingPreview(false);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const newUrl = URL.createObjectURL(blob);
    setAudioUrl(newUrl);

    // Read as Base64 for server API
    const reader = new FileReader();
    reader.onloadend = () => {
      setAudioBase64(reader.result as string);
    };
    reader.readAsDataURL(blob);

    // Decode via Web Audio API for instant metrics and waveform
    try {
      const ctx = getAudioContext();
      const arrayBuf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);
      setRecordDuration(Math.max(1, Math.round(decoded.duration)));
      const metrics = await analyzeAudioBuffer(decoded, blob.size);
      setLocalMetrics(metrics);
    } catch (e) {
      console.warn('Could not decode audio buffer locally:', e);
      setError(
        'Format file audio tidak dapat didekode oleh browser. Gunakan file MP3, WAV, M4A, atau OGG yang valid.'
      );
    }
  };

  const validateAndLoadFile = async (file: File) => {
    const validExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|flac|mp4)$/i;
    if (!file.type.startsWith('audio/') && !validExtensions.test(file.name)) {
      setError(
        'Format file belum didukung. Silakan pilih file audio seperti MP3, WAV, M4A, atau OGG.'
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal ukuran file adalah 25 MB.');
      return;
    }

    await processLoadedBlob(file, file.name, 'upload');
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndLoadFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await validateAndLoadFile(file);
  };

  const handleLoadPresetSample = async (
    preset: (typeof BUILTIN_SAMPLE_PRESETS)[0]
  ) => {
    setLoadingPresetId(preset.id);
    setError(null);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: preset.sampleText,
          voiceName: preset.voiceName,
          style: preset.style,
          modelType: 'lite',
        }),
      });
      if (!res.ok) {
        throw new Error('Gagal memuat sampel suara contoh.');
      }
      const data = await res.json();
      const cleanBase64 = data.audioBase64.replace(/^data:[^;]+;base64,/, '');
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const wavBlob = new Blob([bytes], { type: 'audio/wav' });
      await processLoadedBlob(
        wavBlob,
        `${preset.id}.wav`,
        'preset'
      );
    } catch (err: any) {
      setError(err.message || 'Gagal menyiapkan sampel suara contoh.');
    } finally {
      setLoadingPresetId(null);
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      streamAudioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      streamAnalyserRef.current = analyser;

      drawLiveVisualizer();

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      let selectedMime = 'audio/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: selectedMime });
        stopRecordingCleanup();
        await processLoadedBlob(
          blob,
          `Rekaman-Mikrofon-${Date.now()}.webm`,
          'mic'
        );
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setError(
        'Tidak dapat mengakses mikrofon. Anda dapat beralih ke tab Upload File Suara untuk mengunggah rekaman MP3, WAV, atau M4A.'
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const clearAudioSample = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setAudioBuffer(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setLocalMetrics(null);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setRecordDuration(0);
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleAnalyzeVoice = async () => {
    if (!audioBase64) {
      setError(
        'Silakan upload file suara (MP3, WAV, M4A) atau rekam suara Anda terlebih dahulu.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let metrics: AudioMetrics = localMetrics || {
        durationSeconds: recordDuration || 5,
        rmsVolume: 0.08,
        dominantPitchHz: 135,
        spectralCentroidHz: 250,
        zeroCrossingRate: 0.04,
        fileSizeBytes: uploadedFileSize || undefined,
      };

      if (audioBuffer && !localMetrics) {
        metrics = await analyzeAudioBuffer(
          audioBuffer,
          uploadedFileSize || undefined
        );
      }

      // 1. Server-side transcription using gemini-3.5-transcribe
      let transcription = '';
      try {
        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: audioBlob?.type || 'audio/wav',
          }),
        });
        if (transcribeRes.ok) {
          const tData = await transcribeRes.json();
          transcription = tData.transcription || '';
        }
      } catch (tErr) {
        console.warn('Transcription fallback:', tErr);
      }

      // 2. Server-side voice profiling using gemini-3.8-flash
      const profileRes = await fetch('/api/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription:
            transcription || READING_PROMPTS[selectedPromptIndex].text,
          audioMetrics: metrics,
        }),
      });

      if (!profileRes.ok) {
        const errJson = await profileRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menganalisis profil suara.');
      }

      const profileData = await profileRes.json();
      const profile: VoiceProfile = {
        ...profileData.profile,
        sourceType,
        fileName: uploadedFileName || undefined,
      };

      if (metrics.dominantPitchHz > 60 && metrics.dominantPitchHz < 500) {
        profile.pitchEstimateHz = metrics.dominantPitchHz;
        profile.voiceType = classifyVoiceRange(metrics.dominantPitchHz);
      }

      onProfileGenerated(
        profile,
        metrics,
        transcription,
        audioBase64,
        autoSwitchToTts
      );
    } catch (err: any) {
      console.error('Error analyzing voice:', err);
      setError(
        err.message || 'Terjadi kesalahan saat menganalisis sampel suara.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
      {/* Header & Input Mode Segmented Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            01. Input Sampel Suara Anda
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload file rekaman suara (MP3, WAV, M4A) atau rekam langsung untuk mengekstrak frekuensi nada dasar (Hz) dan warna vokal Anda.
          </p>
        </div>

        {/* Segmented Control: Upload File vs Live Mic */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('mic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              inputMode === 'mic'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Rekam Mikrofon</span>
          </button>
        </div>
      </div>

      {/* MODE A: UPLOAD AUDIO DROPZONE */}
      {inputMode === 'upload' && (
        <div className="mt-6 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,audio/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!audioUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-950/30'
                  : 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/60 hover:bg-slate-950'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mb-4">
                <FileAudio className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-100">
                Klik untuk memilih file suara atau tarik & lepaskan (Drag & Drop) ke sini
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md">
                Mendukung rekaman suara dari handphone, voice note, atau studio. Disarankan durasi minimal 5 hingga 30 detik suara bicara bersih tanpa musik latar.
              </p>

              {/* Unboxed metadata discipline with · separators */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span>Format: MP3, WAV, M4A, OGG, AAC</span>
                <span aria-hidden="true">·</span>
                <span>Maksimal 25 MB</span>
                <span aria-hidden="true">·</span>
                <span>Dekode PCM 24kHz/48kHz Otomatis</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Pilih File dari Perangkat
              </button>
            </div>
          ) : null}

          {/* Quick Sample Presets if user wants to test upload pipeline immediately */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400">
              Belum punya file rekaman di perangkat? Coba muat file sampel contoh:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {BUILTIN_SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={loadingPresetId !== null || isLoading}
                  onClick={() => handleLoadPresetSample(preset)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {loadingPresetId === preset.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE B: LIVE MICROPHONE RECORDING */}
      {inputMode === 'mic' && (
        <div className="mt-6 space-y-5">
          {/* Reading Prompts */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Naskah Panduan Bacaan (Pilih salah satu untuk dibaca saat merekam):
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {selectedPromptIndex + 1} / {READING_PROMPTS.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {READING_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPromptIndex(idx)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedPromptIndex === idx
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>

            <p className="text-sm text-slate-200 leading-relaxed p-3 rounded-lg bg-slate-900/70 border border-slate-800/80">
              "{READING_PROMPTS[selectedPromptIndex].text}"
            </p>
          </div>

          {/* Live Oscilloscope */}
          <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <canvas
              ref={liveCanvasRef}
              width={640}
              height={120}
              className="w-full h-28 block bg-slate-950"
            />

            {!isRecording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500">
                <Mic className="w-6 h-6 mb-1.5 opacity-50" />
                <span className="text-xs">
                  Tekan tombol Mulai Rekam Suara di bawah untuk merekam dari mikrofon
                </span>
              </div>
            )}

            {isRecording && (
              <div className="absolute top-3 left-4 flex items-center gap-3 text-xs font-mono tabular-nums text-red-400">
                <span>MEREKAM MIKROFON</span>
                <span>·</span>
                <span>{formatTime(recordDuration)}</span>
                <span>·</span>
                <span>Level: {micVolumeLevel}%</span>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isLoading}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                <span>{audioUrl ? 'Rekam Ulang via Mikrofon' : 'Mulai Rekam Suara'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Selesai Merekam ({formatTime(recordDuration)})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOADED / UPLOADED AUDIO PREVIEW & WAVEFORM DECK */}
      {audioUrl && !isRecording && (
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate max-w-md">
                  {uploadedFileName || 'Sampel-Suara.wav'}
                </span>
              </div>
              {/* Clean unboxed metadata with · separators & tabular-nums */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mt-1">
                <span>Durasi: {formatTime(recordDuration)}</span>
                <span aria-hidden="true">·</span>
                <span>Ukuran: {formatFileSize(uploadedFileSize)}</span>
                {localMetrics?.sampleRate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Sample Rate: {localMetrics.sampleRate} Hz</span>
                  </>
                )}
                {localMetrics?.dominantPitchHz && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-indigo-300">
                      Deteksi Pitch Awal: {localMetrics.dominantPitchHz} Hz
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {inputMode === 'upload' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Ganti File
                </button>
              )}
              <button
                type="button"
                onClick={clearAudioSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-red-950/40 text-xs font-medium text-slate-400 hover:text-red-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          {/* Waveform Preview & Play Bar */}
          <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <div className="flex-1 overflow-hidden">
              <canvas
                ref={staticWaveformCanvasRef}
                width={560}
                height={52}
                className="w-full h-12 block rounded"
              />
            </div>

            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onTimeUpdate={() => {
                if (
                  previewAudioRef.current &&
                  previewAudioRef.current.duration > 0
                ) {
                  setPreviewProgress(
                    previewAudioRef.current.currentTime /
                      previewAudioRef.current.duration
                  );
                }
              }}
              onEnded={() => {
                setIsPlayingPreview(false);
                setPreviewProgress(0);
              }}
              className="hidden"
            />
          </div>

          {/* Auto-Sync Option + Primary Analyze CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSwitchToTts}
                onChange={(e) => setAutoSwitchToTts(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>
                Langsung buka & sinkronkan ke Studio Text-to-Speech setelah analisis selesai
              </span>
            </label>

            <button
              type="button"
              onClick={handleAnalyzeVoice}
              disabled={isLoading}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menganalisis Karakter Suara...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analisis Vokal & Gunakan untuk TTS</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
