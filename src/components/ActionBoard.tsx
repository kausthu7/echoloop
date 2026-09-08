import React, { useState } from 'react';
import { 
  Clock, 
  Check, 
  Trash2, 
  Play, 
  Plus,
  AlertCircle,
  Globe,
  Target,
  Sparkles,
  Mic
} from 'lucide-react';
import { Task } from '../types';

interface ActionBoardProps {
  tasks: Task[];
  currentTime: Date;
  onTriggerKickoffNow: (task: Task) => void;
  onTriggerFollowUpNow: (task: Task) => void;
  onMarkAlreadyDone: (taskId: string) => void;
  onMarkCompleted: (taskId: string) => void;
  onRescheduleSlipped: (taskId: string, extraMinutes: number) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenVoiceCapture: () => void;
  onFireConfetti?: () => void;
}

export const ActionBoard: React.FC<ActionBoardProps> = ({
  tasks,
  currentTime,
  onTriggerKickoffNow,
  onTriggerFollowUpNow,
  onMarkAlreadyDone,
  onMarkCompleted,
  onRescheduleSlipped,
  onDeleteTask,
  onOpenVoiceCapture,
  onFireConfetti,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SLIPPED' | 'COMPLETED'>('ALL');
  const [quoteIndex, setQuoteIndex] = useState(0);

  const motivationalQuotes = [
    "Small steps lead to big progress.",
    "Momentum builds relentlessly from one finished task.",
    "Action cures hesitation. You're crushing it!",
    "Focus today unlocks freedom tomorrow.",
    "Relentless execution beats passive planning."
  ];

  const handleMotivationalBoost = () => {
    setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    if (onFireConfetti) onFireConfetti();
  };

  const inFlightTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const slippedTasks = tasks.filter((t) => t.status === 'SLIPPED');
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  // Human-readable countdown string
  const getFollowUpCountdown = (task: Task) => {
    if (!task.followUpScheduledTime) return 'Follow-up pending';
    const followUpDate = new Date(task.followUpScheduledTime);
    const diffMs = followUpDate.getTime() - currentTime.getTime();

    if (diffMs <= 0) {
      return 'Check-in due now';
    }

    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffSecs = Math.floor((diffMs % (60 * 1000)) / 1000);

    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${hours}h ${remainingMins}m left`;
    }
    return `${diffMins}m ${diffSecs}s left`;
  };

  const formatScheduledTime = (iso: string) => {
    try {
      const date = new Date(iso);
      const isToday = date.toDateString() === currentTime.toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return isToday ? `Today at ${timeStr}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
    } catch {
      return iso;
    }
  };

  const totalActionCount = inFlightTasks.length + slippedTasks.length + pendingTasks.length;

  const showInFlight = filter === 'ALL' || filter === 'IN_PROGRESS';
  const showSlipped = filter === 'ALL' || filter === 'SLIPPED';
  const showPending = filter === 'ALL';
  const showCompleted = filter === 'COMPLETED';

  return (
    <div className="space-y-6">
      
      {/* 1. Header: Action Queue (count) + Add Task button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <span>Action Queue</span>
          <span className="text-sm font-semibold text-zinc-400">({totalActionCount})</span>
        </h2>

        <button
          id="board-add-task-btn"
          type="button"
          onClick={onOpenVoiceCapture}
          className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* 2. Filter Pills Row - Smooth horizontal scroll on mobile with zero overflow */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          id="filter-all-btn"
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25 font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600'
          }`}
        >
          All ({totalActionCount})
        </button>

        <button
          id="filter-inflight-btn"
          type="button"
          onClick={() => setFilter('IN_PROGRESS')}
          className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            filter === 'IN_PROGRESS'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25 font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600'
          }`}
        >
          In Progress ({inFlightTasks.length})
        </button>

        <button
          id="filter-unresolved-btn"
          type="button"
          onClick={() => setFilter('SLIPPED')}
          className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            filter === 'SLIPPED'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25 font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600'
          }`}
        >
          Unresolved ({slippedTasks.length})
        </button>

        <button
          id="filter-completed-btn"
          type="button"
          onClick={() => setFilter('COMPLETED')}
          className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            filter === 'COMPLETED'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25 font-bold'
              : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600'
          }`}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* 3. Real-Mode Empty State when no tasks exist */}
      {totalActionCount === 0 && filter === 'ALL' && (
        <div id="action-queue-empty-state" className="py-10 sm:py-14 text-center bg-white rounded-3xl border border-indigo-100 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs ring-4 ring-indigo-50/50">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-xs mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">Your Action Queue is Ready</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              No pending commitments. Tap the microphone below or "+ Add Task" to speak your real goals in any language.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              id="empty-record-voice-btn"
              type="button"
              onClick={onOpenVoiceCapture}
              className="px-4 py-2.5 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice Note</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. IN FLIGHT CARD LIST */}
      {showInFlight && inFlightTasks.map((task) => {
        const countdown = getFollowUpCountdown(task);

        return (
          <div
            key={task.id}
            id={`inflight-card-${task.id}`}
            className="rounded-3xl border-2 border-indigo-400/90 bg-white p-4 sm:p-5 shadow-xs relative space-y-3 transition-all hover:border-indigo-500 overflow-hidden"
          >
            {/* Top row: Status pill & subtext */}
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90">
                <span className="w-2 h-2 rounded-full border-2 border-indigo-600" />
                In Progress
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Verification running
              </span>
            </div>

            {/* Title & voice note quote */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 leading-snug break-words">
                {task.title}
              </h3>
              <p className="text-xs text-zinc-500 line-clamp-2">
                Voice note: "{task.transcript || task.originalAudioSummary || 'Voice recorded note'}"
              </p>
            </div>

            {/* Bottom Actions Row matching reference */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              {/* Left metadata chips */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80">
                  <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-indigo-600 shrink-0" />
                  <span>{countdown}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs text-zinc-500 font-medium">
                  <Globe className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-zinc-400 shrink-0" />
                  <span>{task.detectedLanguage || 'English'}</span>
                </span>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                <button
                  id={`checkin-now-btn-${task.id}`}
                  type="button"
                  onClick={() => onTriggerFollowUpNow(task)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Check In
                </button>

                <button
                  id={`finish-early-btn-${task.id}`}
                  type="button"
                  onClick={() => onMarkCompleted(task.id)}
                  title="Mark as completed"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  title="Delete task"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100/80 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 5. SLIPPED / UNRESOLVED CARD LIST */}
      {showSlipped && slippedTasks.map((task) => (
        <div
          key={task.id}
          id={`slipped-card-${task.id}`}
          className="rounded-3xl border-2 border-rose-300/90 bg-white p-4 sm:p-5 shadow-xs relative space-y-3 transition-all hover:border-rose-400 overflow-hidden"
        >
          {/* Top row: Alert status pill & subtext */}
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Unresolved
            </span>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">
              Needs attention
            </span>
          </div>

          {/* Title & reason subtitle */}
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 leading-snug break-words">
              {task.title}
            </h3>
            <p className="text-xs text-zinc-500">
              {task.slippedReason || 'Follow-up check-in on unanswered "No, waiting on audited numbers."'}
            </p>
          </div>

          {/* Bottom Actions Row matching reference */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            {/* Left status chips */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200/80">
                Slipped
              </span>

              <button
                type="button"
                onClick={() => onRescheduleSlipped(task.id, 60)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>+1h</span>
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              <button
                id={`finish-slipped-btn-${task.id}`}
                type="button"
                onClick={() => onMarkCompleted(task.id)}
                title="Done now"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                title="Delete task"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100/80 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 6. UPCOMING / PENDING CARDS */}
      {showPending && pendingTasks.map((task) => (
        <div
          key={task.id}
          id={`pending-card-${task.id}`}
          className="rounded-3xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs relative space-y-3 transition-all hover:border-indigo-300 overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-zinc-100 text-zinc-600">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-zinc-500" />
              Scheduled Today
            </span>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">
              {formatScheduledTime(task.scheduledKickoffTime)}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 leading-snug break-words">
              {task.title}
            </h3>
            {task.originalAudioSummary && (
              <p className="text-xs text-zinc-500 line-clamp-1">
                "{task.originalAudioSummary}"
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <span className="text-xs text-zinc-400">
              {task.detectedLanguage || 'English'}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              <button
                id={`trigger-kickoff-now-btn-${task.id}`}
                type="button"
                onClick={() => onTriggerKickoffNow(task)}
                className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-indigo-700 text-indigo-700" />
                <span>Trigger</span>
              </button>

              <button
                type="button"
                onClick={() => onMarkAlreadyDone(task.id)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title="Mark done"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100/80 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 7. COMPLETED CARDS (When Completed filter is selected) */}
      {showCompleted && completedTasks.map((task) => (
        <div
          key={task.id}
          id={`completed-card-${task.id}`}
          className="rounded-3xl border border-emerald-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-2.5 transition-all hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
              <span>✓ Completed</span>
            </span>
            <span className="text-xs text-zinc-400">
              {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Verified'}
            </span>
          </div>

          <h3 className="text-sm font-bold text-zinc-900 leading-snug">{task.title}</h3>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-zinc-400">
              {task.timeFromKickoffToComplete || 'Verified complete on follow-up'}
            </span>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => onFireConfetti && onFireConfetti()}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
                title="Celebrate this milestone"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Celebrate</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title="Delete completed task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 8. Motivational Footer Widget matching reference - Interactive momentum booster */}
      <button
        id="motivational-boost-btn"
        type="button"
        onClick={handleMotivationalBoost}
        title="Click for a motivational boost & celebration!"
        className="w-full flex flex-col items-center justify-center py-6 text-center space-y-1 rounded-3xl hover:bg-indigo-50/50 transition-all cursor-pointer group active:scale-[0.99]"
      >
        <div className="p-2 rounded-full bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
          <Target className="w-6 h-6 text-zinc-400 group-hover:text-indigo-600 transition-colors stroke-[1.75]" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-zinc-700 group-hover:text-indigo-950 transition-colors flex items-center gap-1">
          <span>Keep going!</span>
          <span className="text-[10px] font-normal text-indigo-600 group-hover:underline">Tap for boost ✨</span>
        </p>
        <p className="text-[11px] text-zinc-400 group-hover:text-zinc-600 transition-colors italic max-w-xs">
          "{motivationalQuotes[quoteIndex]}"
        </p>
      </button>

    </div>
  );
};
