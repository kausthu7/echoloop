import React from 'react';
import { 
  CheckSquare, 
  Users, 
  Mic
} from 'lucide-react';

interface BottomNavProps {
  activeTab: 'ALL' | 'ACTION' | 'WINS';
  onSelectTab: (tab: 'ACTION' | 'WINS') => void;
  onOpenVoiceCapture: () => void;
  actionCount: number;
  inFlightCount: number;
  completedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenVoiceCapture,
  completedCount,
}) => {
  const isActionActive = activeTab === 'ACTION' || activeTab === 'ALL';
  const isWinsActive = activeTab === 'WINS';

  return (
    <nav 
      aria-label="Mobile Navigation"
      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      className="fixed inset-x-3 max-w-sm mx-auto z-40 bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-3xl shadow-xl sm:hidden"
    >
      <div className="h-15 flex items-center justify-around px-3">
        
        {/* Tab 1: Queue - Matching screenshot's pill active state */}
        <button
          id="mobile-nav-queue-btn"
          type="button"
          onClick={() => onSelectTab('ACTION')}
          className={`flex flex-col items-center justify-center transition-all cursor-pointer ${
            isActionActive && activeTab !== 'WINS'
              ? 'bg-indigo-100/90 text-indigo-950 px-5 py-1.5 rounded-2xl font-bold border border-indigo-200/60'
              : 'text-zinc-500 hover:text-zinc-800 px-3 py-1.5'
          }`}
        >
          <CheckSquare className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] leading-tight mt-0.5">Queue</span>
        </button>

        {/* Center: Quick Voice Action - Floating electric indigo/violet circle with white mic */}
        <div className="flex items-center justify-center">
          <button
            id="mobile-nav-voice-btn"
            type="button"
            onClick={onOpenVoiceCapture}
            aria-label="Record voice note"
            className="w-13 h-13 rounded-full bg-linear-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 ring-4 ring-white flex items-center justify-center -translate-y-3 active:scale-95 transition-transform cursor-pointer"
          >
            <Mic className="w-6 h-6 stroke-[2]" />
          </button>
        </div>

        {/* Tab 2: Wins - With green circular badge */}
        <button
          id="mobile-nav-wins-btn"
          type="button"
          onClick={() => onSelectTab('WINS')}
          className={`relative flex flex-col items-center justify-center transition-all cursor-pointer ${
            isWinsActive
              ? 'bg-indigo-100/90 text-indigo-950 px-5 py-1.5 rounded-2xl font-bold border border-indigo-200/60'
              : 'text-zinc-500 hover:text-zinc-800 px-3 py-1.5'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {completedCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {completedCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight mt-0.5">Wins</span>
        </button>

      </div>
    </nav>
  );
};
