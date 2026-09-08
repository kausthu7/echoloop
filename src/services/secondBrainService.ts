import { Task, BrainChatResponse, SecondBrainMemory, MemoryCategory, ExtractedEntities } from '../types';

export interface ChatQueryPayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  tasks: Task[];
  memories?: SecondBrainMemory[];
}

/**
 * Intelligent client-side fallback engine if server or Gemini is unreachable or rate-limited.
 * Accurately parses date lookups, debts/loans inquiries, memory recall, and status breakdowns.
 */
export function analyzeTasksLocally(
  query: string,
  tasks: Task[],
  memories: SecondBrainMemory[] = []
): BrainChatResponse {
  const q = query.toLowerCase().trim();
  const referencedIds: string[] = [];
  const referencedMemoryIds: string[] = [];

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

  const monthDayMatch = q.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const dayMonthMatch = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);

  // =========================================================================
  // 1. FINANCIAL DEBTS / LOANS / MONEY OWED INQUIRY (RECALL INTENT)
  // =========================================================================
  const isDebtQuery =
    q.includes('give money to me') ||
    q.includes('give money') ||
    q.includes('owe me') ||
    q.includes('owes me') ||
    q.includes('money owed') ||
    q.includes('who owes') ||
    q.includes('did someone have to give') ||
    q.includes('someone has to give') ||
    q.includes('anyone has to give') ||
    q.includes('lent money') ||
    q.includes('did i lend') ||
    q.includes('borrowed money');

  if (isDebtQuery) {
    const debtMemories = memories.filter((m) => {
      if (m.category === 'FINANCIAL_DEBT') return true;
      if (m.entities?.direction === 'OWED_TO_ME') return true;
      const contentLower = (m.content + ' ' + (m.rawText || '')).toLowerCase();
      return (
        contentLower.includes('rs') ||
        contentLower.includes('₹') ||
        contentLower.includes('$') ||
        contentLower.includes('give') ||
        contentLower.includes('gave') ||
        contentLower.includes('lent') ||
        contentLower.includes('borrow') ||
        contentLower.includes('owe')
      );
    });

    if (debtMemories.length === 0) {
      return {
        reply: `### 💰 **Money Owed to You**\n\nAccording to your Second Brain memories, **no one is currently recorded as owing you money**.\n\nWhenever you lend money or someone owes you, simply tell the chat:\n> *"On Sept 4th I gave 500rs to someone"*\n...and I'll remember it for you!`,
        referencedTaskIds: [],
        referencedMemoryIds: [],
      };
    }

    debtMemories.forEach((m) => referencedMemoryIds.push(m.id));

    let reply = `### 💰 **Money Owed to You**\n\nYes! According to your Second Brain memory ledger, here is what is recorded:\n\n`;
    debtMemories.forEach((m) => {
      const person = m.entities?.person || 'Someone';
      const amount = m.entities?.amount || 'the recorded amount';
      let dateStr = '';
      if (m.eventDate) {
        try {
          dateStr = new Date(m.eventDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
          dateStr = m.eventDate;
        }
      }

      reply += `- **${person}** owes you **${amount}**${dateStr ? ` (given on ${dateStr})` : ''}.\n  *Record: "${m.content}"*\n`;
    });

    reply += `\n*Your Second Brain has ${debtMemories.length} debt record(s) on file.*`;
    return { reply, referencedTaskIds: [], referencedMemoryIds };
  }

  // =========================================================================
  // 2. GENERAL MEMORY INSPECTION INQUIRY
  // =========================================================================
  if (
    q.includes('what did you remember') ||
    q.includes('what do you remember') ||
    q.includes('show memories') ||
    q.includes('all memories') ||
    q.includes('list memories') ||
    q.includes('my notes')
  ) {
    if (memories.length === 0) {
      return {
        reply: `### 🧠 **Second Brain Long-Term Memory**\n\nYour memory ledger is currently empty. You can tell me anything to remember anytime!\n\nExamples:\n- *"On Sept 4th I gave 500rs to Alex"*\n- *"Remember my passport is in the top desk drawer"*\n- *"Sarah's birthday is on October 12th"*`,
        referencedTaskIds: [],
        referencedMemoryIds: [],
      };
    }

    memories.forEach((m) => referencedMemoryIds.push(m.id));

    let reply = `### 🧠 **Your Second Brain Memories (${memories.length})**\n\nHere is everything currently remembered in your ledger:\n\n`;
    memories.forEach((m) => {
      const icon =
        m.category === 'FINANCIAL_DEBT' ? '💰' : m.category === 'NOTE' ? '📝' : m.category === 'PROMISE' ? '🎯' : '💡';
      reply += `- ${icon} **${m.content}**\n`;
    });

    return { reply, referencedTaskIds: [], referencedMemoryIds };
  }

  // =========================================================================
  // 3. MEMORY STORAGE INTENT (e.g. "on sept 4th user give 500rs to someone", "remember...")
  // =========================================================================
  const isStoreIntent =
    q.startsWith('remember') ||
    q.startsWith('note that') ||
    q.startsWith('don\'t forget') ||
    q.includes('i gave') ||
    q.includes('user give') ||
    q.includes('give 500') ||
    q.includes('gave') ||
    q.includes('lent') ||
    q.includes('borrowed');

  if (isStoreIntent) {
    // 1. Currency amount match
    const currencyMatch = q.match(/(?:(?:rs|inr|₹|\$|usd|eur|£)\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:rs|inr|rupees|bucks|\$|dollars|euros|cents))/i);
    let amount = currencyMatch ? currencyMatch[0].trim() : undefined;
    if (!amount) {
      const standaloneNum = q.match(/\b(\d{2,6})\b/);
      if (standaloneNum) amount = `${standaloneNum[1]}rs`;
    }

    // 2. Person match
    const toPersonMatch = q.match(/(?:to|from)\s+([a-zA-Z]+)/i);
    let person = 'Someone';
    if (toPersonMatch) {
      const candidate = toPersonMatch[1].toLowerCase();
      if (!['me', 'him', 'her', 'them', 'my', 'the'].includes(candidate)) {
        person = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    // 3. Date match
    let eventDate: string | undefined;
    const currentYear = new Date().getFullYear();
    if (monthDayMatch) {
      const monthNum = monthMap[monthDayMatch[1].slice(0, 3)];
      const dayNum = monthDayMatch[2].padStart(2, '0');
      eventDate = `${currentYear}-${monthNum}-${dayNum}`;
    } else if (dayMonthMatch) {
      const monthNum = monthMap[dayMonthMatch[2].slice(0, 3)];
      const dayNum = dayMonthMatch[1].padStart(2, '0');
      eventDate = `${currentYear}-${monthNum}-${dayNum}`;
    }

    const isMoney = Boolean(amount && (q.includes('give') || q.includes('gave') || q.includes('lent') || q.includes('borrow') || q.includes('rs') || q.includes('₹') || q.includes('$')));
    const category: MemoryCategory = isMoney ? 'FINANCIAL_DEBT' : 'NOTE';
    const cleanedContent = query.replace(/^remember(?:\s+that)?[:\s]*/i, '').trim();

    let structuredSummary = cleanedContent || query;
    if (isMoney && amount) {
      structuredSummary = `Gave ${amount} to ${person}${eventDate ? ` on ${eventDate}` : ''} (${person} owes ${amount})`;
    }

    const newMemoryToSave = {
      content: structuredSummary,
      category,
      eventDate,
      entities: isMoney
        ? {
            person,
            amount: amount || '500rs',
            direction: 'OWED_TO_ME' as const,
          }
        : {},
    };

    return {
      reply: `### 🧠 **Remembered!**\n\nI have securely logged this in your **Second Brain Memory Ledger**:\n> *"${structuredSummary}"*\n\nWhenever you ask me about this in the future (even days or months from now), I will recall it for you accurately!`,
      referencedTaskIds: [],
      referencedMemoryIds: [],
      newMemoryToSave,
    };
  }

  // =========================================================================
  // 4. DATE LOOKUP REGEX PATTERNS (Task Ledger)
  // =========================================================================
  let targetDateString: string | null = null;
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

  if (targetDateString) {
    const matchingTasks = tasks.filter((t) => {
      const dates = [t.completedAt, t.scheduledKickoffTime, t.createdAt, t.inProgressStartedAt].filter(Boolean) as string[];
      return dates.some((d) => d.includes(targetDateString!));
    });

    if (matchingTasks.length === 0) {
      return {
        reply: `### 📅 Ledger Lookup for **${readableTarget}**\n\nNo tasks were recorded in your EchoLoop ledger for **${readableTarget}**.\n\nYou have **${tasks.length} total tasks** logged overall. Would you like me to summarize your recent completed tasks or check another date?`,
        referencedTaskIds: [],
        referencedMemoryIds: [],
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
    return { reply, referencedTaskIds: referencedIds, referencedMemoryIds: [] };
  }

  // =========================================================================
  // 5. SLIPPED / MISSED TASKS INQUIRY
  // =========================================================================
  if (q.includes('slip') || q.includes('miss') || q.includes('fail') || q.includes('didn\'t do') || q.includes('did not do')) {
    const slipped = tasks.filter((t) => t.status === 'SLIPPED');
    slipped.forEach((t) => referencedIds.push(t.id));

    if (slipped.length === 0) {
      return {
        reply: `### 🎉 Clean Record!\n\nYou have **0 slipped tasks** recorded in your ledger. Everything scheduled has either been completed or is actively pending kickoff!`,
        referencedTaskIds: [],
        referencedMemoryIds: [],
      };
    }

    let reply = `### ⚠️ **Slipped Tasks Summary (${slipped.length})**\n\nHere are the tasks that were missed or slipped:\n\n`;
    slipped.forEach((t) => {
      const scheduled = t.scheduledKickoffTime ? new Date(t.scheduledKickoffTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date';
      const reason = t.slippedReason ? `\n  - *Notes: ${t.slippedReason}*` : '';
      reply += `- **${t.title}** (Scheduled for ${scheduled})${reason}\n`;
    });
    reply += `\n*Need to reschedule any of these? You can re-trigger them anytime with voice!*`;
    return { reply, referencedTaskIds: referencedIds, referencedMemoryIds: [] };
  }

  // =========================================================================
  // 6. COMPLETED / ACCOMPLISHMENT INQUIRY
  // =========================================================================
  if (q.includes('completed') || q.includes('done') || q.includes('accomplish') || q.includes('wins')) {
    const completed = tasks.filter((t) => t.status === 'COMPLETED');
    completed.forEach((t) => referencedIds.push(t.id));

    if (completed.length === 0) {
      return {
        reply: `### ⚡ No Completed Wins Yet\n\nYou haven't marked any tasks as completed yet. Speak a task into the microphone or click "+ Add Task" to build your momentum!`,
        referencedTaskIds: [],
        referencedMemoryIds: [],
      };
    }

    let reply = `### 🏆 **Completed Wins (${completed.length} Total)**\n\nHere are your recent verified wins:\n\n`;
    completed.slice(-6).reverse().forEach((t) => {
      const finishDate = t.completedAt ? new Date(t.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
      reply += `- **${t.title}** ${finishDate ? `• *Finished on ${finishDate}*` : ''}\n`;
    });
    return { reply, referencedTaskIds: referencedIds, referencedMemoryIds: [] };
  }

  // =========================================================================
  // 7. DEFAULT GENERAL SNAPSHOT
  // =========================================================================
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const slipped = tasks.filter((t) => t.status === 'SLIPPED');
  const active = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const pending = tasks.filter((t) => t.status === 'PENDING');

  return {
    reply: `### 🧠 **EchoLoop Second Brain Snapshot**\n\nHere is where your second brain currently stands:\n\n` +
      `- 🏆 **Completed Wins:** ${completed.length}\n` +
      `- ⏳ **In Progress:** ${active.length}\n` +
      `- 🕒 **Pending Kickoffs:** ${pending.length}\n` +
      `- ⚠️ **Slipped Tasks:** ${slipped.length}\n` +
      `- 💾 **Long-Term Memories Stored:** ${memories.length}\n\n` +
      `You can tell me anything to remember (*"on Sept 4th I gave 500rs to Alex"*), ask about debts (*"did someone have to give money to me?"*), or check specific dates (*"What did I do on Aug 3?"*) anytime!`,
    referencedTaskIds: [],
    referencedMemoryIds: [],
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

  const memories = payload.memories || [];

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
        memories,
        timezone,
        timezoneOffset,
        localDate,
        userLocalTime,
        currentDayOfWeek,
      }),
    });

    if (!response.ok) {
      console.warn(`[SecondBrain] Server returned ${response.status}. Using smart local fallback.`);
      return analyzeTasksLocally(payload.message, payload.tasks, memories);
    }

    const data = await response.json();
    if (data && data.reply) {
      return data as BrainChatResponse;
    }

    return analyzeTasksLocally(payload.message, payload.tasks, memories);
  } catch (err) {
    console.warn('[SecondBrain] Network or API failure. Using smart local fallback.', err);
    return analyzeTasksLocally(payload.message, payload.tasks, memories);
  }
}
