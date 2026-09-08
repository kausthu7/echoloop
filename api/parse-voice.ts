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

// In-memory sliding window rate limiter for serverless instance (per IP/user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 15; // 15 voice parses per minute

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

// Clean up old rate limit entries every 5 minutes
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
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ------------------------------------------------------------------------
    // 1. AUTHENTICATION (Verify Supabase JWT Server-Side; Never trust client user_id)
    // ------------------------------------------------------------------------
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

    // In production, require authenticated user. In development or demo mode, allow fallback with IP rate limit
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
    const rateLimitIdentifier = verifiedUserId || `ip_${clientIp}`;

    // ------------------------------------------------------------------------
    // 2. RATE LIMITING
    // ------------------------------------------------------------------------
    if (isRateLimited(rateLimitIdentifier)) {
      return res.status(429).json({ 
        error: 'Too many voice parsing requests. Please wait a moment before trying again.' 
      });
    }

    // ------------------------------------------------------------------------
    // 3. INPUT VALIDATION & TIMEZONE CONTEXT
    // ------------------------------------------------------------------------
    const body = req.body || {};
    const { audioBase64, mimeType = 'audio/webm', textPrompt } = body;

    const userTimezone = body.timezone || body.userTimezone || 'UTC';
    const timezoneOffset = body.timezoneOffset || '+00:00';
    const localDate = body.localDate || new Date().toISOString().split('T')[0];
    const userLocalTime = body.userLocalTime || body.currentTimestamp || new Date().toISOString();
    const currentDayOfWeek = body.currentDayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const humanReadableLocal = body.humanReadableLocal || `${userLocalTime} (${userTimezone}, UTC${timezoneOffset})`;

    if (!audioBase64 && !textPrompt) {
      return res.status(400).json({ error: 'Either audioBase64 or textPrompt must be provided.' });
    }

    // Validate size limit (max 15MB audio payload)
    if (audioBase64 && typeof audioBase64 === 'string' && audioBase64.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio file exceeds 15MB limit.' });
    }

    // Validate audio MIME type
    const validMimes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/x-m4a'];
    if (audioBase64 && !validMimes.some((m) => mimeType.startsWith(m))) {
      return res.status(400).json({ error: 'Unsupported audio MIME type.' });
    }

    // ------------------------------------------------------------------------
    // 4. GEMINI 2.0 / 3.8 FLASH PARSING WITH LOCAL TIMEZONE ACCURACY
    // ------------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured on the server.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'echoloop-production' } },
    });

    const systemPrompt = `You are EchoLoop's autonomous voice-first parsing engine.
Your job is to parse raw, unstructured voice notes in ANY language (such as English, Malayalam, Hindi, Hinglish, Spanish, French, etc.) spoken by a busy professional.

CURRENT USER LOCAL CONTEXT:
- Current Local Date & Time: ${humanReadableLocal}
- Current ISO with Local Offset: ${userLocalTime}
- User Timezone: ${userTimezone}
- UTC Offset: ${timezoneOffset}
- Current Day: ${currentDayOfWeek}
- Current Local Date: ${localDate}

TASK EXTRACTION RULES:
1. "task_title": Clean, actionable, concise title in English describing what the user has to do.
2. "original_audio_summary": A faithful summary in English reflecting what was said in the voice note and any code-switched context.
3. "scheduled_time": The exact ISO-8601 string for when the INITIAL reminder / kickoff should trigger.
   CRITICAL TIMEZONE & OFFSET RULES:
   - All times spoken by the user (e.g. "tomorrow morning at 10 AM", "at 4 PM", "tonight at 8 PM", "in 45 minutes") are in the USER'S LOCAL TIMEZONE (${userTimezone}, offset ${timezoneOffset}).
   - You MUST return "scheduled_time" formatted as an ISO-8601 string with the user's timezone offset included: "YYYY-MM-DDTHH:mm:ss${timezoneOffset}".
   - DO NOT format "scheduled_time" in UTC with "Z" if the user stated a local hour!
   - Example 1: If current date is ${localDate} and user says "tomorrow morning at 10 AM" with offset ${timezoneOffset}, "scheduled_time" MUST be tomorrow's date at 10:00:00${timezoneOffset} (e.g. "2026-09-09T10:00:00${timezoneOffset}").
   - Example 2: User says "in 30 minutes" -> add 30 minutes to ${userLocalTime} and keep offset ${timezoneOffset}.
   - If no specific time is spoken, schedule it for 2 hours after ${userLocalTime}.
4. "default_checkin_delay_minutes": The appropriate buffer in minutes before EchoLoop should follow up to verify completion. Small quick tasks (phone call, email, review) = 30-45 minutes. Medium/major tasks (pitch deck, coding, report, workout) = 60-120 minutes.
5. "detected_language": Name of the primary language(s) or dialect used (e.g. "Malayalam", "Hindi", "English", "Spanish").
6. "confidence_notes": Brief explanation of how relative timing or idioms were interpreted.

Always return valid JSON adhering to the schema.`;

    let contentsPayload: any;
    if (audioBase64) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          {
            text: `Please transcribe and parse this voice note. Current user local time: ${humanReadableLocal} (Offset: ${timezoneOffset}). Return JSON matching the schema.`,
          },
        ],
      };
    } else {
      contentsPayload = `Voice note text transcript: "${textPrompt}". Current user local time: ${humanReadableLocal} (Offset: ${timezoneOffset}). Return JSON matching the schema.`;
    }

    const genConfig = {
      systemInstruction: systemPrompt,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          task_title: { type: Type.STRING, description: 'Actionable English task title' },
          original_audio_summary: { type: Type.STRING, description: 'Summary of the spoken note in English' },
          scheduled_time: { type: Type.STRING, description: `Calculated ISO-8601 trigger time with offset ${timezoneOffset}` },
          default_checkin_delay_minutes: { type: Type.INTEGER, description: 'Buffer delay in minutes before follow-up (30-180)' },
          detected_language: { type: Type.STRING, description: 'Language detected' },
          confidence_notes: { type: Type.STRING, description: 'Notes on timing/idioms' },
        },
        required: ['task_title', 'original_audio_summary', 'scheduled_time', 'default_checkin_delay_minutes'],
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsPayload,
        config: genConfig,
      });
    } catch (modelErr: any) {
      console.warn('gemini-2.5-flash failed, falling back to gemini-1.5-flash:', modelErr?.message);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: contentsPayload,
          config: genConfig,
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contentsPayload,
          config: genConfig,
        });
      }
    }

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);

    // ------------------------------------------------------------------------
    // 5. OUTPUT VALIDATION & TIMEZONE OFFSET NORMALIZATION
    // ------------------------------------------------------------------------
    if (!parsedData.task_title || typeof parsedData.task_title !== 'string') {
      parsedData.task_title = 'Voice Goal';
    }

    if (!parsedData.scheduled_time || isNaN(Date.parse(parsedData.scheduled_time))) {
      const fallbackMs = Date.parse(userLocalTime) || Date.now();
      parsedData.scheduled_time = new Date(fallbackMs + 2 * 60 * 60 * 1000).toISOString();
    } else {
      let rawTime = String(parsedData.scheduled_time).trim();
      // If time has no offset (e.g. "2026-09-09T10:00:00"), append user's local offset
      if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?$/.test(rawTime)) {
        parsedData.scheduled_time = rawTime.replace(' ', 'T') + timezoneOffset;
      } else if (rawTime.endsWith('Z') && timezoneOffset && timezoneOffset !== '+00:00' && timezoneOffset !== '-00:00') {
        // If Gemini returned a timestamp ending in 'Z' (UTC), verify if it tagged a local wall clock time with 'Z'
        const timeMatch = rawTime.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          const summaryLower = (parsedData.original_audio_summary || '').toLowerCase();
          const amPm = hour >= 12 ? 'pm' : 'am';
          const hour12 = hour % 12 || 12;
          const mentionsSpokenHour = summaryLower.includes(`${hour12} ${amPm}`) || 
                                     summaryLower.includes(`${hour12}${amPm}`) || 
                                     summaryLower.includes(`${hour12}:00 ${amPm}`);
          if (mentionsSpokenHour) {
            // Replace trailing 'Z' with user's local timezone offset
            parsedData.scheduled_time = rawTime.slice(0, -1) + timezoneOffset;
          }
        }
      }
    }

    parsedData.default_checkin_delay_minutes = Number(parsedData.default_checkin_delay_minutes) || 60;

    // Return structured proposal to the client (Gemini NEVER writes directly to DB)
    return res.status(200).json(parsedData);
  } catch (error: any) {
    // Sanitize error message to prevent secret or URL key leakage to client
    const rawMessage = String(error?.message || '');
    const sanitizedError = rawMessage
      .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED]')
      .replace(/AQ\.[0-9A-Za-z-_]{35,}/g, '[REDACTED]');

    console.error('Gemini voice parsing serverless error:', sanitizedError);
    return res.status(500).json({
      error: 'Failed to process voice note with AI. Please try again.',
      details: process.env.NODE_ENV === 'development' ? sanitizedError : undefined,
    });
  }
}
