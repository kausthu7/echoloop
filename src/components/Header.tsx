import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Circle,
  Coffee,
  LogIn,
  LogOut,
  ChevronDown,
  Bell,
  Users,
  User,
  Download,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onOpenVoiceCapture: () => void;
  onOpenSendTreat: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenTeam?: () => void;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onInstallApp?: () => void;
  canInstall?: boolean;
  onOpenTour?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  voiceSpeechEnabled: boolean;
  onToggleVoiceSpeech: () => void;
  activeCount: number;
  inFlightCount: number;
  slippedCount: number;
  completedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVoiceCapture,
  onOpenSendTreat,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenTeam,
  user,
  onOpenAuth,
  onSignOut,
  onInstallApp,
  canInstall = false,
  onOpenTour,
  soundEnabled,
  onToggleSound,
  voiceSpeechEnabled,
  onToggleVoiceSpeech,
  inFlightCount,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200/60 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        
        {/* Brand: Glowing infinity/audio logo from user image */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
          <img 
            src="/logo.png" 
            alt="EchoLoop" 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover shadow-sm ring-2 ring-indigo-500/20 shrink-0" 
          />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight truncate">
              EchoLoop
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-normal leading-tight mt-0.5 truncate">
              Stay accountable, together.
            </p>
          </div>
        </div>

        {/* Right side controls - Only Bell, Users, and Avatar visible on mobile matching reference */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Audio Feedback Toggles (Desktop only - mobile accessible in Profile Menu) */}
          <div className="hidden md:flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-lg text-zinc-600 text-xs">
            <button
              id="toggle-chime-btn"
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
              className={`p-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'bg-white text-zinc-900 shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              id="toggle-voice-btn"
              type="button"
              onClick={onToggleVoiceSpeech}
              title={voiceSpeechEnabled ? 'Spoken speech alerts enabled' : 'Spoken speech muted'}
              className={`p-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                voiceSpeechEnabled 
                  ? 'bg-white text-zinc-900 shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${voiceSpeechEnabled ? 'text-indigo-600' : 'text-zinc-400'}`} />
            </button>
          </div>

          {/* Feature & Button Tour Guide */}
          {onOpenTour && (
            <button
              id="header-tour-guide-btn"
              type="button"
              onClick={onOpenTour}
              title="Platform Guide: What Every Button Does"
              className="hidden md:flex p-1.5 items-center justify-center rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Install App Button (When install prompt is available) */}
          {canInstall && onInstallApp && (
            <button
              id="header-install-app-btn"
              type="button"
              onClick={onInstallApp}
              title="Install EchoLoop App on your device"
              className="flex px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200/90 text-xs font-semibold items-center gap-1 sm:gap-1.5 shadow-2xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Send a Treat Action - Always visible on mobile & desktop with responsive label */}
          <button
            id="header-send-treat-btn"
            type="button"
            onClick={onOpenSendTreat}
            title="Send a treat (₹100, ₹200, ₹300, ₹500 or Custom)"
            className="flex px-2 sm:px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200/90 text-xs font-semibold items-center gap-1 sm:gap-1.5 shadow-2xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Coffee className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Send a Treat</span>
            <span className="text-[10px] bg-indigo-200/80 text-indigo-950 px-1 rounded-sm font-bold">₹</span>
          </button>

          {/* Primary CTA (Desktop Header CTA) */}
          <button
            id="header-capture-btn"
            type="button"
            onClick={onOpenVoiceCapture}
            className="hidden lg:flex px-3.5 py-1.5 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold items-center gap-1.5 shadow-sm shadow-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-100" />
            <span>Voice Note</span>
          </button>

          {/* Notification Button with red dot / badge count (Matching Reference) */}
          <button
            id="header-notifications-btn"
            type="button"
            onClick={onOpenNotifications}
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/70 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer shrink-0"
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread notifications` : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            )}
          </button>

          {/* Team Community Button (Matching Reference) */}
          <button
            id="header-team-btn"
            type="button"
            onClick={onOpenTeam}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/70 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer shrink-0"
            title="Accountability Circle & Teammates"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* User Profile Avatar / Menu (Matching Reference) */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                id="header-user-menu-btn"
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 hover:bg-indigo-200/90 text-indigo-950 font-bold text-xs flex items-center justify-center transition-all cursor-pointer ring-1 ring-indigo-200/80 shrink-0"
                title={`${user.name} (${user.email})`}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'K'}
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div 
                  id="header-user-dropdown"
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3.5 py-2.5 border-b border-zinc-100">
                    <p className="font-semibold text-zinc-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {user.role && (
                        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded-md">
                          {user.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {onOpenTour && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenTour();
                        }}
                        className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Guide: What Every Button Does</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSendTreat();
                      }}
                      className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-indigo-50/60 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Send a Treat</span>
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">₹</span>
                    </button>

                    {onOpenNotifications && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenNotifications();
                        }}
                        className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-zinc-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Notifications</span>
                        </span>
                        {unreadNotificationsCount > 0 && (
                          <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </button>
                    )}

                    {onOpenTeam && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenTeam();
                        }}
                        className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Accountability Circle</span>
                      </button>
                    )}

                    {canInstall && onInstallApp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onInstallApp();
                        }}
                        className="w-full px-3.5 py-2 text-left text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Install EchoLoop App</span>
                      </button>
                    )}

                    {/* Mobile Audio Controls inside Menu */}
                    <div className="md:hidden border-t border-zinc-100 my-1 pt-1">
                      <button
                        type="button"
                        onClick={onToggleSound}
                        className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-zinc-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-zinc-600" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-400" />}
                          <span>Sound Chimes</span>
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${soundEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {soundEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={onToggleVoiceSpeech}
                        className="w-full px-3.5 py-2 text-left text-zinc-700 hover:bg-zinc-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Voice Speech Alerts</span>
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${voiceSpeechEnabled ? 'bg-amber-50 text-amber-800' : 'bg-zinc-100 text-zinc-500'}`}>
                          {voiceSpeechEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>

                    {onSignOut && (
                      <div className="border-t border-zinc-100 my-1 pt-1">
                        <button
                          id="header-signout-btn"
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                id="header-signin-btn"
                type="button"
                onClick={onOpenAuth}
                title="Profile & Sign In"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-100 hover:bg-indigo-200/90 text-indigo-950 flex items-center justify-center transition-all cursor-pointer ring-1 ring-indigo-200/80 shrink-0"
              >
                <User className="w-4 h-4" />
              </button>
            )
          )}

        </div>

      </div>
    </header>
  );
};
