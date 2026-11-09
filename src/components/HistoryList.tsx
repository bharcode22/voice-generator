import React, { useState, useRef } from 'react';
import {
  History,
  Play,
  Pause,
  Download,
  Trash2,
  Calendar,
  Volume2,
  Sliders,
} from 'lucide-react';
import { GeneratedSpeechItem } from '../types';

interface HistoryListProps {
  items: GeneratedSpeechItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onDeleteItem,
  onClearAll,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (items.length === 0) return null;

  const togglePlay = (item: GeneratedSpeechItem) => {
    if (!audioRef.current) return;

    if (playingId === item.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = `data:audio/wav;base64,${item.audioBase64}`;
      audioRef.current.play().catch(console.error);
      setPlayingId(item.id);
    }
  };

  const handleDownloadItem = (item: GeneratedSpeechItem) => {
    const cleanBase64 = item.audioBase64.replace(/^data:[^;]+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/wav' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SuaraKu-${item.voiceName}-${item.id}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm shadow-xl mt-6">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Riwayat Audio TTS Tersimpan ({items.length})
          </h3>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus Semua</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => {
          const isCurrentPlaying = playingId === item.id;
          return (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => togglePlay(item)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isCurrentPlaying
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {isCurrentPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-1 font-medium">
                    "{item.text}"
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="font-mono text-indigo-300 font-semibold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                      {item.voiceName}
                    </span>
                    <span>Pitch: {item.pitchShift > 0 ? `+${item.pitchShift}` : item.pitchShift}st</span>
                    <span>Speed: {item.speed}x</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleDownloadItem(item)}
                  title="Download WAV"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Hapus"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
