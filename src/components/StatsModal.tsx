import React from 'react';
import { 
  X, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Coffee, 
  Sparkles, 
  TrendingUp,
  Target
} from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedCount: number;
  inFlightCount: number;
  slippedCount: number;
  pendingCount: number;
  totalTreatsAmount: number;
  onFireConfetti: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  completedCount,
  inFlightCount,
  slippedCount,
  pendingCount,
  totalTreatsAmount,
  onFireConfetti,
}) => {
  if (!isOpen) return null;

  const totalTasks = completedCount + inFlightCount + slippedCount + pendingCount;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;

  const daysOfWeek = [
    { label: 'M', completed: true },
    { label: 'T', completed: true },
    { label: 'W', completed: true },
    { label: 'T', completed: true },
    { label: 'F', completed: false, today: true },
    { label: 'S', completed: false },
    { label: 'S', completed: false },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="stats-modal-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-linear-to-r from-indigo-100/70 via-indigo-50/60 to-violet-100/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Accountability Insights
              </h2>
              <p className="text-xs text-zinc-500">
                Momentum, streaks & autonomous follow-through
              </p>
            </div>
          </div>

          <button
            id="close-stats-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Streak Banner */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold text-zinc-900">4 Days</span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                    Hot Streak 🔥
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Daily commitments verified & logged
                </p>
              </div>
            </div>

            <button
              id="stats-confetti-btn"
              type="button"
              onClick={onFireConfetti}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Celebrate</span>
            </button>
          </div>

          {/* Weekly Streak Dots */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold text-zinc-800">Weekly Consistency</span>
              <span>4 / 7 days active</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {daysOfWeek.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-zinc-400">{day.label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    day.completed 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : day.today 
                      ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500/50' 
                      : 'bg-zinc-200/70 text-zinc-400'
                  }`}>
                    {day.completed ? '✓' : day.today ? '⚡' : '•'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Completion</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-extrabold text-zinc-900">{completionRate}%</p>
              <p className="text-[11px] text-emerald-700 font-medium">{completedCount} verified milestones</p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>In Action</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-extrabold text-zinc-900">{inFlightCount + pendingCount}</p>
              <p className="text-[11px] text-indigo-700 font-medium">{inFlightCount} under active check-in</p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Treat Rewards</span>
                <Coffee className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-xl font-extrabold text-zinc-900">₹{totalTreatsAmount}</p>
              <p className="text-[11px] text-zinc-500">Fuel given & received</p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span>Unresolved</span>
                <Target className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xl font-extrabold text-zinc-900">{slippedCount}</p>
              <p className="text-[11px] text-rose-600 font-medium">1-click +1h reschedule</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-400">
          <span>Make progress, one check-in at a time</span>
          <button
            id="done-stats-btn"
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-900 hover:text-indigo-600 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
