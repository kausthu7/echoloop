import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<'TERMS' | 'PRIVACY'>('TERMS');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col max-h-[85vh] transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Terms & Privacy Policy</h2>
              <p className="text-xs text-zinc-500">EchoLoop • Your second brain that follows through.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-zinc-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('TERMS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'TERMS'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'PRIVACY'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {activeTab === 'TERMS' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, signing in with Google, or recording voice commitments on EchoLoop, 
                  you agree to these Terms of Service. If you disagree with any part of these terms, please refrain 
                  from using the platform.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">2. Purpose & Autonomous Protocol</h3>
                <p>
                  EchoLoop is an autonomous voice-first accountability agent designed to hold you accountable to your 
                  goals. It schedules kickoff notifications, triggers progress check-ins, and logs completion outcomes.
                  You retain full ownership of your tasks and commitments at all times.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">3. Voice Notes & AI Interpretation</h3>
                <p>
                  When you record audio or enter text prompts, EchoLoop uses Google Gemini Flash to parse spoken 
                  intent, language, and relative scheduling times. Audio data is transmitted securely via HTTPS to 
                  serverless endpoints solely for transcription and parsing. We do not sell your audio data.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">4. Peer Accountability & Rewards</h3>
                <p>
                  Features such as the Accountability Circle and Treat Ledger enable social accountability with teammates. 
                  Treat pledges and coffee rewards are peer incentives and operate under voluntary community guidelines.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">5. Account Deletion & Data Rights</h3>
                <p>
                  You can delete individual tasks, completions, or your entire account at any time. Data deletion is 
                  propagated through Supabase PostgreSQL cascades with permanent removal.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">1. Information We Collect</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Account Data:</strong> Name, email address, and role/persona provided at signup or via Google OAuth.</li>
                  <li><strong>Voice Recordings:</strong> Audio blobs recorded through your microphone, parsed strictly to extract task titles and times.</li>
                  <li><strong>Task Ledger:</strong> Scheduled dates, status transitions, check-in responses, and completions.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">2. Data Isolation & Security</h3>
                <p>
                  All database tables are strictly secured with PostgreSQL <strong>Row-Level Security (RLS)</strong>. 
                  Users can only access, view, or modify their own records. Serverless endpoints verify Supabase 
                  cryptographic JWT tokens on every authenticated request.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">3. Third-Party Services</h3>
                <p>
                  We utilize <strong>Supabase</strong> for PostgreSQL storage and authentication, <strong>Vercel</strong> for 
                  serverless hosting, and <strong>Google Gemini API</strong> for natural language voice parsing. 
                  No personal data is rented or sold to advertisers.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">4. Cookie & Local Storage Usage</h3>
                <p>
                  EchoLoop uses browser <code>localStorage</code> to preserve theme preferences, audio chimes, and 
                  session tokens for automatic sign-in.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Last Updated: September 2026
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              {showAcceptButton ? 'Cancel' : 'Close'}
            </button>
            {showAcceptButton && onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>I Agree to Terms</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
