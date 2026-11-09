import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

interface CloningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloningGuideModal: React.FC<CloningGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'local'>('guide');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              Dokumentasi & Panduan SuaraKu AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Cara kerja kloning suara serta panduan instalasi di komputer lokal (Localhost).
            </p>
          </div>
        </div>

        {/* Segmented Modal Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cara Kerja Kloning Suara</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Jalankan di Komputer Lokal (Localhost)</span>
          </button>
        </div>

        {activeTab === 'guide' ? (
          <div className="space-y-6">
            {/* Quick Answer Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 text-sm leading-relaxed text-slate-200">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Teknologi Voice Cloning & Text-to-Speech</span>
              </div>
              <p>
                Anda dapat mengunggah file rekaman suara Anda (MP3, WAV, M4A) atau merekam langsung untuk mengekstrak karakteristik akustik vokal Anda (nada dasar Hz, timbre, dan formants), kemudian menyintesis teks baru dengan warna suara yang diselaraskan.
              </p>
            </div>

            {/* 3 Main Methodologies */}
            <div>
              <h3 className="text-xs font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>01. Tiga Metode Utama Mengkloning Suara Menjadi TTS</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-indigo-400 font-semibold">
                      Metode 1 · Instan
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-1">
                      Zero-Shot Instant Voice Clone
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Cukup upload rekaman suara 10 detik sampai 1 menit. AI mengekstrak speaker embedding secara langsung saat sintesis teks tanpa training ulang.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    Contoh: ElevenLabs Instant Clone, F5-TTS, CosyVoice.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-emerald-400 font-semibold">
                      Metode 2 · Profesional
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-2">
                      Fine-Tuned Dedicated Model
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Merekam 15 sampai 30 menit audio studio berkualitas tinggi. Model AI dilatih khusus sehingga sangat mirip hingga desah napas dan aksen unik Anda.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    Contoh: ElevenLabs PVC, Coqui XTTS-v2 Fine-Tuning, RVC v2.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-violet-400 font-semibold">
                      Metode 3 · Hybrid Studio
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-2">
                      Gemini AI + Acoustic DSP (Aplikasi Ini)
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Menganalisis nada dasar (Hz), artikulasi, dan formants dari file rekaman Anda, lalu menyelaraskan persona Gemini TTS dengan pemrosesan DSP audio personal.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    Kelebihan: Instan, berjalan di browser & Node.js tanpa butuh GPU khusus.
                  </div>
                </div>
              </div>
            </div>

            {/* Ethical notice */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-amber-200 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-amber-300 mb-0.5">
                  Etika Penggunaan Kloning Suara
                </strong>
                Hanya gunakan rekaman suara milik Anda sendiri atau suara pihak yang telah memberikan izin resmi.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kode aplikasi ini menggunakan arsitektur standar <strong>Node.js + Express + React + Vite</strong> dengan SDK resmi <code>@google/genai</code>, sehingga dapat dijalankan 100% di komputer lokal Anda (Windows, macOS, atau Linux).
            </div>

            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-indigo-400">
                Langkah 1 · Persiapan Node.js & Unduh Proyek
              </div>
              <p className="text-xs text-slate-300">
                Pastikan <strong>Node.js (versi 18 atau 20+)</strong> sudah terinstal di komputer Anda. Unduh kode proyek ini (Download ZIP atau Clone dari GitHub), ekstrak foldernya, lalu buka terminal di dalam folder proyek tersebut.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">
                  Langkah 2 · Instal Paket Dependensi
                </span>
                <button
                  type="button"
                  onClick={() => copyCommand('npm install', 'cmd-install')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedCmd === 'cmd-install' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto">
                npm install
              </pre>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">
                  Langkah 3 · Buat File .env dan Isi GEMINI_API_KEY
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyCommand(
                      'GEMINI_API_KEY="MASUKKAN_API_KEY_GEMINI_ANDA_DI_SINI"',
                      'cmd-env'
                    )
                  }
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedCmd === 'cmd-env' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin</span>
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Salin file <code>.env.example</code> menjadi file baru bernama <code>.env</code> di folder utama proyek, lalu isi dengan API Key dari Google AI Studio:
              </p>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                GEMINI_API_KEY="AIzaSy...API_KEY_ANDA"
              </pre>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">
                  Langkah 4 · Jalankan Server Lokal
                </span>
                <button
                  type="button"
                  onClick={() => copyCommand('npm run dev', 'cmd-dev')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedCmd === 'cmd-dev' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto">
                npm run dev
              </pre>
              <p className="text-xs text-slate-400">
                Setelah berjalan, buka browser Anda dan akses alamat <code>http://localhost:3000</code>.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
