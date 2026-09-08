import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Trophy, 
  Coffee, 
  Share2, 
  Check 
} from 'lucide-react';
import { Task } from '../types';

interface WinsArchiveProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onFireConfetti: () => void;
  onOpenSendTreat?: () => void;
}

export const WinsArchive: React.FC<WinsArchiveProps> = ({
  tasks,
  onDeleteTask,
  onFireConfetti,
  onOpenSendTreat,
}) => {
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  const handleShareTask = (task: Task) => {
    const text = `🎉 Completed with EchoLoop accountability: "${task.title}" (${task.timeFromKickoffToComplete || 'Verified complete'})`;
    navigator.clipboard.writeText(text);
    setCopiedTaskId(task.id);
    onFireConfetti();
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  // Compute metrics
  const totalTasks = tasks.length;
  const followThroughRate = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 100;

  // Format completed timestamp
  const formatCompletedStamp = (iso?: string) => {
    if (!iso) return 'Completed';
    try {
      const date = new Date(iso);
      const isToday = date.toDateString() === new Date().toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return 'Completed';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Minimal Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-100">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Wins Archive</span>
            <span className="text-xs font-normal text-zinc-400">({completedTasks.length})</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {completedTasks.length > 0 ? (
              <span>{completedTasks.length} verified tasks • {followThroughRate}% completion rate</span>
            ) : (
              <span>Verified completed tasks will appear here</span>
            )}
          </p>
        </div>

        {completedTasks.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenSendTreat && (
              <button
                id="wins-send-treat-btn"
                type="button"
                onClick={onOpenSendTreat}
                className="text-xs font-semibold text-indigo-950 hover:text-indigo-900 bg-indigo-100/90 hover:bg-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                <span>Send a Treat</span>
              </button>
            )}
            <button
              type="button"
              onClick={onFireConfetti}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Celebrate</span>
            </button>
          </div>
        )}
      </div>

      {/* Celebratory Momentum Banner */}
      {completedTasks.length > 0 && onOpenSendTreat && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-linear-to-r from-indigo-500/10 via-violet-100/30 to-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">☕</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">
                Crushed a major milestone?
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate sm:whitespace-normal">
                Reward your focus with a treat (₹100, ₹200, ₹300, ₹500, or Custom).
              </p>
            </div>
          </div>
          <button
            id="banner-send-treat-btn"
            type="button"
            onClick={onOpenSendTreat}
            className="shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-xs shadow-indigo-500/20 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Send Treat</span>
          </button>
        </div>
      )}

      {/* Wins List */}
      {completedTasks.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No completed tasks yet</p>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            When you complete an in-flight check-in, the verified record will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200/70 shadow-xs overflow-hidden">
          {completedTasks.map((task) => (
            <div
              key={task.id}
              id={`win-card-${task.id}`}
              className="p-3.5 hover:bg-zinc-50/70 transition-colors flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-zinc-900 truncate">
                    {task.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                    <span>{formatCompletedStamp(task.completedAt)}</span>
                    {task.timeFromKickoffToComplete && (
                      <span>• {task.timeFromKickoffToComplete}</span>
                    )}
                    {task.completionSource === 'VERIFIED_FOLLOWUP' ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        Verified
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShareTask(task)}
                  className="p-1.5 rounded-lg bg-zinc-50 hover:bg-indigo-50 text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                  title="Share / Copy milestone achievement"
                >
                  {copiedTaskId === task.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onFireConfetti}
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                  title="Celebrate with confetti"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-all cursor-pointer"
                  title="Remove record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
