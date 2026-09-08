# EchoLoop ⚡

<p align="center">
  <img src="public/logo.png" alt="EchoLoop Logo" width="120" height="120" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);" />
</p>

<h3 align="center">Autonomous Voice-First Accountability Agent</h3>

<p align="center">
  Speak your commitments naturally in any language. EchoLoop extracts the core action, schedules smart kickoffs, checks in autonomously, and holds you to your word.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Google_Gemini-3.8_Flash-8e75ff?style=flat-square&logo=google" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/PWA-Ready-f05032?style=flat-square" alt="PWA Ready" />
</p>

---

## ✨ Features

### 🎙️ Autonomous Voice-First Parsing
- Speak commitments in English, Malayalam, Hindi, Hinglish, Spanish, French, and code-switched dialects.
- Autonomous intent extraction via Google Gemini Flash: generates clear action items, extracts relative kickoff timestamps, and computes dynamic follow-up check-in delays.

### ⏰ Real-Time Kickoff & Check-In Protocol
- **Kickoff Chime**: Audio prompts alert you when it's time to begin a scheduled goal.
- **Progress Tracking**: Move tasks to In-Flight, extend timers, or mark completions.
- **Follow-Up Verification**: Autonomous voice check-ins verify completion or handle slipped goals with rescheduling.

### 🔐 Systematic Authentication System
- **Cryptographic Security**: Password hashing with Node.js built-in `crypto.scryptSync`, unique 16-byte random salts, and `crypto.timingSafeEqual` comparison.
- **Bearer Session Tokens**: 64-character cryptographically secure bearer tokens with 7-day expiration.
- **Interactive Auth UI**: Real-time 4-segment password strength meter, confirm password live verification, accountability persona/role selection, and 1-click Demo access.

### ☕ Accountability Circle & Treat Ledger
- Partner accountability board with live focus statuses and streaks.
- Send simulated treats and rewards (UPI, GPay, PhonePe, Cards) with confetti celebration animations.
- Real-time in-app notification center.

### 🎨 Modern Light Aesthetic
- Clean pure white base theme with ambient electric indigo and violet radiant gradient glows matching the infinity audio brand logo.
- Responsive mobile & desktop glassmorphism with smooth micro-animations.
- Full PWA support with service worker caching and home-screen installability.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Canvas Confetti
- **Backend**: Node.js, Express 4, tsx, esbuild
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Tooling**: Vite 6, Service Worker PWA

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### 1. Clone the repository
```bash
git clone https://github.com/Kausthu7/echoloop.git
cd echoloop
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3000
```
> Obtain your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

To compile both the Vite client bundle and the Express backend bundle:
```bash
npm run build
```

To run the production server:
```bash
npm run start
```

---

## 🧪 Verification & Linting

```bash
# Type check without emit
npm run lint

# Production build test
npm run build
```

---

## 📄 License
MIT © EchoLoop
