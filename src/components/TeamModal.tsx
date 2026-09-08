import React, { useState } from 'react';
import { 
  Users, 
  X, 
  Sparkles, 
  Coffee, 
  Flame, 
  Check, 
  Copy, 
  Send, 
  UserPlus, 
  Clock, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { TeamPartner } from '../types';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTreatToTeammate: (teammateName: string) => void;
  onNudgeTeammate: (teammate: TeamPartner) => void;
}

const INITIAL_TEAM: TeamPartner[] = [
  {
    id: 'partner-1',
    name: 'Sarah Chen',
    avatar: 'SC',
    role: 'Growth & Strategy',
    currentTask: 'Drafting Series A pitch deck review',
    status: 'FOCUSING',
    tasksCompletedToday: 3,
    streakDays: 8,
    lastActive: '5m ago',
  },
  {
    id: 'partner-2',
    name: 'David Miller',
    avatar: 'DM',
    role: 'Lead Architect',
    currentTask: 'Vendor contracts & production release',
    status: 'COMPLETED',
    tasksCompletedToday: 4,
    streakDays: 14,
    lastActive: '12m ago',
  },
  {
    id: 'partner-3',
    name: 'Priya Sharma',
    avatar: 'PS',
    role: 'Design & UX',
    currentTask: 'Figma review on mobile ledger components',
    status: 'FOCUSING',
    tasksCompletedToday: 2,
    streakDays: 5,
    lastActive: '1m ago',
  },
  {
    id: 'partner-4',
    name: 'Marcus Vance',
    avatar: 'MV',
    role: 'Engineering Lead',
    currentTask: 'Autonomous background audio verification check',
    status: 'BREAK',
    tasksCompletedToday: 3,
    streakDays: 11,
    lastActive: '25m ago',
  },
];

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSendTreatToTeammate,
  onNudgeTeammate,
}) => {
  const [team, setTeam] = useState<TeamPartner[]>(INITIAL_TEAM);
  const [nudgedPartners, setNudgedPartners] = useState<Set<string>>(new Set());
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  if (!isOpen) return null;

  const handleNudge = (partner: TeamPartner) => {
    setNudgedPartners((prev) => new Set(prev).add(partner.id));
    onNudgeTeammate(partner);
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText('https://echoloop.io/join?ref=alex-rivers-circle');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;

    // Add partner to circle
    const namePart = inviteEmail.split('@')[0];
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    const newPartner: TeamPartner = {
      id: `partner-${Date.now()}`,
      name: capitalizedName,
      avatar: capitalizedName.slice(0, 2).toUpperCase(),
      role: 'Accountability Partner',
      currentTask: 'Invited to Circle • Joining focus room',
      status: 'IDLE',
      tasksCompletedToday: 0,
      streakDays: 1,
      lastActive: 'Just invited',
    };

    setTeam((prev) => [newPartner, ...prev]);
    setInviteSuccess(true);
    setInviteEmail('');
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteForm(false);
    }, 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="team-modal-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[88vh] transition-all transform animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-linear-to-r from-indigo-50/60 via-white to-violet-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-indigo-500/20 shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  Accountability Circle
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {team.length} Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Stay accountable together. Nudge partners & celebrate wins!
              </p>
            </div>
          </div>

          <button
            id="close-team-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Invite Partner */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 text-xs">
          <span className="text-zinc-500 font-medium">
            Shared focus & autonomous check-ins
          </span>

          <div className="flex items-center gap-2">
            <button
              id="team-invite-toggle-btn"
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Partner</span>
            </button>
          </div>
        </div>

        {/* Invite Drawer Form */}
        {showInviteForm && (
          <div className="px-5 sm:px-6 py-3.5 bg-indigo-50/50 border-b border-indigo-100 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-950">Add a partner to your circle</span>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy 1-Click Link'}</span>
              </button>
            </div>

            <form onSubmit={handleSendEmailInvite} className="flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-zinc-900 bg-white outline-hidden"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Invite</span>
              </button>
            </form>

            {inviteSuccess && (
              <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Invitation sent! Added to your circle.</span>
              </p>
            )}
          </div>
        )}

        {/* Teammates List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {team.map((partner) => {
            const isNudged = nudgedPartners.has(partner.id);

            return (
              <div
                key={partner.id}
                id={`partner-card-${partner.id}`}
                className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200/80 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-2.5 group"
              >
                {/* Top Row: Partner Info & Status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      {partner.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          {partner.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          • {partner.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>Active {partner.lastActive}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status & Streak Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{partner.streakDays}d</span>
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      partner.status === 'FOCUSING' 
                        ? 'bg-indigo-100 text-indigo-900'
                        : partner.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {partner.status === 'FOCUSING' ? '⚡ In Deep Focus' : partner.status === 'COMPLETED' ? '✓ Finished Goal' : 'Taking Break'}
                    </span>
                  </div>
                </div>

                {/* Current Focus Task */}
                {partner.currentTask && (
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 flex items-center justify-between gap-2">
                    <span className="truncate italic">
                      "{partner.currentTask}"
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                      {partner.tasksCompletedToday} done today
                    </span>
                  </div>
                )}

                {/* Bottom Interactive Actions: Nudge & Send Treat */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    id={`nudge-partner-btn-${partner.id}`}
                    type="button"
                    onClick={() => handleNudge(partner)}
                    disabled={isNudged}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isNudged
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 active:scale-95'
                    }`}
                  >
                    {isNudged ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nudged! 👋</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Nudge 👋</span>
                      </>
                    )}
                  </button>

                  <button
                    id={`treat-partner-btn-${partner.id}`}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSendTreatToTeammate(partner.name);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Send Treat ☕</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encouragement circle helps follow-through rate jump +42%</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-800 hover:text-zinc-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
