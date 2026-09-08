import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Task interface for backend store
interface TaskRecord {
  id: string;
  title: string;
  originalAudioSummary: string;
  detectedLanguage?: string;
  transcript?: string;
  scheduledKickoffTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SLIPPED' | 'COMPLETED';
  checkinDelayMinutes: number;
  inProgressStartedAt?: string;
  followUpScheduledTime?: string;
  completedAt?: string;
  completionSource?: 'ALREADY_DONE' | 'VERIFIED_FOLLOWUP' | 'MANUAL';
  timeFromKickoffToComplete?: string;
  slippedReason?: string;
  extensionsCount: number;
  lastFollowUpPrompt?: string;
  createdAt: string;
}

// Real tasks store for live accountability tracking
function getInitialTasks(): TaskRecord[] {
  return [];
}

interface TreatRecord {
  id: string;
  amount: number;
  label: string;
  emoji: string;
  customNote?: string;
  paymentMethod: string;
  createdAt: string;
}

// Real treats store for live rewards
function getInitialTreats(): TreatRecord[] {
  return [];
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role?: string;
  avatarUrl?: string;
  accountType?: 'DEMO' | 'STANDARD' | 'GOOGLE';
  createdAt: string;
}

interface SessionRecord {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

let tasksStore: TaskRecord[] = getInitialTasks();
let treatsStore: TreatRecord[] = getInitialTreats();

// Session Registry & Cryptographic Token Management
const sessionsStore = new Map<string, SessionRecord>();
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const computedBuffer = Buffer.from(computedHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessionsStore.set(token, {
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  });
  return token;
}

function getSessionUser(token?: string): UserRecord | null {
  if (!token) return null;
  const session = sessionsStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionsStore.delete(token);
    return null;
  }
  const user = usersStore.find((u) => u.id === session.userId);
  return user || null;
}

function revokeSession(token?: string): void {
  if (token) {
    sessionsStore.delete(token);
  }
}

function extractBearerToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers["x-auth-token"];
  if (typeof customHeader === "string") {
    return customHeader.trim();
  }
  return undefined;
}

function toSafeUser(user: UserRecord) {
  const { passwordHash: _, salt: __, ...safe } = user;
  return safe;
}

// Initialize default Demo user with secure hash
const demoCredentials = hashPassword("password123");
let usersStore: UserRecord[] = [
  {
    id: "user-demo-alex",
    name: "Alex Rivers",
    email: "alex@echoloop.io",
    passwordHash: demoCredentials.hash,
    salt: demoCredentials.salt,
    role: "Founder & Product Lead",
    avatarUrl: "",
    accountType: "DEMO",
    createdAt: new Date().toISOString(),
  }
];

// Helper to get lazy Gemini client

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ================= API ROUTES =================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET all tasks
app.get("/api/tasks", (req, res) => {
  res.json({ tasks: tasksStore });
});

// POST new task
app.post("/api/tasks", (req, res) => {
  const newTask: TaskRecord = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || "Untitled Task",
    originalAudioSummary: req.body.originalAudioSummary || "Voice recorded note",
    detectedLanguage: req.body.detectedLanguage || "Natural Speech",
    transcript: req.body.transcript || "",
    scheduledKickoffTime: req.body.scheduledKickoffTime || new Date().toISOString(),
    status: req.body.status || "PENDING",
    checkinDelayMinutes: Number(req.body.checkinDelayMinutes) || 60,
    inProgressStartedAt: req.body.inProgressStartedAt,
    followUpScheduledTime: req.body.followUpScheduledTime,
    completedAt: req.body.completedAt,
    completionSource: req.body.completionSource,
    timeFromKickoffToComplete: req.body.timeFromKickoffToComplete,
    slippedReason: req.body.slippedReason,
    extensionsCount: req.body.extensionsCount || 0,
    lastFollowUpPrompt: req.body.lastFollowUpPrompt,
    createdAt: new Date().toISOString(),
  };
  tasksStore.unshift(newTask);
  res.status(201).json({ task: newTask });
});

// PATCH task
app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = tasksStore.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const updated: TaskRecord = {
    ...tasksStore[index],
    ...req.body,
  };
  tasksStore[index] = updated;
  res.json({ task: updated });
});

// DELETE task
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  tasksStore = tasksStore.filter((t) => t.id !== id);
  res.json({ success: true });
});

// POST reset seeds
app.post("/api/tasks/seed", (req, res) => {
  tasksStore = getInitialTasks();
  treatsStore = getInitialTreats();
  res.json({ tasks: tasksStore, treats: treatsStore });
});

// GET all treats
app.get("/api/treats", (req, res) => {
  const totalAmount = treatsStore.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  res.json({
    treats: treatsStore,
    totalTreatsCount: treatsStore.length,
    totalAmount,
  });
});

