import React, { useState } from 'react';
import { User, Briefcase, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { TermsModal } from './TermsModal';

interface ProfileSetupModalProps {
  isOpen: boolean;
  user: UserProfile;
  onSaveProfile: (updates: { name: string; role: string }) => Promise<void>;
  onDismiss?: () => void;
}

const ROLES = [
  'Founder & Product Lead',
  'Indie Hacker / Solo Builder',
  'Software Engineer / Tech Lead',
  'Product Designer / UX',
  'Creator & Writer',
  'Student / Researcher',
  'Executive & Manager',
];

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  user,
  onSaveProfile,
}) => {
  const [name, setName] = useState(user.name === 'Google User' || !user.name ? '' : user.name);
  const [role, setRole] = useState(user.role || ROLES[0]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your preferred name.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms of Service & Privacy Policy to proceed.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSaveProfile({ name: name.trim(), role });
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile details.');
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col transition-all"
          role="dialog"
          aria-modal="true"
        >
          {/* Header Banner with Radiant Glow */}
          <div className="relative px-6 pt-6 pb-4 bg-linear-to-b from-indigo-50/80 to-white border-b border-zinc-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold mb-3 shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">Welcome to EchoLoop!</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Confirm your name and accountability role to personalize your experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Authenticated Email (Read-Only) */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Connected Account
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 truncate">
                {user.email}
              </div>
            </div>

            {/* Preferred Name */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Your Preferred Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivers"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                />
              </div>
            </div>

            {/* Accountability Role */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Accountability Persona
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium appearance-none cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Terms and Conditions Checkbox */}
            <div className="pt-2 border-t border-zinc-100">
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <span className="text-xs leading-snug">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsTermsOpen(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer inline"
                  >
                    Terms of Service & Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-4"
            >
              {isSaving ? (
                <span>Setting Up Your Ledger...</span>
              ) : (
                <>
                  <span>Save Profile & Enter EchoLoop</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => setTermsAccepted(true)}
        showAcceptButton={true}
      />
    </>
  );
};
