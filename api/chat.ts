import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

interface ServerlessRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  socket: { remoteAddress?: string };
}

interface ServerlessResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ServerlessResponse;
  json(data: any): void;
  end(): void;
}

// In-memory sliding window rate limiter for serverless instance
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30; // 30 queries per minute

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawAuth = req.headers.authorization;
    const authHeader = typeof rawAuth === 'string' ? rawAuth : Array.isArray(rawAuth) ? rawAuth[0] : '';
    let verifiedUserId: string | null = null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        verifiedUserId = user.id;
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
    const rateLimitIdentifier = verifiedUserId || `ip_${clientIp}`;

    if (isRateLimited(rateLimitIdentifier)) {
      return res.status(429).json({
        error: 'Too many queries in a short time. Please wait a moment before asking again.',
      });
    }

    const body = req.body || {};
    const { message, history = [], tasks = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const userTimezone = body.timezone || body.userTimezone || 'UTC';
    const timezoneOffset = body.timezoneOffset || '+00:00';
    const localDate = body.localDate || new Date().toISOString().split('T')[0];
    const userLocalTime = body.userLocalTime || body.currentTimestamp || new Date().toISOString();
    const currentDayOfWeek = body.currentDayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const tasksSnapshot = (Array.isArray(tasks) ? tasks : []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      scheduledKickoffTime: t.scheduledKickoffTime,
      inProgressStartedAt: t.inProgressStartedAt,
      completedAt: t.completedAt,
      completionSource: t.completionSource,
      timeFromKickoffToComplete: t.timeFromKickoffToComplete,
      slippedReason: t.slippedReason,
      summary: t.originalAudioSummary,
      createdAt: t.createdAt,
    }));

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are EchoLoop's autonomous Second Brain AI Assistant.
EchoLoop's motto is: "Your second brain that follows through."
You have direct access to the user's task history and accountability ledger.
You know what tasks were completed, what slipped, what are currently in progress, and what are scheduled.

USER TEMPORAL CONTEXT:
- Current Local Date & Time: ${userLocalTime} (Offset: ${timezoneOffset})
- Current Local Date: ${localDate}
- Current Day of Week: ${currentDayOfWeek}
- User Timezone: ${userTimezone}

THE USER'S TASK LEDGER (${tasksSnapshot.length} total tasks):
${JSON.stringify(tasksSnapshot, null, 2)}

CORE GUIDELINES:
1. DATE & CALENDAR LOOKUPS:
   - When the user asks about a specific day or date (e.g. "what did I do on Aug 3?", "what did I do yesterday?", "tasks on Monday", "what's scheduled for tomorrow?"):
     - Convert the requested date (e.g., "Aug 3", "August 3rd", "yesterday") into the target calendar date format (YYYY-MM-DD) within the context of the user's current date (${localDate}).
     - Search the ledger for tasks whose completedAt, scheduledKickoffTime, or createdAt falls on that calendar day.
     - Categorize the findings clearly:
       • ✅ **Completed Tasks**: State title, when it was finished, and duration if available.
       • ⚠️ **Slipped or Missed Tasks**: State why it slipped if a reason was logged.
       • ⏳ **In-Progress or Scheduled Tasks**: State when they were initiated or scheduled.
     - If NO tasks exist for that date, explicitly state: "No tasks were recorded in your ledger for [Date]." Then offer to check another date or summarize their recent wins.

2. PROGRESS & ACCOUNTABILITY INQUIRIES:
   - If asked about streaks, accomplishments, or summaries, synthesize key stats: total completed vs slipped, most recent wins, and words of encouragement.

3. TONE & FORMATTING:
   - Write in an executive, warm, and highly accountable tone.
   - Use crisp Markdown with emojis, bold headers, and bullet points.
   - Keep answers clear, structured, and easy to read at a glance.

OUTPUT SCHEMA:
Return valid JSON with:
{
  "reply": "Markdown formatted reply answering the user question directly",
  "referencedTaskIds": ["id1", "id2"]
}`;

    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'assistant' || h.sender === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text || h.content || '' }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Markdown formatted reply answering the user question directly',
            },
            referencedTaskIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of task IDs mentioned or directly relevant',
            },
          },
          required: ['reply'],
        },
      },
    });

    const responseText = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      parsedResult = { reply: responseText, referencedTaskIds: [] };
    }

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error('Second Brain chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process chat query',
    });
  }
}
