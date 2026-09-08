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
    const { message, history = [], tasks = [], memories = [] } = body;

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

    // Sanitize and format memories ledger
    const memoriesSnapshot = (Array.isArray(memories) ? memories : []).map((m: any) => ({
      id: m.id,
      content: m.content,
      category: m.category, // FINANCIAL_DEBT | NOTE | PROMISE | PERSONAL_FACT | GENERAL
      eventDate: m.eventDate,
      entities: m.entities || {},
      rawText: m.rawText,
      createdAt: m.createdAt,
    }));

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are EchoLoop's autonomous Second Brain AI Assistant.
EchoLoop's motto is: "Your second brain that follows through."
You have direct, dual-ledger access to:
1. THE USER'S TASK ACCOUNTABILITY LEDGER (completed, slipped, active, and scheduled tasks).
2. THE USER'S LONG-TERM EPISODIC MEMORY LEDGER (debts, loans, money owed, personal facts, notes, promises, and arbitrary statements the user told you to remember).

USER TEMPORAL CONTEXT:
- Current Local Date & Time: ${userLocalTime} (Offset: ${timezoneOffset})
- Current Local Date: ${localDate}
- Current Day of Week: ${currentDayOfWeek}
- User Timezone: ${userTimezone}

LEDGER 1: USER'S TASK LEDGER (${tasksSnapshot.length} total tasks):
${JSON.stringify(tasksSnapshot, null, 2)}

LEDGER 2: USER'S LONG-TERM MEMORY LEDGER (${memoriesSnapshot.length} total memories):
${JSON.stringify(memoriesSnapshot, null, 2)}

CORE GUIDELINES:

1. REMEMBERING NEW INFORMATION (STORAGE INTENT):
   - When the user tells you to remember something, or states a past or future transaction, fact, debt, or event (e.g., "on sept 4th user give 500rs to someone", "remember on Sept 4th I gave 500rs to Alex", "I lent 200 to Rahul", "Alex owes me 500rs", "remember my passport is in the blue drawer", "note that Sarah's birthday is May 14"):
     - You MUST extract this into "newMemoryToSave" in your JSON response!
     - Populate:
       • "content": A concise, clear summary statement (e.g. "Gave 500rs to someone on Sept 4th (They owe you 500rs)").
       • "category": One of "FINANCIAL_DEBT", "NOTE", "PROMISE", "PERSONAL_FACT", "GENERAL". (Use "FINANCIAL_DEBT" for money given, lent, borrowed, or debts).
       • "eventDate": If a specific date was mentioned (e.g. "Sept 4th"), convert it to YYYY-MM-DD relative to today's date (${localDate}).
       • "entities": Extract { person, amount, currency, direction: "OWED_TO_ME" | "I_OWE" | "NEUTRAL", keyDetails }.
         * If the user gave or lent money to someone, direction is "OWED_TO_ME".
         * If the user borrowed money from someone, direction is "I_OWE".
     - In your "reply", warmly confirm that you have securely committed this to their Second Brain memory. Assure them that whenever they ask in the future (even days or months later), you will remember it.

2. EPISODIC MEMORY RECALL & DEBT/LOAN INQUIRIES:
   - When the user asks questions about remembered facts or financial debts (e.g., "did someone have to give money to me?", "who owes me money?", "what did I lend out?", "did I give money to anyone?", "what did I tell you to remember?", "where is my passport?"):
     - Search the LONG-TERM MEMORY LEDGER thoroughly.
     - For debt / money queries ("did someone have to give money to me?"):
       - Check memories categorized as "FINANCIAL_DEBT" or with direction "OWED_TO_ME", or mentioning money, lending, or giving.
       - Answer with total accuracy! State the exact person (or "someone"), the exact amount (e.g. 500rs), the date (e.g. September 4th), and that this money is owed back to them.
       - Populate "referencedMemoryIds" with the IDs of matching memories.
     - If no matching memory is found, state clearly: "According to your memory ledger, you haven't recorded anyone owing you money."

3. DATE & TASK LOOKUPS (TASK LEDGER):
   - When the user asks about tasks on a specific day (e.g. "what did I do on Aug 3?", "what did I do yesterday?", "tasks on Monday"):
     - Convert the requested date into YYYY-MM-DD within context of ${localDate}.
     - Search the Task Ledger for tasks whose completedAt, scheduledKickoffTime, or createdAt falls on that day.
     - Categorize findings clearly (✅ Completed, ⚠️ Slipped, ⏳ In-Progress).
     - If no tasks exist for that date, explicitly state that.

4. PROGRESS & ACCOUNTABILITY:
   - Provide executive, inspiring summaries when asked about streaks or wins.

5. TONE & FORMATTING:
   - Crisp Markdown with emojis, bold headers, bullet points, and high clarity.`;

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
            referencedMemoryIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of memory IDs mentioned or directly relevant',
            },
            newMemoryToSave: {
              type: Type.OBJECT,
              description: 'Populated if user stated something to remember (fact, debt, loan, note, event)',
              properties: {
                content: { type: Type.STRING, description: 'Structured summary of what to remember' },
                category: {
                  type: Type.STRING,
                  enum: ['FINANCIAL_DEBT', 'NOTE', 'PROMISE', 'PERSONAL_FACT', 'GENERAL'],
                },
                eventDate: { type: Type.STRING, description: 'YYYY-MM-DD if an event date was stated' },
                entities: {
                  type: Type.OBJECT,
                  properties: {
                    person: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    currency: { type: Type.STRING },
                    direction: { type: Type.STRING, enum: ['OWED_TO_ME', 'I_OWE', 'NEUTRAL'] },
                    keyDetails: { type: Type.STRING },
                  },
                },
              },
              required: ['content', 'category'],
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
      parsedResult = { reply: responseText, referencedTaskIds: [], referencedMemoryIds: [] };
    }

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error('Second Brain chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process chat query',
    });
  }
}
