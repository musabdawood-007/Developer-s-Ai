/**
 * Available AI models for Developer's Ai.
 *
 * Each model has a user-facing name (V1, V2, etc.) and an underlying
 * API model name. All free models currently have unlimited usage.
 *
 * The chat API will automatically FALL BACK to the next model in the
 * `fallbacks` array if the primary model fails (timeout, rate limit, etc).
 */

export type ModelTier = "free" | "pro";

export interface ModelInfo {
  /** Internal id — sent to API */
  id: string;
  /** User-facing name shown in UI */
  label: string;
  /** Short tagline */
  tagline: string;
  /** Underlying model name on the LLM API */
  apiModel: string;
  /** Provider name shown in UI */
  provider: string;
  /** Daily message limit (0 = unlimited) */
  dailyLimit: number;
  /** Tier — free or pro */
  tier: ModelTier;
  /** Vision support */
  vision: boolean;
  /** Badge emoji for UI */
  badge: string;
  /** Order in the selector */
  order: number;
  /** Models to try if this one fails (in order) */
  fallbacks?: string[];
}

export const MODELS: ModelInfo[] = [
  {
    id: "v1",
    label: "Developer's V1",
    tagline: "Fast & reliable — Mistral Medium 3.5",
    apiModel: "mistral-medium-3-5",
    provider: "Mistral AI",
    dailyLimit: 0,
    tier: "free",
    vision: true,
    badge: "⚡",
    order: 1,
    // If Mistral fails, fall back to Claude Sonnet
    fallbacks: ["claude-sonnet-4.5"],
  },
  {
    id: "v2",
    label: "Developer's V2",
    tagline: "Smarter responses — Claude Sonnet 4.5",
    apiModel: "claude-sonnet-4.5",
    provider: "Anthropic",
    dailyLimit: 0,
    tier: "free",
    vision: true,
    badge: "🧠",
    order: 2,
    // If Claude Sonnet fails (rate limit / timeout), fall back to Mistral
    fallbacks: ["mistral-medium-3-5"],
  },
  {
    id: "pro",
    label: "Developer's Pro",
    tagline: "Premium tier — coming soon",
    apiModel: "claude-sonnet-4.5",
    provider: "Anthropic",
    dailyLimit: 0,
    tier: "pro",
    vision: true,
    badge: "👑",
    order: 3,
  },
];

/** Default model id used on first visit */
export const DEFAULT_MODEL_ID = "v1";

/** Look up a model by id */
export function getModel(id: string | undefined): ModelInfo | undefined {
  if (!id) return undefined;
  return MODELS.find((m) => m.id === id);
}

/** Get the default model */
export function getDefaultModel(): ModelInfo {
  return getModel(DEFAULT_MODEL_ID)!;
}

/**
 * Build a list of API model names to try, in order:
 * [primary, ...fallbacks]
 * Used by the chat API to retry with a different model if the primary fails.
 */
export function getModelChain(modelId: string): string[] {
  const model = getModel(modelId);
  if (!model) return [process.env.LLM_MODEL || "mistral-medium-3-5"];
  return [model.apiModel, ...(model.fallbacks || [])];
}

/** LocalStorage key for the user's selected model */
export const MODEL_STORAGE_KEY = "devai:model";
