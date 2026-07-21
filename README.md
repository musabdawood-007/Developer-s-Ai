# Developer's Ai

> **Built by [Musab Projects](https://musab-007.netlify.app)** — a project group by Musab Dawood

A full-stack AI chatbot web application providing casual conversation, coding tips, AI image generation, and multi-format file export. Built with Next.js, TypeScript, and MongoDB.

**Live:** https://musab-007.netlify.app

---

## Features

- **AI Chat with Streaming** — Real-time SSE streaming with thinking indicators and stop-generation
- **Multi-Model Selection** — V1 (Mistral, fast), V2 (Claude, smarter), Pro (Claude, premium) with fallback chains
- **AI Image Generation** — Text-to-image via Pollinations.ai
- **Vision / Multimodal** — Attach images for AI analysis
- **Multi-Format Export** — Download responses as Markdown, PDF, DOCX, or TXT
- **Chat Session Management** — Create, switch, and delete sessions with auto-titling
- **User Authentication** — Sign up/in with email, OTP verification, forgot password
- **Admin Portal** — View all visitors, chat logs, and manage data
- **PWA** — Installable on mobile/desktop with service worker caching
- **Cinematic Welcome Screen** — Animated intro with glassmorphism UI

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 + shadcn/ui (New York style) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Database | MongoDB + Prisma ORM |
| Auth | Custom (bcryptjs, httpOnly cookies, OTP email) |
| AI | OpenAI-compatible API (Mistral AI, Claude) |
| Image Gen | Pollinations.ai (Flux model) |
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
