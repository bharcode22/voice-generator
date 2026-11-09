import React from 'react';
import { BookOpen } from 'lucide-react';

interface NavbarProps {
  activeTab: 'studio' | 'tts' | 'guide';
  setActiveTab: (tab: 'studio' | 'tts' | 'guide') => void;
  onOpenGuide: () => void;
  hasProfile: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGuide,
  hasProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveTab('studio')}
          className="text-lg font-extrabold tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          SuaraKu AI
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('studio')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'studio'
                ? 'border-indigo-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Upload & Rekam Suara {hasProfile ? '(Aktif)' : ''}
          </button>

          <button
            onClick={() => setActiveTab('tts')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tts'
                ? 'border-indigo-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Studio Text-to-Speech
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Panduan Kloning</span>
          </button>
        </div>
      </div>
    </header>
  );
};
