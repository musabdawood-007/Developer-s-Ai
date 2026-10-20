# Developer's AI

> **Built by [Musab Projects](https://musab-007.netlify.app)** — a project group by Musab Dawood

Developer's AI is a full-stack AI chatbot built with Next.js and TypeScript. It supports streamed conversations, multiple AI models, image generation, vision input, chat history, authentication, and exporting responses in several formats.

**Live demo:** [developer-space-ai.vercel.app](https://developer-space-ai.vercel.app)

## Features

- **Streaming AI chat** with real-time responses, thinking indicators, and stop-generation support
- **Multiple model tiers** — V1, V2, and Pro model options with fallback handling
- **AI image generation** using Pollinations.ai
- **Vision input** for analyzing uploaded images
- **Chat sessions** with session creation, switching, deletion, and automatic titles
- **Response exports** as Markdown, PDF, DOCX, and TXT
- **Email authentication** with sign-up, OTP verification, sign-in, and password reset
- **Usage tracking** by visitor, model, and day
- **Admin functionality** for viewing visitors, chat logs, and application data
- **Progressive Web App** support with a web app manifest and service-worker assets
- **Responsive glassmorphism interface** with animated welcome screens and reusable UI components

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.1.1 with App Router |
| Language | TypeScript 5 |
| UI | React 19, Radix UI, shadcn/ui patterns |
| Styling | Tailwind CSS 4 |
| State management | Zustand 5 |
| Data fetching | TanStack React Query 5 |
| Database | MongoDB |
| ORM | Prisma 6 |
| Authentication | Custom authentication with bcryptjs, OTP email, and cookies |
| AI integrations | OpenAI-compatible LLM API, Mistral, and Claude-compatible models |
| Image generation | Pollinations.ai |
| Email | Nodemailer and Resend |
| Exporting | jsPDF and DOCX |
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
