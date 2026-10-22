# PULSE

> **Built by [Musab Projects](https://musab-007.netlify.app)** — a project group by Musab Dawood

> **Your Emotional Compass. Steady Mind. Clear Path.**

A full-stack AI emotional-support web application for anyone feeling stuck, overwhelmed, or isolated. PULSE listens first (empathy), then guides gently (one tiny actionable step). Built with Next.js, TypeScript, and MongoDB.

**Live demo:** [developer-space-ai.vercel.app](https://developer-space-ai.vercel.app)

## Features

- **Safe-Space Chat with Streaming** — Real-time SSE streaming with real-time responses, thinking indicators, "Typing…" indicators, and stop-generation support
- **Dynamic Empathic Response Engine** — System-prompt driven arc: validate → normalize → one tiny step
- **No Login Wall** — Anonymous guest sessions before account creation
- **Crisis Guardrail** — Self-harm / crisis language routes to real human help, never LLM guesswork
- **Free Tier Rate Limiting** — ~10 messages/day per visitor, enforced server-side
- **Feedback Loop** — Thumbs up/down after every reply, stored for prompt fine-tuning
- **18+ Age Gate & Onboarding** — Expectation-setting welcome modal ("I'm an AI, not a therapist, but I care")
- **Multi-Mode Selection** — PULSE Listener (free) & PULSE Deep Session (Pro), with fallback chains
- **Multiple Model Tiers** — V1, V2, and Pro model options with fallback handling
- **AI Image Generation** — Image generation using Pollinations.ai
- **Vision Input** — Analyze uploaded images
- **Chat Space Management** — Create, switch, and delete chat spaces with automatic titles (history lives in your browser)
- **Response Exports** — Export responses as Markdown, PDF, DOCX, and TXT
- **User Authentication** — Sign up/in with email + Google login, OTP verification, forgot password
- **Usage Tracking** — Track usage by visitor, model, and day
- **Admin Functionality** — View visitors, chat logs, and application data
- **TokyoNight UI** — Calming dark theme, mobile-first with a responsive glassmorphism interface, animated welcome screens, and sticky bottom input bar
- **PWA** — Installable on mobile/desktop with a web app manifest and service-worker caching

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 + Radix UI + shadcn/ui patterns |
| Styling | Tailwind CSS 4 (TokyoNight palette) |
| State management | Zustand 5 |
| Data fetching | TanStack React Query 5 |
| Database | MongoDB |
| ORM | Prisma 6 |
| Authentication | Custom authentication with bcryptjs, httpOnly cookies, OTP email, and Google login |
| AI integrations | OpenAI-compatible LLM API, Mistral, and Claude-compatible models with fallback chains |
| Image generation | Pollinations.ai |
| Email | Nodemailer and Resend SDK |
| Exporting | jsPDF and DOCX |
| PWA | Service Worker + Web App Manifest |
| Package manager | Bun or npm |

## Data model

The Prisma schema uses MongoDB and currently includes models for:

- Visitors and account details
- Chat sessions
- Chat logs and message metadata
- Daily per-model usage tracking
- OTP tokens for sign-up and password reset flows

## Getting started

### Prerequisites

- Node.js 20+ or Bun
- A MongoDB database
- Credentials for the configured LLM and email providers

### Installation

```bash
# Clone the repository
git clone https://github.com/musabdawood-007/Developer-s-Ai.git
cd Developer-s-Ai

# Install dependencies
bun install
# or: npm install

# Generate the Prisma client
bun run db:generate

# Push the Prisma schema to MongoDB
bun run db:push

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

Create a `.env` file in the project root and configure the values required by your deployment:

```env
DATABASE_URL=mongodb+srv://...
LLM_BASE_URL=https://api.example.com
LLM_API_KEY=your-api-key
LLM_MODEL=your-model-name
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your-app-password
```

Keep secrets out of version control. The exact provider configuration may vary depending on the LLM and email services you use.

## Available scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the development server on port 3000 |
| `bun run build` | Generate Prisma Client and create a production build |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate the Prisma Client |
| `bun run db:push` | Push the Prisma schema to MongoDB |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:reset` | Reset the database using Prisma |

The same scripts can be run with `npm run` when using npm.

## Project structure

```text
Developer-s-Ai/
├── prisma/                 # Prisma schema for MongoDB
├── public/                 # Static assets and PWA files
├── scripts/                # Project utility scripts
├── src/
│   ├── app/                # Next.js pages, layouts, and API routes
│   ├── components/         # Reusable UI and application components
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Database, AI, email, and utility modules
├── package.json            # Dependencies and npm scripts
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Security notes

- Never commit `.env` files or API keys.
- Use secure, production-ready cookie settings when deploying.
- Restrict admin functionality and database credentials to trusted environments.
- Configure email provider credentials through deployment secrets.

## License

Built by [Musab Projects](https://musab-007.netlify.app) — a project group by Musab Dawood.
