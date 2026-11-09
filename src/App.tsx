import React, { useState, useEffect } from 'react';
import {
  Upload,
  Volume2,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { VoiceRecorder } from './components/VoiceRecorder';
import { VoiceProfileCard } from './components/VoiceProfileCard';
import { TtsStudio } from './components/TtsStudio';
import { HistoryList } from './components/HistoryList';
import { CloningGuideModal } from './components/CloningGuideModal';
import { VoiceProfile, AudioMetrics, GeneratedSpeechItem } from './types';

const STORAGE_KEY_PROFILE = 'suaraku_user_profile';
const STORAGE_KEY_HISTORY = 'suaraku_tts_history';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'tts' | 'guide'>(
    'studio'
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<VoiceProfile | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [sampleBase64, setSampleBase64] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<GeneratedSpeechItem[]>([]);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) {
        setHistoryItems(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Failed to load local storage:', e);
    }
  }, []);

  const handleProfileGenerated = (
    profile: VoiceProfile,
    metrics: AudioMetrics,
    sampleTranscription: string,
    sampleAudio: string,
    autoSwitchToTts: boolean
  ) => {
    setUserProfile(profile);
    setAudioMetrics(metrics);
    setTranscription(sampleTranscription);
    setSampleBase64(sampleAudio);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save profile to localStorage:', e);
    }

    if (autoSwitchToTts) {
      setActiveTab('tts');
    }
  };

  const handleSaveToHistory = (item: GeneratedSpeechItem) => {
    setHistoryItems((prev) => {
      const updated = [item, ...prev].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save history:', e);
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update history:', e);
      }
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setHistoryItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (e) {
      console.warn('Could not clear history:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasProfile={Boolean(userProfile)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Mendukung Upload File MP3, WAV, M4A & Rekaman Mikrofon</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 leading-tight [text-wrap:balance]">
              Upload Rekaman Suara Anda & Ubah Menjadi Text-to-Speech Personal
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Unggah file rekaman suara Anda (MP3, WAV, atau M4A) untuk diekstrak karakteristik akustiknya—mulai dari frekuensi nada dasar ($F_0$), timbre, hingga artikulasi—lalu langsung gunakan di Studio Text-to-Speech.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'studio'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload / Rekam Suara</span>
              </button>

              <button
                onClick={() => setActiveTab('tts')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'tts'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Studio Text-to-Speech</span>
              </button>

              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Cara Kerja Kloning Suara</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tab 1: Upload / Record Voice & Acoustic Profile */}
        {activeTab === 'studio' && (
          <div className="space-y-8">
            <VoiceRecorder
              onProfileGenerated={handleProfileGenerated}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              error={error}
              setError={setError}
            />

            {userProfile && (
              <VoiceProfileCard
                profile={userProfile}
                metrics={audioMetrics || undefined}
                transcription={transcription}
                onApplyToTts={() => setActiveTab('tts')}
              />
            )}
          </div>
        )}

        {/* Tab 2: Text-to-Speech Studio */}
        {activeTab === 'tts' && (
          <div className="space-y-8">
            <TtsStudio
              userProfile={userProfile}
              onSaveToHistory={handleSaveToHistory}
            />

            <HistoryList
              items={historyItems}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearAllHistory}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            SuaraKu AI · Analisis Profil Vokal & Text-to-Speech Studio
          </div>
          <div>
            Mendukung Upload Audio MP3, WAV, M4A, OGG & Sintesis WAV 24kHz
          </div>
        </div>
      </footer>

      {/* Guide Modal */}
      <CloningGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