// POST new treat
app.post("/api/treats", (req, res) => {
  const amount = Number(req.body.amount) || 100;
  const label = req.body.label || "Custom Treat";
  const emoji = req.body.emoji || "🎁";
  const customNote = req.body.customNote || "";
  const paymentMethod = req.body.paymentMethod || "UPI";

  const newTreat: TreatRecord = {
    id: `treat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    amount,
    label,
    emoji,
    customNote,
    paymentMethod,
    createdAt: new Date().toISOString(),
  };

  treatsStore.unshift(newTreat);
  const totalAmount = treatsStore.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  res.status(201).json({
    treat: newTreat,
    totalTreatsCount: treatsStore.length,
    totalAmount,
  });
});

// ================= AUTH ROUTES =================

// Middleware: Authenticate requests using Bearer session token
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing", user: null });
  }
  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again.", user: null });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

// GET current authenticated user profile
app.get("/api/auth/me", (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "No active session token", user: null });
  }
  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session token", user: null });
  }
  res.json({ user: toSafeUser(user) });
});

// POST Sign In with email & password verification
app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email address is required." });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = usersStore.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ 
      error: "Invalid email or password. Please verify your credentials, or click 'Instant Demo' to explore." 
    });
  }

  const token = createSession(user.id);
  res.json({
    token,
    user: toSafeUser(user),
    message: "Signed in successfully."
  });
});

// POST Sign Up with validation, uniqueness check, and password hashing
app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, role } = req.body;

  // 1. Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Please provide a valid full name (at least 2 characters)." });
  }

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email address is required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "Please enter a valid email format (e.g. name@domain.com)." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  // 2. Duplicate Check
  const existing = usersStore.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ 
      error: "An account with this email already exists. Please sign in instead." 
    });
  }

  // 3. Cryptographic Hash
  const { hash, salt } = hashPassword(password);

  // 4. Store user
  const newUser: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    salt: salt,
    role: role?.trim() || "Founder & Creator",
    avatarUrl: "",
    accountType: "STANDARD",
    createdAt: new Date().toISOString(),
  };

  usersStore.push(newUser);

  // 5. Create active session
  const token = createSession(newUser.id);

  res.status(201).json({
    token,
    user: toSafeUser(newUser),
    message: "Account created successfully. Welcome to EchoLoop!"
  });
});

// POST Instant Demo Login (convenient 1-click test access)
app.post("/api/auth/demo", (req, res) => {
  let demoUser = usersStore.find((u) => u.email === "alex@echoloop.io");
  if (!demoUser) {
    const creds = hashPassword("password123");
    demoUser = {
      id: "user-demo-alex",
      name: "Alex Rivers",
      email: "alex@echoloop.io",
      passwordHash: creds.hash,
      salt: creds.salt,
      role: "Founder & Product Lead",
      avatarUrl: "",
      accountType: "DEMO",
      createdAt: new Date().toISOString(),
    };
    usersStore.push(demoUser);
  }

  const token = createSession(demoUser.id);
  res.json({
    token,
    user: toSafeUser(demoUser),
    message: "Logged in as Demo Explorer."
  });
});

// POST Sign Out: Invalidate active bearer session
app.post("/api/auth/signout", (req, res) => {
  const token = extractBearerToken(req);
  if (token) {
    revokeSession(token);
  }
  res.json({ success: true, message: "Signed out successfully." });
});

// POST Voice Parser endpoint using Gemini 2.0 / 3.8 Flash

app.post("/api/parse-voice", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", textPrompt, userLocalTime, timezone } = req.body;
    
    if (!audioBase64 && !textPrompt) {
      return res.status(400).json({ error: "Either audioBase64 or textPrompt must be provided." });
    }

    const ai = getGeminiClient();
    const referenceTime = userLocalTime || new Date().toISOString();
    const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const systemPrompt = `You are EchoLoop's autonomous voice-first parsing engine.
Your job is to parse raw, unstructured voice notes in ANY language (such as English, Malayalam, Hindi, Hinglish, Spanish, French, etc.) spoken by a busy professional.
Extract:
1. "task_title": Clean, actionable, concise title in English describing what the user has to do.
2. "original_audio_summary": A faithful summary in English reflecting what was said in the voice note and any code-switched context.
3. "scheduled_time": An exact ISO-8601 string when the INITIAL reminder / kickoff should trigger. Calculate this relative to the current reference time: ${referenceTime} (Timezone: ${userTimezone}). If relative time like "tomorrow at 2 PM", "in 30 minutes", "at 6pm tonight", "after lunch (e.g. 14:00)" is spoken, compute the absolute ISO timestamp. If no specific time is spoken, schedule it for 2 hours from now or next logical work block.
4. "default_checkin_delay_minutes": The appropriate buffer in minutes before EchoLoop should follow up to verify completion. Small quick tasks (phone call, email, review) = 30-45 minutes. Medium/major tasks (pitch deck, coding, report, workout) = 60-120 minutes.
5. "detected_language": Name of the primary language(s) or dialect used (e.g. "Malayalam & English", "Hindi", "English", "Spanish").
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
            text: `Please transcribe and parse this voice note. Current reference time: ${referenceTime}. Return JSON matching the schema.`,
          },
        ],
      };
    } else {
      contentsPayload = `Voice note text transcript: "${textPrompt}". Current reference time: ${referenceTime}. Return JSON matching the schema.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            task_title: {
              type: Type.STRING,
              description: "Actionable English task title",
            },
            original_audio_summary: {
              type: Type.STRING,
              description: "Summary of the spoken note in English",
            },
            scheduled_time: {
              type: Type.STRING,
              description: "Calculated ISO-8601 trigger time",
            },
            default_checkin_delay_minutes: {
              type: Type.INTEGER,
              description: "Buffer delay in minutes before follow-up (30-180)",
            },
            detected_language: {
              type: Type.STRING,
              description: "Language detected (e.g. Malayalam, Hindi, English)",
            },
            confidence_notes: {
              type: Type.STRING,
              description: "Notes on how time or idioms were interpreted",
            },
          },
          required: [
            "task_title",
            "original_audio_summary",
            "scheduled_time",
            "default_checkin_delay_minutes",
          ],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);

    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini voice parsing error:", error);
    res.status(500).json({
      error: error?.message || "Failed to process audio with Gemini",
    });
  }
});

// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EchoLoop Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
