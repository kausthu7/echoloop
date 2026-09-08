-- ==============================================================================
-- EchoLoop Production Database Schema & Row Level Security (RLS)
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'Founder & Creator',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. TASKS TABLE (Core Accountability Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_audio_summary TEXT NOT NULL DEFAULT '',
  detected_language TEXT DEFAULT 'English',
  transcript TEXT DEFAULT '',
  scheduled_kickoff_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SLIPPED', 'COMPLETED')),
  checkin_delay_minutes INTEGER NOT NULL DEFAULT 60,
  in_progress_started_at TIMESTAMPTZ,
  follow_up_scheduled_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_source TEXT CHECK (completion_source IN ('ALREADY_DONE', 'VERIFIED_FOLLOWUP', 'MANUAL')),
  time_from_kickoff_to_complete TEXT,
  slipped_reason TEXT,
  extensions_count INTEGER NOT NULL DEFAULT 0,
  last_follow_up_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. CHECK-INS TABLE (Two-Tier Check-in Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('KICKOFF', 'FOLLOWUP')),
  response TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. REMINDERS TABLE (Kickoff & Follow-Up Alert Queue)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('KICKOFF', 'FOLLOWUP')),
  triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. WINS TABLE (Celebratory Archive for Completed Goals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  time_to_complete TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. TREATS TABLE (Peer Accountability Rewards Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  custom_note TEXT,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. SECOND BRAIN MEMORIES TABLE (Long-term Episodic & Contextual Memory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.second_brain_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('FINANCIAL_DEBT', 'NOTE', 'PROMISE', 'PERSONAL_FACT', 'GENERAL')),
  event_date TIMESTAMPTZ,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_kickoff ON public.tasks(scheduled_kickoff_time);
CREATE INDEX IF NOT EXISTS idx_check_ins_task ON public.check_ins(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON public.reminders(user_id, scheduled_time, triggered);
CREATE INDEX IF NOT EXISTS idx_wins_user ON public.wins(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_treats_user ON public.treats(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user ON public.second_brain_memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_category ON public.second_brain_memories(user_id, category);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user isolation & child-record ownership verification
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.second_brain_memories ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Tasks Policies
CREATE POLICY "Users can select own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Check-ins Policies (Enforces parent task ownership)
CREATE POLICY "Users can select own check-ins" ON public.check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert check-ins for own tasks" ON public.check_ins
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE public.tasks.id = task_id AND public.tasks.user_id = auth.uid())
  );

-- 4. Reminders Policies (Enforces parent task ownership)
CREATE POLICY "Users can select own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert reminders for own tasks" ON public.reminders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE public.tasks.id = task_id AND public.tasks.user_id = auth.uid())
  );

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Wins Policies (Enforces parent task ownership)
CREATE POLICY "Users can select own wins" ON public.wins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert wins for own tasks" ON public.wins
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE public.tasks.id = task_id AND public.tasks.user_id = auth.uid())
  );

-- 6. Treats Policies
CREATE POLICY "Users can select own treats" ON public.treats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own treats" ON public.treats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Second Brain Memories Policies
CREATE POLICY "Users can select own memories" ON public.second_brain_memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON public.second_brain_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON public.second_brain_memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON public.second_brain_memories
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Founder & Creator'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
