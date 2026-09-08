import { Task, BrainChatResponse } from '../types';

export interface ChatQueryPayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  tasks: Task[];
}

/**
 * Intelligent client-side fallback engine if server or Gemini is unreachable.
 * Accurately parses date lookups (e.g. "Aug 3", "yesterday", "today") and status breakdowns.
 */
export function analyzeTasksLocally(query: string, tasks: Task[]): BrainChatResponse {
  const q = query.toLowerCase().trim();
  const referencedIds: string[] = [];

  // 1. Date lookup regex patterns (e.g., "aug 3", "august 3", "aug 3rd", "august 03", "3 aug", "2026-08-03", etc.)
  const monthMap: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  // Match month + day (e.g. "aug 3", "august 3rd", "3 aug")
  const monthDayMatch = q.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const dayMonthMatch = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);

  let targetDateString: string | null = null; // YYYY-MM-DD or MM-DD
  let readableTarget = '';

  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].slice(0, 3);
    const monthNum = monthMap[monthKey];
    const dayNum = monthDayMatch[2].padStart(2, '0');
    targetDateString = `-${monthNum}-${dayNum}`;
    readableTarget = `${monthDayMatch[1].charAt(0).toUpperCase() + monthDayMatch[1].slice(1)} ${parseInt(monthDayMatch[2], 10)}`;
  } else if (dayMonthMatch) {
    const monthKey = dayMonthMatch[2].slice(0, 3);
    const monthNum = monthMap[monthKey];
    const dayNum = dayMonthMatch[1].padStart(2, '0');
    targetDateString = `-${monthNum}-${dayNum}`;
    readableTarget = `${dayMonthMatch[2].charAt(0).toUpperCase() + dayMonthMatch[2].slice(1)} ${parseInt(dayMonthMatch[1], 10)}`;
  } else if (q.includes('today')) {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    targetDateString = `-${m}-${d}`;
    readableTarget = 'Today';
  } else if (q.includes('yesterday')) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    targetDateString = `-${m}-${d}`;
    readableTarget = 'Yesterday';
  }

  // If user queried a specific date:
  if (targetDateString) {
    const matchingTasks = tasks.filter((t) => {
      const dates = [t.completedAt, t.scheduledKickoffTime, t.createdAt, t.inProgressStartedAt].filter(Boolean) as string[];
      return dates.some((d) => d.includes(targetDateString!));
    });

    if (matchingTasks.length === 0) {
      return {
        reply: `### 📅 Ledger Lookup for **${readableTarget}**\n\nNo tasks were recorded in your EchoLoop ledger for **${readableTarget}**.\n\nYou have **${tasks.length} total tasks** logged overall. Would you like me to summarize your recent completed tasks or check another date?`,
        referencedTaskIds: [],
      };
    }

    const completed = matchingTasks.filter((t) => t.status === 'COMPLETED');
    const slipped = matchingTasks.filter((t) => t.status === 'SLIPPED');
    const active = matchingTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING');

    matchingTasks.forEach((t) => referencedIds.push(t.id));

    let reply = `### 📅 Tasks on **${readableTarget}**\n\n`;

    if (completed.length > 0) {
      reply += `#### ✅ **Completed (${completed.length})**\n`;
      completed.forEach((t) => {
        const timeStr = t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const dur = t.timeFromKickoffToComplete ? ` • *${t.timeFromKickoffToComplete}*` : '';
        reply += `- **${t.title}**${timeStr ? ` (Finished at ${timeStr})` : ''}${dur}\n`;
      });
      reply += '\n';
    }

    if (slipped.length > 0) {
      reply += `#### ⚠️ **Slipped or Incomplete (${slipped.length})**\n`;
      slipped.forEach((t) => {
        const reason = t.slippedReason ? ` — *Reason: ${t.slippedReason}*` : '';
        reply += `- **${t.title}**${reason}\n`;
      });
      reply += '\n';
    }

    if (active.length > 0) {
      reply += `#### ⏳ **In Progress / Pending (${active.length})**\n`;
      active.forEach((t) => {
        reply += `- **${t.title}** (${t.status.replace('_', ' ')})\n`;
      });
      reply += '\n';
    }

    reply += `*EchoLoop Second Brain found ${matchingTasks.length} record(s) for ${readableTarget}.*`;
    return { reply, referencedTaskIds: referencedIds };
  }

  // 2. Slipped / Missed Tasks inquiry
  if (q.includes('slip') || q.includes('miss') || q.includes('fail') || q.includes('didn\'t do') || q.includes('did not do')) {
    const slipped = tasks.filter((t) => t.status === 'SLIPPED');
    slipped.forEach((t) => referencedIds.push(t.id));

    if (slipped.length === 0) {
      return {
        reply: `### 🎉 Clean Record!\n\nYou have **0 slipped tasks** recorded in your ledger. Everything scheduled has either been completed or is actively pending kickoff!`,
        referencedTaskIds: [],
      };
    }

    let reply = `### ⚠️ **Slipped Tasks Summary (${slipped.length})**\n\nHere are the tasks that were missed or slipped:\n\n`;
    slipped.forEach((t) => {
      const scheduled = t.scheduledKickoffTime ? new Date(t.scheduledKickoffTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date';
      const reason = t.slippedReason ? `\n  - *Notes: ${t.slippedReason}*` : '';
      reply += `- **${t.title}** (Scheduled for ${scheduled})${reason}\n`;
    });
    reply += `\n*Need to reschedule any of these? You can re-trigger them anytime with voice!*`;
    return { reply, referencedTaskIds: referencedIds };
  }

  // 3. Completed / Accomplishment inquiry
  if (q.includes('completed') || q.includes('done') || q.includes('accomplish') || q.includes('wins')) {
    const completed = tasks.filter((t) => t.status === 'COMPLETED');
    completed.forEach((t) => referencedIds.push(t.id));

    if (completed.length === 0) {
      return {
        reply: `### ⚡ No Completed Wins Yet\n\nYou haven't marked any tasks as completed yet. Speak a task into the microphone or click "+ Add Task" to build your momentum!`,
        referencedTaskIds: [],
      };
    }

    let reply = `### 🏆 **Completed Wins (${completed.length} Total)**\n\nHere are your recent verified wins:\n\n`;
    completed.slice(-6).reverse().forEach((t) => {
      const finishDate = t.completedAt ? new Date(t.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
      reply += `- **${t.title}** ${finishDate ? `• *Finished on ${finishDate}*` : ''}\n`;
    });
    return { reply, referencedTaskIds: referencedIds };
  }

  // 4. Default general summary
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const slipped = tasks.filter((t) => t.status === 'SLIPPED');
  const active = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const pending = tasks.filter((t) => t.status === 'PENDING');

  return {
    reply: `### 🧠 **EchoLoop Second Brain Snapshot**\n\nHere is where your accountability ledger currently stands:\n\n` +
      `- 🏆 **Completed Wins:** ${completed.length}\n` +
      `- ⏳ **In Progress:** ${active.length}\n` +
      `- 🕒 **Pending Kickoffs:** ${pending.length}\n` +
      `- ⚠️ **Slipped Tasks:** ${slipped.length}\n\n` +
      `You can ask me specific dates like **"What did I do on Aug 3?"**, **"What did I finish yesterday?"**, or **"Show my slipped tasks"** anytime!`,
    referencedTaskIds: [],
  };
}

/**
 * Sends a query to the Second Brain AI Chat endpoint, falling back to local heuristic analysis if offline.
 */
export async function querySecondBrainChat(payload: ChatQueryPayload): Promise<BrainChatResponse> {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  const timezoneOffset = `${sign}${hours}:${minutes}`;
  const localDate = now.toISOString().split('T')[0];
  const userLocalTime = now.toISOString();
  const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: payload.message,
        history: payload.history,
        tasks: payload.tasks,
        timezone,
        timezoneOffset,
        localDate,
        userLocalTime,
        currentDayOfWeek,
      }),
    });

    if (!response.ok) {
      console.warn(`[SecondBrain] Server returned ${response.status}. Using smart local fallback.`);
      return analyzeTasksLocally(payload.message, payload.tasks);
    }

    const data = await response.json();
    if (data && data.reply) {
      return data as BrainChatResponse;
    }

    return analyzeTasksLocally(payload.message, payload.tasks);
  } catch (err) {
    console.warn('[SecondBrain] Network or API failure. Using smart local fallback.', err);
    return analyzeTasksLocally(payload.message, payload.tasks);
  }
}
