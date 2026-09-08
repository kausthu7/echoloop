import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  Clock, 
  Volume2,
  X
} from 'lucide-react';
import { Task } from '../types';

interface ActiveAlertModalProps {
  isOpen: boolean;
  type: 'KICKOFF' | 'FOLLOWUP';
  task: Task | null;
  onKickoffOnIt: (taskId: string, bufferMinutes: number) => void;
  onKickoffAlreadyDone: (taskId: string) => void;
  onFollowUpFinished: (taskId: string) => void;
  onFollowUpExtend: (taskId: string, extensionMinutes: number, extensionLabel: string) => void;
  onFollowUpSlipped: (taskId: string, reason: string) => void;
  onClose: () => void;
  onReplayAudioAlert?: () => void;
}

export const ActiveAlertModal: React.FC<ActiveAlertModalProps> = ({
  isOpen,
  type,
  task,
  onKickoffOnIt,
  onKickoffAlreadyDone,
  onFollowUpFinished,
  onFollowUpExtend,
  onFollowUpSlipped,
  onClose,
  onReplayAudioAlert,
}) => {
  const [selectedBufferMinutes, setSelectedBufferMinutes] = useState<number>(
    task?.checkinDelayMinutes || 60
  );
  const [showExtensionMenu, setShowExtensionMenu] = useState(false);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="active-alert-modal"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-zinc-200/80 overflow-hidden pb-safe sm:pb-0 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Mobile drag affordance */}
        <div className="w-10 h-1 rounded-full bg-zinc-200 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

        {/* Minimal Header */}
        <div className="px-6 pt-3 sm:pt-5 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {type === 'KICKOFF' ? 'Kickoff Alert' : 'Verification Ping'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onReplayAudioAlert && (
              <button
                type="button"
                onClick={onReplayAudioAlert}
                title="Replay voice announcement"
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-6">
          
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-zinc-900 leading-snug">
              {type === 'KICKOFF'
                ? `Time to work on: ${task.title}`
                : `Did you complete: ${task.title}?`}
            </h2>

            {task.originalAudioSummary && (
              <p className="text-xs text-zinc-500 italic">
                "{task.originalAudioSummary}"
              </p>
            )}
          </div>

          {/* KICKOFF ACTIONS */}
          {type === 'KICKOFF' && (
            <div className="space-y-5">
              
              {/* Buffer timer selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Follow-up verification buffer:
                  </span>
                  <span className="font-semibold text-zinc-900">{selectedBufferMinutes}m</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSelectedBufferMinutes(mins)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedBufferMinutes === mins
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  id="kickoff-on-it-btn"
                  type="button"
                  onClick={() => onKickoffOnIt(task.id, selectedBufferMinutes)}
                  className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.99] cursor-pointer"
                >
                  Start Task & Start Buffer
                </button>

                <button
                  id="kickoff-already-done-btn"
                  type="button"
                  onClick={() => onKickoffAlreadyDone(task.id)}
                  className="w-full py-2 px-4 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 text-xs font-medium transition-colors"
                >
                  Already Finished
                </button>
              </div>

            </div>
          )}

          {/* FOLLOW-UP ACTIONS */}
          {type === 'FOLLOWUP' && (
            <div className="space-y-4">
              
              {!showExtensionMenu ? (
                <div className="space-y-2.5">
                  <button
                    id="followup-yes-btn"
                    type="button"
                    onClick={() => onFollowUpFinished(task.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Yes, Finished</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      id="followup-need-time-btn"
                      type="button"
                      onClick={() => setShowExtensionMenu(true)}
                      className="flex-1 py-2 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
                    >
                      Need More Time...
                    </button>

                    <button
                      id="followup-slipped-btn"
                      type="button"
                      onClick={() => onFollowUpSlipped(task.id, "Follow-up dismissed without completion")}
                      className="py-2 px-3 rounded-xl text-zinc-400 hover:text-rose-600 text-xs font-medium transition-colors"
                    >
                      Dismiss (Slip)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-medium text-zinc-600 block">
                    Select extension buffer:
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onFollowUpExtend(task.id, 60, "+1 Hour Extension")}
                      className="py-2 px-1 rounded-lg border border-zinc-200 hover:border-zinc-400 text-xs font-medium text-zinc-800 text-center transition-colors"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => onFollowUpExtend(task.id, 180, "Remind Tonight (3 Hours)")}
                      className="py-2 px-1 rounded-lg border border-zinc-200 hover:border-zinc-400 text-xs font-medium text-zinc-800 text-center transition-colors"
                    >
                      Tonight
                    </button>
                    <button
                      type="button"
                      onClick={() => onFollowUpExtend(task.id, 1440, "Move to Tomorrow Morning")}
                      className="py-2 px-1 rounded-lg border border-zinc-200 hover:border-zinc-400 text-xs font-medium text-zinc-800 text-center transition-colors"
                    >
                      Tomorrow
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowExtensionMenu(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <span>EchoLoop Verification</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-zinc-600 transition-colors"
          >
            Dismiss for now
          </button>
        </div>

      </div>
    </div>
  );
};
