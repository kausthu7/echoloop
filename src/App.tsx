import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { ActionBoard } from './components/ActionBoard';
import { WinsArchive } from './components/WinsArchive';
import { VoiceCaptureModal } from './components/VoiceCaptureModal';
import { ActiveAlertModal } from './components/ActiveAlertModal';
import { BottomNav } from './components/BottomNav';
import { SendTreatModal } from './components/SendTreatModal';
import { AuthPage } from './components/AuthPage';
import { NotificationsModal } from './components/NotificationsModal';
import { TeamModal } from './components/TeamModal';
import { StatsModal } from './components/StatsModal';
import { 
  Task, 
  ActiveAlertModalState, 
  TreatRecord, 
  UserProfile, 
  AppNotification, 
  TeamPartner 
} from './types';
import { 
  playKickoffChime, 
  playFollowUpPing, 
  playSuccessChime, 
  speakExecutivePrompt 
} from './utils/audio';
import { 
  supabaseGetCurrentUser, 
  supabaseSignOut, 
  onSupabaseAuthStateChange,
  supabaseUpdateProfile
} from './services/supabaseAuth';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { FeatureTourModal } from './components/FeatureTourModal';
import { 
  supabaseFetchTasks, 
  supabaseCreateTask, 
  supabaseUpdateTask, 
  supabaseDeleteTask 
} from './services/supabaseTasks';
import { 
  supabaseFetchTreats, 
  supabaseCreateTreat 
} from './services/supabaseTreats';
import { supabaseRecordWin } from './services/supabaseWins';
import { supabaseCreateReminder } from './services/supabaseReminders';
import { SecondBrainChatModal } from './components/SecondBrainChatModal';
import { isSupabaseConfigured } from './lib/supabase';
import { Mic, Download, X, Brain } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION' | 'WINS'>('ALL');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [isTreatModalOpen, setIsTreatModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'APP' | 'AUTH'>('APP');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Interactive Modals State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [teammateForTreat, setTeammateForTreat] = useState<string | null>(null);

  // Live Notifications Feed - Real Mode
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-welcome',
      title: 'Welcome to EchoLoop ⚡',
      message: 'Autonomous voice-first accountability agent is ready. Tap the microphone or "+ Add Task" to schedule your first goal.',
      type: 'SYSTEM',
      timestamp: new Date().toISOString(),
      read: false,
    }
  ]);

  // Track active user session (null by default for real unauthenticated visitors)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('echoloop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [alertModal, setAlertModal] = useState<ActiveAlertModalState>({
    isOpen: false,
    type: 'KICKOFF',
    task: null,
  });

  // Track install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result && result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Track already-alerted task IDs in this session to prevent spamming
  const triggeredKickoffsRef = useRef<Set<string>>(new Set());
  const triggeredFollowUpsRef = useRef<Set<string>>(new Set());

  // Fire celebratory victory confetti
  const triggerConfettiCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  // Load cloud tasks from Supabase (Protected by RLS)
  const loadCloudTasks = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        const cloudTasks = await supabaseFetchTasks();
        setTasks(cloudTasks);
        try { localStorage.setItem('echoloop_tasks', JSON.stringify(cloudTasks)); } catch {}
        return;
      }
    } catch (err) {
      console.warn('Could not fetch cloud tasks from Supabase:', err);
    }

    try {
      const cached = localStorage.getItem('echoloop_tasks');
      if (cached) setTasks(JSON.parse(cached));
    } catch {}
  }, []);

  // Bootstrap session on startup & wire real-time auth listener
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabaseGetCurrentUser().then((user) => {
        if (user) {
          setCurrentUser(user);
          loadCloudTasks();
          const completedKey = `echoloop_profile_completed_${user.id}`;
          const isCompleted = localStorage.getItem(completedKey) === 'true';
          if (!isCompleted && (!user.name || user.name === 'Google User' || user.name === 'User' || !user.role || user.role === 'Member')) {
            setIsProfileSetupOpen(true);
          }
          // Show tour if user hasn't seen it yet
          if (!localStorage.getItem(`echoloop_tour_seen_${user.id}`)) {
            setIsTourOpen(true);
          }
        } else {
          setCurrentUser(null);
        }
      });

      const { unsubscribe } = onSupabaseAuthStateChange((user) => {
        setCurrentUser(user);
        if (user) {
          loadCloudTasks();
          const completedKey = `echoloop_profile_completed_${user.id}`;
          const isCompleted = localStorage.getItem(completedKey) === 'true';
          if (!isCompleted && (!user.name || user.name === 'Google User' || user.name === 'User' || !user.role || user.role === 'Member')) {
            setIsProfileSetupOpen(true);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [loadCloudTasks]);

  // Sync tasks to local storage whenever tasks state updates
  useEffect(() => {
    try {
      localStorage.setItem('echoloop_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Real-time ticking clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Phase 2: Autonomous Two-Tier Loop Watcher
  // Continuously monitors trigger times for Kickoff Alert and Verification Ping
  useEffect(() => {
    if (alertModal.isOpen) return; // Don't pop up another alert while one is active

    const nowMs = currentTime.getTime();

    // 1. Check for Pending Kickoffs due
    for (const task of tasks) {
      if (task.status === 'PENDING') {
        const kickoffMs = new Date(task.scheduledKickoffTime).getTime();
        // If scheduled time has arrived and hasn't been popped yet
        if (nowMs >= kickoffMs && !triggeredKickoffsRef.current.has(task.id)) {
          triggeredKickoffsRef.current.add(task.id);
          
          if (soundEnabled) playKickoffChime();
          if (voiceSpeechEnabled) {
            speakExecutivePrompt(`Time to work on: ${task.title}`);
          }

          setAlertModal({
            isOpen: true,
            type: 'KICKOFF',
            task,
          });
          return;
        }
      }

      // 2. Check for In-Flight Follow-Up Verification Pings due
      if (task.status === 'IN_PROGRESS' && task.followUpScheduledTime) {
        const followUpMs = new Date(task.followUpScheduledTime).getTime();
        if (nowMs >= followUpMs && !triggeredFollowUpsRef.current.has(task.id)) {
          triggeredFollowUpsRef.current.add(task.id);

          if (soundEnabled) playFollowUpPing();
          if (voiceSpeechEnabled) {
            speakExecutivePrompt(`Hey, did you finish ${task.title}?`);
          }

          setAlertModal({
            isOpen: true,
            type: 'FOLLOWUP',
            task,
          });
          return;
        }
      }
    }
  }, [currentTime, tasks, alertModal.isOpen, soundEnabled, voiceSpeechEnabled]);

  // Handler: Manual trigger Kickoff Alert (for testing / fast-forward)
  const handleTriggerKickoffNow = (task: Task) => {
    if (soundEnabled) playKickoffChime();
    if (voiceSpeechEnabled) {
      speakExecutivePrompt(`Time to work on: ${task.title}`);
    }
    setAlertModal({
      isOpen: true,
      type: 'KICKOFF',
      task,
    });
  };

  // Handler: Manual trigger Verification Ping (for testing / fast-forward)
  const handleTriggerFollowUpNow = (task: Task) => {
    if (soundEnabled) playFollowUpPing();
    if (voiceSpeechEnabled) {
      speakExecutivePrompt(`Hey, did you finish ${task.title}?`);
    }
    setAlertModal({
      isOpen: true,
      type: 'FOLLOWUP',
      task,
    });
  };

  // Handler: Kickoff -> [On It / Okay]
  const handleKickoffOnIt = async (taskId: string, bufferMinutes: number) => {
    const now = new Date();
    const followUpTime = new Date(now.getTime() + bufferMinutes * 60 * 1000).toISOString();

    const updates: Partial<Task> = {
      status: 'IN_PROGRESS',
      checkinDelayMinutes: bufferMinutes,
      inProgressStartedAt: now.toISOString(),
      followUpScheduledTime: followUpTime,
      lastFollowUpPrompt: `Did you finish ${alertModal.task?.title}?`,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setAlertModal({ isOpen: false, type: 'KICKOFF', task: null });

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
        await supabaseCreateReminder(taskId, followUpTime, 'FOLLOWUP');
      } catch (e) {
        console.warn('Update kickoff in Supabase error:', e);
      }
    }
  };

  // Handler: Kickoff -> [Already Done]
  const handleKickoffAlreadyDone = async (taskId: string) => {
    const now = new Date();
    const task = tasks.find((t) => t.id === taskId);
    const updates: Partial<Task> = {
      status: 'COMPLETED',
      completedAt: now.toISOString(),
      completionSource: 'ALREADY_DONE',
      timeFromKickoffToComplete: 'Marked complete immediately',
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setAlertModal({ isOpen: false, type: 'KICKOFF', task: null });

    if (soundEnabled) playSuccessChime();
    triggerConfettiCelebration();

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
        await supabaseRecordWin(taskId, task?.title || 'Accountability Goal', 'Completed immediately');
      } catch (e) {
        console.warn('Sync complete error:', e);
      }
    }
  };

  // Handler: Follow-Up -> [Yes, Finished]
  const handleFollowUpFinished = async (taskId: string) => {
    const now = new Date();
    const currentTask = tasks.find((t) => t.id === taskId);

    // Calculate duration
    let durationStr = 'Completed on verification';
    if (currentTask?.inProgressStartedAt) {
      const startMs = new Date(currentTask.inProgressStartedAt).getTime();
      const diffMins = Math.max(Math.round((now.getTime() - startMs) / 60000), 1);
      if (diffMins >= 60) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = `Took ${hours}h ${mins}m from reminder`;
      } else {
        durationStr = `Took ${diffMins}m from reminder`;
      }
    }

    const updates: Partial<Task> = {
      status: 'COMPLETED',
      completedAt: now.toISOString(),
      completionSource: 'VERIFIED_FOLLOWUP',
      timeFromKickoffToComplete: durationStr,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setAlertModal({ isOpen: false, type: 'FOLLOWUP', task: null });

    if (soundEnabled) playSuccessChime();
    triggerConfettiCelebration();

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
        await supabaseRecordWin(taskId, currentTask?.title || 'Accountability Goal', durationStr);
      } catch (e) {
        console.warn('Sync verification error:', e);
      }
    }
  };

  // Handler: Follow-Up -> [No, Need More Time] (Contract Rule #1 & #2: PENDING with new kickoff + extensions_count++)
  const handleFollowUpExtend = async (
    taskId: string,
    extensionMinutes: number,
    label: string
  ) => {
    const now = new Date();
    const newKickoffTime = new Date(now.getTime() + extensionMinutes * 60 * 1000).toISOString();
    const currentTask = tasks.find((t) => t.id === taskId);
    const newExtensionsCount = (currentTask?.extensionsCount || 0) + 1;

    const updates: Partial<Task> = {
      status: 'PENDING',
      scheduledKickoffTime: newKickoffTime,
      followUpScheduledTime: undefined,
      extensionsCount: newExtensionsCount,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setAlertModal({ isOpen: false, type: 'FOLLOWUP', task: null });

    // Allow re-triggering kickoff when new time is reached
    triggeredFollowUpsRef.current.delete(taskId);
    triggeredKickoffsRef.current.delete(taskId);

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
        await supabaseCreateReminder(taskId, newKickoffTime, 'KICKOFF');
      } catch (e) {
        console.warn('Sync extension error:', e);
      }
    }
  };

  // Handler: Follow-Up -> Slipped
  const handleFollowUpSlipped = async (taskId: string, reason: string) => {
    const updates: Partial<Task> = {
      status: 'SLIPPED',
      slippedReason: reason || 'Follow-up check-in not completed',
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
    setAlertModal({ isOpen: false, type: 'FOLLOWUP', task: null });

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
      } catch (e) {
        console.warn('Sync slipped error:', e);
      }
    }
  };

  // Handler: Reschedule Slipped Task -> PENDING
  const handleRescheduleSlipped = async (taskId: string, extraMinutes: number) => {
    const now = new Date();
    const newKickoff = new Date(now.getTime() + extraMinutes * 60 * 1000).toISOString();

    const updates: Partial<Task> = {
      status: 'PENDING',
      scheduledKickoffTime: newKickoff,
      slippedReason: undefined,
    };

    triggeredKickoffsRef.current.delete(taskId);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );

    if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
      try {
        await supabaseUpdateTask(taskId, updates);
        await supabaseCreateReminder(taskId, newKickoff, 'KICKOFF');
      } catch (e) {
        console.warn('Sync reschedule error:', e);
      }
    }
  };

  // Notification Management Handlers
  const handleMarkNotifRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
  };

  const handleSelectTaskFromNotif = (taskId: string) => {
    setActiveTab('ACTION');
    setTimeout(() => {
      const el = document.getElementById(`inflight-card-${taskId}`) || 
                 document.getElementById(`slipped-card-${taskId}`) || 
                 document.getElementById(`pending-card-${taskId}`) ||
                 document.getElementById(`completed-card-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-indigo-400');
        setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-400'), 2500);
      }
    }, 150);
  };

  // Teammate Actions
  const handleSendTreatToTeammate = (partnerName: string) => {
    setTeammateForTreat(partnerName);
    setIsTreatModalOpen(true);
  };

  const handleNudgeTeammate = (partner: TeamPartner) => {
    if (soundEnabled) playFollowUpPing();
    if (voiceSpeechEnabled) {
      speakExecutivePrompt(`Sent high five to ${partner.name}!`);
    }
    triggerConfettiCelebration();

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `High-Five Sent! 👋`,
      message: `You nudged ${partner.name} on "${partner.currentTask || 'their goal'}".`,
      type: 'SYSTEM',
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };


  // Handler: Create Task from Phase 1 Voice Parser (or Manual)
  const handleTaskCreated = async (taskPayload: Partial<Task>) => {
    if (currentUser && isSupabaseConfigured()) {
      try {
        const created = await supabaseCreateTask(taskPayload);
        setTasks((prev) => [created, ...prev]);
        const newNotif: AppNotification = {
          id: `notif-${Date.now()}`,
          title: `Task Scheduled ⚡`,
          message: `Scheduled: "${created.title}"`,
          type: 'KICKOFF',
          timestamp: new Date().toISOString(),
          read: false,
          taskId: created.id,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        return;
      } catch (e) {
        console.warn('Supabase create task error:', e);
      }
    }

    // Local offline fallback
    const localTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: taskPayload.title || 'Untitled Goal',
      originalAudioSummary: taskPayload.originalAudioSummary || 'Voice recorded note',
      detectedLanguage: taskPayload.detectedLanguage || 'English',
      transcript: taskPayload.transcript || '',
      scheduledKickoffTime: taskPayload.scheduledKickoffTime || new Date().toISOString(),
      status: taskPayload.status || 'PENDING',
      checkinDelayMinutes: taskPayload.checkinDelayMinutes || 60,
      extensionsCount: 0,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [localTask, ...prev]);
  };

  // Handler: Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (currentUser && isSupabaseConfigured()) {
      try {
        await supabaseDeleteTask(taskId);
      } catch (e) {
        console.warn('Supabase delete task error:', e);
      }
    }
  };

  // Replay voice alert inside modal
  const handleReplayCurrentAlert = () => {
    if (!alertModal.task) return;
    if (alertModal.type === 'KICKOFF') {
      playKickoffChime();
      speakExecutivePrompt(`Time to work on: ${alertModal.task.title}`);
    } else {
      playFollowUpPing();
      speakExecutivePrompt(`Hey, did you finish ${alertModal.task.title}?`);
    }
  };

  const inFlightCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const slippedCount = tasks.filter((t) => t.status === 'SLIPPED').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const todayFormatted = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const handleSignOut = async () => {
    await supabaseSignOut();
    localStorage.removeItem('echoloop_user');
    setCurrentUser(null);
    setTasks([]);
  };

  // Render Auth Page if unauthenticated or explicitly opened
  if (!currentUser || currentView === 'AUTH') {
    return (
      <AuthPage
        initialMode="SIGN_IN"
        onAuthSuccess={(user, isNewSignup) => {
          setCurrentUser(user);
          setCurrentView('APP');
          loadCloudTasks();

          // Show interactive button tour for first-time signups or uninitiated users
          if (isNewSignup || !localStorage.getItem(`echoloop_tour_seen_${user.id}`)) {
            setIsTourOpen(true);
          }

          const welcomeNotif: AppNotification = {
            id: `notif-${Date.now()}`,
            title: `Welcome, ${user.name}! 👋`,
            message: `Signed in as ${user.email}. Cloud sync active.`,
            type: 'SYSTEM',
            timestamp: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [welcomeNotif, ...prev]);
        }}
        onBackToApp={() => setCurrentView('APP')}
      />
    );
  }

  return (

    <div className="min-h-screen max-w-full overflow-x-hidden bg-white text-zinc-900 flex flex-col antialiased relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Ambient Subtle Luminous Indigo & Violet Glow on White */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-96 overflow-hidden z-0">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-violet-100/30 rounded-full blur-3xl" />
      </div>

      {/* PWA Install Banner */}
      {installPrompt && showInstallBanner && (
        <div className="relative z-10 w-full max-w-full overflow-hidden bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 truncate mr-2 min-w-0">
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-100 shrink-0" />
            <span className="truncate font-medium text-[11px] sm:text-xs">Install EchoLoop for instant home screen voice capture</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="install-pwa-banner-btn"
              type="button"
              onClick={handleInstallClick}
              className="px-2 sm:px-2.5 py-1 bg-white text-indigo-700 font-semibold rounded-md text-[11px] sm:text-xs hover:bg-indigo-50 transition-colors shadow-2xs cursor-pointer"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setShowInstallBanner(false)}
              className="p-1 text-indigo-100 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss install banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* App Header with fully functional Bell, Team, and Profile controls */}
      <Header
        onOpenVoiceCapture={() => setIsVoiceModalOpen(true)}
        onOpenSendTreat={() => {
          setTeammateForTreat(null);
          setIsTreatModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        onOpenTeam={() => setIsTeamOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        user={currentUser}
        onOpenAuth={() => setCurrentView('AUTH')}
        onSignOut={handleSignOut}
        onInstallApp={handleInstallClick}
        canInstall={!!installPrompt}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        voiceSpeechEnabled={voiceSpeechEnabled}
        onToggleVoiceSpeech={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
        activeCount={pendingCount}
        inFlightCount={inFlightCount}
        slippedCount={slippedCount}
        completedCount={completedCount}
      />

      {/* Main Container - Optimized for mobile viewports without horizontal clipping */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8 pb-32 sm:pb-8 overflow-x-hidden">
        
        {/* Hero Banner Card: Clickable for Accountability Insights & Streak Modal */}
        <div 
          id="hero-banner-ledger-card"
          onClick={() => setIsStatsOpen(true)}
          title="Click to view Accountability Insights & Streak Breakdown"
          className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-50/90 via-violet-50/70 to-purple-50/80 border border-indigo-100/90 hover:border-indigo-200 p-4 sm:p-7 flex items-center justify-between shadow-xs cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div className="space-y-0.5 sm:space-y-1 z-10 flex-1 min-w-0 pr-2 sm:pr-4">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider truncate">
                {todayFormatted}
              </p>
              <span className="text-[9px] sm:text-[10px] bg-indigo-100/90 text-indigo-950 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                📊 Insights
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight group-hover:text-indigo-950 transition-colors">
              Accountability Ledger
            </h2>
            <p className="text-[11px] sm:text-sm text-zinc-500 font-normal truncate sm:whitespace-normal">
              Make progress, one check-in at a time. <span className="text-indigo-600 font-semibold group-hover:underline">Tap for stats</span>
            </p>
          </div>

          {/* 3D Stylized Progress Bars Graphic in electric indigo/violet */}
          <div className="relative shrink-0 w-20 h-18 sm:w-28 sm:h-24 rounded-2xl bg-white/90 group-hover:bg-white backdrop-blur-md border border-zinc-200/80 shadow-sm flex items-end justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 transition-all">
            <div className="w-2.5 sm:w-3 h-6 sm:h-7 bg-indigo-200 rounded-full" />
            <div className="w-2.5 sm:w-3 h-9 sm:h-11 bg-indigo-400 rounded-full" />
            <div className="w-3 sm:w-3.5 h-13 sm:h-15 bg-linear-to-t from-indigo-600 via-indigo-600 to-violet-600 rounded-full shadow-xs group-hover:scale-105 transition-transform" />
          </div>
        </div>

        {/* View Switcher (Desktop) */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-100/90 backdrop-blur-md p-1 rounded-2xl text-xs font-semibold border border-zinc-200/70">
            <button
              id="tab-all-btn"
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs border border-indigo-200/60'
                  : 'text-zinc-600 hover:text-indigo-700'
              }`}
            >
              Side-by-Side
            </button>

            <button
              id="tab-action-btn"
              type="button"
              onClick={() => setActiveTab('ACTION')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'ACTION'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs border border-indigo-200/60'
                  : 'text-zinc-600 hover:text-indigo-700'
              }`}
            >
              Queue ({inFlightCount + pendingCount + slippedCount})
            </button>

            <button
              id="tab-wins-btn"
              type="button"
              onClick={() => setActiveTab('WINS')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'WINS'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs border border-indigo-200/60'
                  : 'text-zinc-600 hover:text-indigo-700'
              }`}
            >
              Wins ({completedCount})
            </button>
          </div>
        </div>

        {/* Dual View Layout */}
        {(activeTab === 'ALL' || activeTab === 'ACTION') && (
          <div className={`${activeTab === 'ALL' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start' : 'max-w-2xl mx-auto'}`}>
            
            {/* Action Queue Column */}
            <div>
              <ActionBoard
                tasks={tasks}
                currentTime={currentTime}
                onTriggerKickoffNow={handleTriggerKickoffNow}
                onTriggerFollowUpNow={handleTriggerFollowUpNow}
                onMarkAlreadyDone={handleKickoffAlreadyDone}
                onMarkCompleted={handleFollowUpFinished}
                onRescheduleSlipped={handleRescheduleSlipped}
                onDeleteTask={handleDeleteTask}
                onOpenVoiceCapture={() => setIsVoiceModalOpen(true)}
                onFireConfetti={triggerConfettiCelebration}
              />
            </div>

            {/* Wins Archive Column (Only rendered side-by-side if ALL on desktop) */}
            {activeTab === 'ALL' && (
              <div className="hidden lg:block">
                <WinsArchive
                  tasks={tasks}
                  onDeleteTask={handleDeleteTask}
                  onFireConfetti={triggerConfettiCelebration}
                  onOpenSendTreat={() => {
                    setTeammateForTreat(null);
                    setIsTreatModalOpen(true);
                  }}
                />
              </div>
            )}

          </div>
        )}

        {activeTab === 'WINS' && (
          <div className="max-w-2xl mx-auto">
            <WinsArchive
              tasks={tasks}
              onDeleteTask={handleDeleteTask}
              onFireConfetti={triggerConfettiCelebration}
              onOpenSendTreat={() => {
                setTeammateForTreat(null);
                setIsTreatModalOpen(true);
              }}
            />
          </div>
        )}

      </main>

      {/* Phase 1: Voice Capture Modal */}
      <VoiceCaptureModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Phase 2: Active Alert Modal */}
      <ActiveAlertModal
        isOpen={alertModal.isOpen}
        type={alertModal.type}
        task={alertModal.task}
        onKickoffOnIt={handleKickoffOnIt}
        onKickoffAlreadyDone={handleKickoffAlreadyDone}
        onFollowUpFinished={handleFollowUpFinished}
        onFollowUpExtend={handleFollowUpExtend}
        onFollowUpSlipped={handleFollowUpSlipped}
        onClose={() => setAlertModal({ isOpen: false, type: 'KICKOFF', task: null })}
        onReplayAudioAlert={handleReplayCurrentAlert}
      />

      {/* Send a Treat Modal (₹100, ₹200, ₹300, ₹500, Custom) */}
      <SendTreatModal
        isOpen={isTreatModalOpen}
        onClose={() => {
          setIsTreatModalOpen(false);
          setTeammateForTreat(null);
        }}
        recipientName={teammateForTreat || undefined}
        onTreatSent={async (_treat) => {
          if (currentUser?.accountType === 'STANDARD' && isSupabaseConfigured()) {
            try {
              await supabaseCreateTreat(_treat);
            } catch (e) {
              console.warn('Sync treat error:', e);
            }
          }
          const newNotif: AppNotification = {
            id: `notif-${Date.now()}`,
            title: `Treat Sent! ☕`,
            message: `Sent ₹${_treat.amount} ${_treat.label} to celebrate!`,
            type: 'TREAT',
            timestamp: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [newNotif, ...prev]);
        }}
        onCelebrationChime={() => {
          if (soundEnabled) playSuccessChime();
        }}
        onConfetti={triggerConfettiCelebration}
      />

      {/* Notifications Drawer/Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllAsRead={handleMarkAllNotifsRead}
        onClearAll={handleClearAllNotifs}
        onSelectTask={handleSelectTaskFromNotif}
      />

      {/* Accountability Team / Circle Modal */}
      <TeamModal
        isOpen={isTeamOpen}
        onClose={() => setIsTeamOpen(false)}
        onSendTreatToTeammate={handleSendTreatToTeammate}
        onNudgeTeammate={handleNudgeTeammate}
      />

      {/* Accountability Insights & Stats Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        completedCount={completedCount}
        inFlightCount={inFlightCount}
        slippedCount={slippedCount}
        pendingCount={pendingCount}
        totalTreatsAmount={400}
        onFireConfetti={triggerConfettiCelebration}
      />

      {/* Profile Onboarding / Setup Modal */}
      {currentUser && (
        <ProfileSetupModal
          isOpen={isProfileSetupOpen}
          user={currentUser}
          onSaveProfile={async (updates) => {
            if (!currentUser) return;
            try {
              const updated = await supabaseUpdateProfile(currentUser.id, updates);
              if (updated) {
                setCurrentUser(updated);
                try {
                  localStorage.setItem('echoloop_user', JSON.stringify(updated));
                  localStorage.setItem(`echoloop_profile_completed_${currentUser.id}`, 'true');
                } catch {}
              } else {
                const localUpdated = { ...currentUser, ...updates };
                setCurrentUser(localUpdated);
                try {
                  localStorage.setItem('echoloop_user', JSON.stringify(localUpdated));
                  localStorage.setItem(`echoloop_profile_completed_${currentUser.id}`, 'true');
                } catch {}
              }
              setIsProfileSetupOpen(false);
            } catch (e: any) {
              console.warn('Profile update error:', e);
              throw e;
            }
          }}
          onDismiss={() => setIsProfileSetupOpen(false)}
        />
      )}

      {/* First-Time Signup & Interactive Feature Tour Modal */}
      <FeatureTourModal
        isOpen={isTourOpen}
        onClose={() => {
          setIsTourOpen(false);
          if (currentUser) {
            try {
              localStorage.setItem(`echoloop_tour_seen_${currentUser.id}`, 'true');
            } catch {}
          }
        }}
      />

      {/* Second Brain AI Chat Modal */}
      <SecondBrainChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        tasks={tasks}
        onSelectTask={(task) => {
          setIsChatOpen(false);
          if (task.status === 'COMPLETED') {
            setActiveTab('WINS');
          } else {
            setActiveTab('ACTION');
          }
        }}
      />

      {/* Floating Second Brain FAB (Mobile: bottom right above navigation) */}
      <div className="sm:hidden fixed bottom-20 right-4 z-40">
        <button
          id="mobile-floating-second-brain-btn"
          type="button"
          onClick={() => setIsChatOpen(true)}
          title="Ask Second Brain"
          className="h-11 px-3.5 rounded-full bg-white/95 text-violet-800 border border-violet-200/90 shadow-lg shadow-violet-500/15 backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer text-xs font-bold ring-2 ring-violet-50"
        >
          <Brain className="w-4 h-4 text-violet-600 animate-pulse" />
          <span>Ask Brain</span>
        </button>
      </div>

      {/* Floating Action Buttons (Desktop only - mobile has centered BottomNav button) */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-20 items-center gap-2.5">
        <button
          id="floating-second-brain-btn"
          type="button"
          onClick={() => setIsChatOpen(true)}
          title="Ask Second Brain: recall what you did on any date, slipped goals, and streaks"
          className="h-12 px-4 rounded-full bg-white hover:bg-violet-50/80 text-violet-900 border border-violet-200/90 shadow-xl shadow-violet-500/10 ring-4 ring-violet-50/80 flex items-center gap-2 transition-all active:scale-95 cursor-pointer font-semibold text-xs"
        >
          <Brain className="w-4 h-4 text-violet-600 animate-pulse" />
          <span>Ask Second Brain</span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        </button>

        <button
          id="floating-voice-record-btn"
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          title="Record voice note"
          className="h-12 px-4 rounded-full bg-linear-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-100 flex items-center gap-2 transition-all active:scale-95 cursor-pointer font-medium"
        >
          <Mic className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold pr-1">Voice Note</span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenVoiceCapture={() => setIsVoiceModalOpen(true)}
        actionCount={inFlightCount + pendingCount + slippedCount}
        inFlightCount={inFlightCount}
        completedCount={completedCount}
      />

    </div>
  );
}
