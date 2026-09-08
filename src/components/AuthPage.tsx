import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  supabaseSignIn, 
  supabaseSignUp,
  supabaseSignInWithGoogle
} from '../services/supabaseAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { TermsModal } from './TermsModal';

interface AuthPageProps {
  initialMode?: 'SIGN_IN' | 'SIGN_UP';
  onAuthSuccess: (user: UserProfile) => void;
  onBackToApp: () => void;
}

const ROLES = [
  'Founder & Product Lead',
  'Indie Hacker / Solo Builder',
  'Software Engineer',
  'Product Designer',
  'Creator & Writer',
  'Student / Researcher',
  'Executive & Manager',
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'SIGN_IN',
  onAuthSuccess,
  onBackToApp,
}) => {
  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>(initialMode);
  
  // Sign In / Common Fields (clean empty defaults for production)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Fields
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Switch modes cleanly
  const switchMode = (newMode: 'SIGN_IN' | 'SIGN_UP') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  // Real-time password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'None', color: 'bg-zinc-200' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Normalize to 1-4 scale
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 3, label: 'Good', color: 'bg-indigo-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  // Check whether passwords match on sign up
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // Fill default demo credentials for quick evaluation
  const handleFillDemoCreds = () => {
    setEmail('alex@echoloop.io');
    setPassword('password123');
    setErrorMessage(null);
  };

  // Form submission logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }

    if (mode === 'SIGN_UP') {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        setErrorMessage('Please enter your full name (minimum 2 characters).');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-check your confirm password field.');
        return;
      }

      if (!termsAccepted) {
        setErrorMessage('Please accept the Terms of Service to continue.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables, or click "Explore in Demo Mode" below.');
      }

      if (mode === 'SIGN_UP') {
        const result = await supabaseSignUp({
          name: name.trim(),
          email: trimmedEmail,
          password,
          role,
        });
        if (result.user) {
          setSuccessMessage('Account created successfully! Welcome to EchoLoop.');
          setTimeout(() => {
            onAuthSuccess(result.user!);
          }, 600);
        }
      } else {
        const result = await supabaseSignIn({
          email: trimmedEmail,
          password,
        });
        if (result.user) {
          setSuccessMessage('Signed in successfully! Entering EchoLoop...');
          setTimeout(() => {
            onAuthSuccess(result.user);
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Instant Demo Sandbox (Contract Rule #6: Isolated client sandbox; never writes to Supabase)
  const handleGuestDemo = () => {
    setIsLoading(true);
    setErrorMessage(null);
    const demoUser: UserProfile = {
      id: 'demo-sandbox-user',
      name: 'Demo Explorer',
      email: 'demo@echoloop.local',
      role: 'Founder & Product Lead',
      accountType: 'DEMO',
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('echoloop_demo_mode', 'true');
      localStorage.setItem('echoloop_user', JSON.stringify(demoUser));
    } catch {}
    setSuccessMessage('Entering Demo Sandbox (Local Mode)...');
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess(demoUser);
    }, 400);
  };

  // Real Google Sign In via Supabase OAuth
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }
      await supabaseSignInWithGoogle();
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      const msg = String(err?.message || '');
      if (
        msg.toLowerCase().includes('provider') || 
        msg.toLowerCase().includes('not enabled') || 
        msg.toLowerCase().includes('unsupported')
      ) {
        setErrorMessage(
          'Google Sign-In is not enabled yet in your Supabase project. To enable it: Go to your Supabase Dashboard -> Authentication -> Providers -> Google, enable it and enter your Google OAuth credentials. In the meantime, you can sign in with Email & Password or explore in Demo Mode.'
        );
      } else {
        setErrorMessage(err?.message || 'Failed to initiate Google sign in.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-zinc-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Radiant Pastel Ambient Gradient Orbs (Electric Indigo & Violet Glows on White) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-linear-to-br from-indigo-200/45 via-violet-200/40 to-blue-200/30 blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] rounded-full bg-linear-to-bl from-violet-200/45 via-indigo-100/45 to-sky-200/35 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 w-[580px] h-[580px] rounded-full bg-linear-to-tr from-indigo-200/40 via-violet-100/35 to-purple-100/35 blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="EchoLoop" 
            className="w-8 h-8 rounded-xl object-cover shadow-sm ring-2 ring-indigo-500/20 shrink-0" 
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-zinc-900 text-base leading-tight">
              EchoLoop
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Autonomous Accountability
            </span>
          </div>
        </div>

        <button
          id="auth-back-to-app-btn"
          type="button"
          onClick={onBackToApp}
          className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white/90 hover:bg-white px-3.5 py-1.5 rounded-xl border border-zinc-200/80 shadow-2xs backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Ledger</span>
        </button>
      </header>

      {/* Centered Light Glassmorphic Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 sm:px-4 py-6 sm:py-8">
        <div className="w-full max-w-md">
          
          {/* Light Glass Card */}
          <div 
            id="auth-glass-card"
            className="relative rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl border border-zinc-200/80 p-5 sm:p-8 shadow-[0_20px_50px_rgba(79,70,229,0.08)] ring-1 ring-zinc-200/70 space-y-5"
          >
            {/* Top glass reflection highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-indigo-200 to-transparent" />

            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[11px] font-semibold mb-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Voice-First Autonomous Accountability</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
                {mode === 'SIGN_UP' ? 'Create Your Account' : 'Welcome Back'}
              </h1>
              <p className="text-xs text-zinc-500 font-normal">
                {mode === 'SIGN_UP' 
                  ? 'Join EchoLoop to hold yourself accountable with autonomous voice pings' 
                  : 'Sign in to access your ledger, streak, and active check-ins'}
              </p>
            </div>

            {/* Light Glass Mode Switcher Pill */}
            <div className="grid grid-cols-2 p-1 bg-zinc-100/90 backdrop-blur-md rounded-2xl border border-zinc-200/70 text-xs font-semibold">
              <button
                id="tab-mode-signin"
                type="button"
                onClick={() => switchMode('SIGN_IN')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'SIGN_IN'
                    ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200/70'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-mode-signup"
                type="button"
                onClick={() => switchMode('SIGN_UP')}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'SIGN_UP'
                    ? 'bg-white text-indigo-950 shadow-xs border border-zinc-200/70'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Feedback Banners */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in duration-150 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Full Name field (Sign Up only) */}
              {mode === 'SIGN_UP' && (
                <div className="space-y-1">
                  <label 
                    htmlFor="auth-name-input"
                    className="text-xs font-semibold text-zinc-700 pl-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivers"
                      className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white border border-zinc-200/90 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-hidden transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Role / Persona field (Sign Up only) */}
              {mode === 'SIGN_UP' && (
                <div className="space-y-1">
                  <label 
                    htmlFor="auth-role-select"
                    className="text-xs font-semibold text-zinc-700 pl-1 flex items-center justify-between"
                  >
                    <span>Your Accountability Role</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Customizes voice prompts</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="auth-role-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-11 pr-8 py-2.5 sm:py-3 rounded-2xl bg-white border border-zinc-200/90 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm text-zinc-900 outline-hidden transition-all shadow-2xs appearance-none cursor-pointer"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Email Address field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1">
                  <label 
                    htmlFor="auth-email-input"
                    className="text-xs font-semibold text-zinc-700"
                  >
                    Email Address
                  </label>
                  {mode === 'SIGN_IN' && (
                    <button
                      type="button"
                      onClick={handleFillDemoCreds}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Quick-fill Demo
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-white border border-zinc-200/90 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-hidden transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1">
                  <label 
                    htmlFor="auth-password-input"
                    className="text-xs font-semibold text-zinc-700"
                  >
                    Password
                  </label>
                  {mode === 'SIGN_IN' && (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      Min 6 characters
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-2xl bg-white border border-zinc-200/90 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-hidden transition-all shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter (Sign Up only) */}
                {mode === 'SIGN_UP' && password.length > 0 && (
                  <div className="pt-1.5 px-1 space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 font-medium">Password strength:</span>
                      <span className="font-semibold text-zinc-800">{passwordStrength.label}</span>
                    </div>
                    {/* 4-segment visual indicator */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div 
                          key={step} 
                          className={`h-full rounded-full transition-all duration-300 ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Checklist hints */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-zinc-500">
                      <span className={`flex items-center gap-1 ${password.length >= 6 ? 'text-emerald-600 font-medium' : ''}`}>
                        {password.length >= 6 ? '✓' : '○'} 6+ chars
                      </span>
                      <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-emerald-600 font-medium' : ''}`}>
                        {/[0-9]/.test(password) ? '✓' : '○'} Number
                      </span>
                      <span className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-emerald-600 font-medium' : ''}`}>
                        {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password field (Sign Up only) */}
              {mode === 'SIGN_UP' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between pl-1">
                    <label 
                      htmlFor="auth-confirm-password-input"
                      className="text-xs font-semibold text-zinc-700"
                    >
                      Confirm Password
                    </label>
                    {passwordsMatch !== null && (
                      <span className={`text-[10px] font-medium ${passwordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {passwordsMatch ? '✓ Passwords match' : '✗ Do not match'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-2xl bg-white border ${
                        passwordsMatch === false 
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
                          : 'border-zinc-200/90 focus:border-indigo-500 focus:ring-indigo-500/20'
                      } text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-hidden transition-all shadow-2xs font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Options: Remember Me / Terms */}
              <div className="pt-1 flex items-center justify-between text-xs px-1">
                {mode === 'SIGN_IN' ? (
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-[11px] sm:text-xs">Remember my session</span>
                  </label>
                ) : (
                  <label className="flex items-start gap-2 cursor-pointer text-zinc-600 select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] sm:text-xs leading-snug">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsTermsOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer inline"
                      >
                        Terms & Privacy policy
                      </button>
                    </span>
                  </label>
                )}

                {mode === 'SIGN_IN' && (
                  <button
                    type="button"
                    onClick={handleFillDemoCreds}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Need Demo Login?
                  </button>
                )}
              </div>

              {/* Primary Vibrant Gradient Button */}
              <div className="pt-2">
                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:via-violet-700 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>{mode === 'SIGN_UP' ? 'Creating Your Account...' : 'Signing In...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'SIGN_UP' ? 'Create Account & Begin' : 'Sign In to EchoLoop'}</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>

            </form>

            {/* Quick 1-Click Divider & Instant Options */}
            <div className="space-y-3 pt-2 border-t border-zinc-200/60">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200/60" />
                </div>
                <div className="relative bg-white px-3 text-[11px] text-zinc-400 font-medium">
                  or continue with
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="auth-google-btn"
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200/80 shadow-2xs text-xs font-semibold text-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  id="auth-guest-demo-btn"
                  type="button"
                  onClick={handleGuestDemo}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/90 border border-indigo-200/90 shadow-2xs text-xs font-semibold text-indigo-900 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Explore instantly as Alex Rivers (Founder & Product Lead)"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                  <span>Instant Demo</span>
                </button>
              </div>

              {/* Bottom Mode Toggle Prompt */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-500">
                  {mode === 'SIGN_UP' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('SIGN_IN')}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('SIGN_UP')}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Create an Account
                      </button>
                    </>
                  )}
                </p>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-4 text-center text-xs text-zinc-400">
        EchoLoop &copy; {new Date().getFullYear()} • Autonomous Voice Accountability
      </footer>

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => setTermsAccepted(true)}
        showAcceptButton={true}
      />
    </div>
  );
};
