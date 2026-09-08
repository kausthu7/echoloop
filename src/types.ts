export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SLIPPED' | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  originalAudioSummary: string;
  detectedLanguage?: string;
  transcript?: string;
  scheduledKickoffTime: string; // ISO string
  status: TaskStatus;
  checkinDelayMinutes: number; // e.g. 60 to 120 minutes
  inProgressStartedAt?: string; // ISO string when user pressed "On It"
  followUpScheduledTime?: string; // ISO string when follow-up triggers
  completedAt?: string; // ISO string when user confirmed "Yes, Finished" or "Already Done"
  completionSource?: 'ALREADY_DONE' | 'VERIFIED_FOLLOWUP' | 'MANUAL';
  timeFromKickoffToComplete?: string; // e.g. "Took 1h 45m from reminder"
  slippedReason?: string;
  extensionsCount: number;
  lastFollowUpPrompt?: string;
  createdAt: string;
}

export interface ParseVoiceResult {
  task_title: string;
  original_audio_summary: string;
  scheduled_time: string;
  default_checkin_delay_minutes: number;
  detected_language?: string;
  confidence_notes?: string;
}

export interface ActiveAlertModalState {
  isOpen: boolean;
  type: 'KICKOFF' | 'FOLLOWUP';
  task: Task | null;
}

export interface TreatRecord {
  id: string;
  amount: number;
  label: string;
  emoji: string;
  customNote?: string;
  paymentMethod: 'UPI' | 'GPAY' | 'PHONEPE' | 'PAYTM' | 'CARD';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  accountType?: 'STANDARD' | 'GOOGLE';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  message?: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'KICKOFF' | 'FOLLOWUP' | 'TREAT' | 'SLIPPED' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  taskId?: string;
}

export interface TeamPartner {
  id: string;
  name: string;
  avatar: string;
  role: string;
  currentTask?: string;
  status: 'FOCUSING' | 'COMPLETED' | 'BREAK' | 'IDLE';
  tasksCompletedToday: number;
  streakDays: number;
  lastActive: string;
}


