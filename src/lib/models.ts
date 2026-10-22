/**
 * Available AI conversation modes for PULSE.
 * Optimized for SPEED — using fast free models via OpenAI-compatible APIs.
 *
 * Recommended providers (set LLM_BASE_URL accordingly):
 * - Groq:        https://api.groq.com/openai/v1    (free, very fast)
 * - Together:    https://api.together.xyz/v1       (free tier, fast)
 * - OpenRouter:  https://openrouter.ai/api/v1      (free models available)
 * - Cerebras:    https://api.cerebras.ai/v1        (extremely fast, limited models)
 */

export type ModelTier = "free" | "pro";

export interface ModelInfo {
  id: string;
  label: string;
  tagline: string;
  apiModel: string;      // Model name sent to API
  provider: string;
  dailyLimit: number;
  tier: ModelTier;
  badge: string;
  order: number;
  fallbacks?: string[];
}

// Ultra-fast free models (prioritized by speed)
export const FAST_FREE_MODELS = [
  // Groq - extremely fast inference
  "llama-3.1-8b-instant",      // ~300+ tokens/sec on Groq
  "llama-3.3-70b-versatile",   // Good quality, still fast on Groq
  "gemma2-9b-it",              // Very fast, good quality
  // Together AI
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  "google/gemma-2-9b-it",
  // OpenRouter free models
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  // Cerebras (if available)
  "llama3.1-8b",
] as const;

export const FREE_DAILY_LIMIT = 20; // Increased for testing

export const MODELS: ModelInfo[] = [
  {
    id: "pulse-fast",
    label: "PULSE Fast",
    tagline: "⚡ Lightning fast — replies in 1-2s",
    apiModel: "llama-3.1-8b-instant", // Default: Groq Llama 3.1 8B
    provider: "Groq / OpenAI-compatible",
    dailyLimit: FREE_DAILY_LIMIT,
    tier: "free",
    badge: "⚡",
    order: 1,
    fallbacks: [
      "gemma2-9b-it",
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "google/gemma-2-9b-it:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
  },
  {
    id: "pulse-balanced",
    label: "PULSE Balanced",
    tagline: "🎯 Better quality, still fast",
    apiModel: "llama-3.3-70b-versatile",
    provider: "Groq / OpenAI-compatible",
    dailyLimit: FREE_DAILY_LIMIT,
    tier: "free",
    badge: "🎯",
    order: 2,
    fallbacks: [
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ],
  },
];

export const DEFAULT_MODEL_ID = "pulse-fast";

export function getModel(id: string | undefined): ModelInfo | undefined {
  if (!id) return undefined;
  return MODELS.find((m) => m.id === id);
}

export function getDefaultModel(): ModelInfo {
  return getModel(DEFAULT_MODEL_ID)!;
}

export function getModelChain(modelId: string): string[] {
  const model = getModel(modelId);
  if (!model) return [process.env.LLM_MODEL || "llama-3.1-8b-instant"];
  return [model.apiModel, ...(model.fallbacks || [])];
}