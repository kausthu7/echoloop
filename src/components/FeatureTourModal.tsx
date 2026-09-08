import React, { useState } from 'react';
import { 
  X, 
  Mic, 
  Play, 
  CheckCircle2, 
  Coffee, 
  Users, 
  Bell, 
  Download, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Clock, 
  BarChart3,
  Flame
} from 'lucide-react';

interface FeatureTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  iconBg: string;
  description: string;
  details: string[];
  sampleVisual?: React.ReactNode;
}

const TOUR_ITEMS: TourItem[] = [
  {
    id: 'voice',
    title: 'Voice Note Button',
    badge: 'Core Feature',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: <Mic className="w-5 h-5 text-white" />,
    iconBg: 'bg-linear-to-r from-indigo-600 to-violet-600',
    description: 'Speak your commitments naturally in any language (English, Malayalam, Hindi, Hinglish, etc.).',
    details: [
      'Gemini Flash AI extracts your actionable goal and exact local kickoff time.',
      'Computes smart follow-up buffer delays (30 to 120 mins).',
      'Available in the top header and bottom right floating button.',
    ],
  },
  {
    id: 'trigger',
    title: 'Trigger / Kickoff Button',
    badge: 'Task Action',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: <Play className="w-5 h-5 text-white" />,
    iconBg: 'bg-violet-600',
    description: 'Starts your task timer immediately and triggers an audio chime.',
    details: [
      'Moves the task to "In-Flight" (IN_PROGRESS) mode.',
      'Schedules an autonomous verification check-in based on your task buffer.',
      'Allows testing or kicking off goals ahead of their scheduled time.',
    ],
  },
  {
    id: 'complete',
    title: 'Mark Done & Reschedule',
    badge: 'Accountability',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-5 h-5 text-white" />,
    iconBg: 'bg-emerald-600',
    description: 'Log accomplishments and verify completion outcomes.',
    details: [
      'Click the Checkmark (✓) to finish a goal and move it to the Wins Archive with victory confetti.',
      'If you need more time during check-in, choose "Need More Time" to extend by 30-60 mins.',
      'Extensions reschedule the kickoff automatically so goals never slip unnoticed.',
    ],
  },
  {
    id: 'treat',
    title: 'Send a Treat (₹)',
    badge: 'Rewards',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Coffee className="w-5 h-5 text-white" />,
    iconBg: 'bg-amber-600',
    description: 'Peer accountability reward ledger to celebrate milestones.',
    details: [
      'Send virtual coffee or treats (₹100, ₹200, ₹300, ₹500, or Custom).',
      'Supports peer recognition via simulated UPI, PhonePe, and cards.',
      'Fires celebration confetti and notifies the receiver.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notification Bell',
    badge: 'Alerts',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <Bell className="w-5 h-5 text-white" />,
    iconBg: 'bg-rose-600',
    description: 'Real-time alert center for your autonomous commitments.',
    details: [
      'Shows unread red badge count for pending kickoffs and follow-ups.',
      'Tracks treat receipts and teammate focus nudges.',
      'Click any notification to jump directly to the relevant task.',
    ],
  },
  {
    id: 'circle',
    title: 'Accountability Circle',
    badge: 'Social Focus',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Users className="w-5 h-5 text-white" />,
    iconBg: 'bg-sky-600',
    description: 'Connect with partners and hold each other accountable.',
    details: [
      'View real-time focus statuses of partners (In Focus, In Progress, Break).',
      'Send gentle encouragement nudges or surprise treats.',
      'Track shared streak days and mutual progress.',
    ],
  },
  {
    id: 'install',
    title: 'Install App (📲)',
    badge: 'Mobile & Desktop',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Download className="w-5 h-5 text-white" />,
    iconBg: 'bg-emerald-600',
    description: '1-tap install to your phone or computer home screen.',
    details: [
      'Opens in standalone fullscreen with no browser URL bar.',
      'Enables fast 1-tap voice recording directly from your phone screen.',
      'Full offline support with cached service worker.',
    ],
  },
  {
    id: 'stats',
    title: 'Accountability Insights',
    badge: 'Analytics',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <BarChart3 className="w-5 h-5 text-white" />,
    iconBg: 'bg-purple-600',
    description: 'Track your focus velocity and completion statistics.',
    details: [
      'Click "Tap for stats" on the top banner card.',
      'View total goals completed, in-flight tasks, and slipped rate.',
      'Celebration confetti button for extra motivation boosts.',
    ],
  },
];

export const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ isOpen, onClose }) => {
  const [selectedItem, setSelectedItem] = useState<TourItem>(TOUR_ITEMS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col max-h-[90vh] transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between bg-linear-to-r from-indigo-50/70 via-white to-violet-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                Welcome to EchoLoop!
              </h2>
              <p className="text-xs text-zinc-500">
                Here is what every button and feature in your ledger does:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Two Column layout on desktop (List on left, Details on right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
          
          {/* Left Column: Button Selector List */}
          <div className="md:col-span-5 p-3 sm:p-4 space-y-1.5 overflow-y-auto max-h-[35vh] md:max-h-[55vh]">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">
              Platform Actions ({TOUR_ITEMS.length})
            </p>
            {TOUR_ITEMS.map((item) => {
              const isSelected = selectedItem.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`w-full p-2.5 sm:p-3 rounded-2xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border border-indigo-200/90 shadow-2xs'
                      : 'hover:bg-zinc-50 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-zinc-800'}`}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {item.badge}
                    </p>
                  </div>
                  {isSelected && (
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Explanation & Usage */}
          <div className="md:col-span-7 p-5 sm:p-6 space-y-4 bg-zinc-50/40 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedItem.badgeColor}`}>
                  {selectedItem.badge}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${selectedItem.iconBg} flex items-center justify-center shadow-md shrink-0`}>
                  {selectedItem.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    {selectedItem.title}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {selectedItem.description}
                  </p>
                </div>
              </div>

              {/* Bullet points */}
              <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2.5">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  How It Works
                </p>
                <ul className="space-y-2 text-xs text-zinc-700">
                  {selectedItem.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick Tip Banner */}
            <div className="pt-2">
              <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
                <Flame className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[11px]">
                  <strong>Tip:</strong> Tap any task in your Action Queue to see its transcript, audio summary, and status history.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            You can reopen this guide anytime from your profile menu.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Got It, Let's Begin!</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
