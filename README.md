# PULSE

> **Built by [Musab Projects](https://musab-007.netlify.app)** — a project group by Musab Dawood

> **Your Emotional Compass. Steady Mind. Clear Path.**

A full-stack AI emotional-support web application for anyone feeling stuck, overwhelmed, or isolated. PULSE listens first (empathy), then guides gently (one tiny actionable step). Built with Next.js, TypeScript, and MongoDB.

**Live:** https://developer-space-ai.vercel.app

---

## Features

- **Safe-Space Chat with Streaming** — Real-time SSE streaming with "Typing…" indicators and stop-generation
- **Dynamic Empathic Response Engine** — System-prompt driven arc: validate → normalize → one tiny step
- **No Login Wall** — Anonymous guest sessions before account creation
- **Crisis Guardrail** — Self-harm / crisis language routes to real human help, never LLM guesswork
- **Free Tier Rate Limiting** — ~10 messages/day per visitor, enforced server-side
- **Feedback Loop** — Thumbs up/down after every reply, stored for prompt fine-tuning
- **18+ Age Gate & Onboarding** — Expectation-setting welcome modal ("I'm an AI, not a therapist, but I care")
- **Multi-Mode Selection** — PULSE Listener (free) & PULSE Deep Session (Pro), with fallback chains
- **Chat Space Management** — Create, switch, and delete chat spaces (history lives in your browser)
- **User Authentication** — Sign up/in with email + Google login, OTP verification, forgot password
- **TokyoNight UI** — Calming dark theme, mobile-first with sticky bottom input bar
- **PWA** — Installable on mobile/desktop with service worker caching

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 + shadcn/ui |
| Styling | Tailwind CSS v4 (TokyoNight palette) |
| Database | MongoDB + Prisma ORM |
| Auth | Custom (bcryptjs, httpOnly cookies, OTP email) |
| AI | OpenAI-compatible API (cheap, nuance-capable models + fallback chains) |
| Email | Nodemailer + Resend SDK |
| PWA | Service Worker + Web App Manifest |
| Package Manager | Bun |

## Quick Start

```bash
# Install dependencies
bun install

# Sync Prisma schema to MongoDB
bun run db:push

# Start dev server
bun run dev
```

Open http://localhost:3000

## Required Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=mongodb+srv://...
LLM_BASE_URL=https://api.example.com
LLM_API_KEY=your-api-key
LLM_MODEL=mistral-medium-3-5
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your-app-password
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to MongoDB |
| `bun run db:reset` | Reset database |

## Project Structure

```
Developer Ai/
├── src/
│   ├── app/              # Next.js App Router + API routes
│   ├── components/       # React components (chat, auth, admin)
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities, AI client, DB, email
├── prisma/               # MongoDB schema
├── public/               # Static assets, PWA manifest
└── scripts/              # Icon generation, DB cleanup
```

## License

Built by [Musab Projects](https://musab-007.netlify.app) — a project group by Musab Dawood.
