/**
 * Available AI models for Developer's Ai.
 *
 * All models currently have unlimited usage.
 * Pro is now unlocked and accessible to all users.
 *
 * The chat API will automatically FALL BACK to the next model in the
 * `fallbacks` array if the primary model fails (timeout, rate limit, etc).
 *
 * NOTE: Real model names (Mistral, Claude) are kept INTERNAL only —
 * users only see "Developer's V1", "Developer's V2", "Developer's Pro".
 */

export type ModelTier = "free" | "pro";

export interface ModelInfo {
  /** Internal id — sent to API */
  id: string;
  /** User-facing name shown in UI */
  label: string;
  /** Short tagline — NO real model names exposed */
  tagline: string;
  /** Underlying model name on the LLM API (internal only) */
  apiModel: string;
  /** Provider name (internal only — not shown in UI) */
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
    tagline: "Fast & reliable — great for casual chat",
    apiModel: "mistral-medium-3-5",
    provider: "Mistral AI",
    dailyLimit: 0,
    tier: "free",
    vision: true,
    badge: "⚡",
    order: 1,
    fallbacks: ["claude-sonnet-4.5"],
  },
  {
    id: "v2",
    label: "Developer's V2",
    tagline: "Smarter responses — better for coding help",
    apiModel: "claude-sonnet-4.5",
    provider: "Anthropic",
    dailyLimit: 0,
    tier: "free",
    vision: true,
    badge: "🧠",
    order: 2,
    fallbacks: ["mistral-medium-3-5"],
  },
  {
    id: "pro",
    label: "Developer's Pro",
    tagline: "Premium experience — best quality",
    apiModel: "claude-sonnet-4.5",
    provider: "Anthropic",
    dailyLimit: 0,
    tier: "pro",
    vision: true,
    badge: "👑",
    order: 3,
    fallbacks: ["mistral-medium-3-5"],
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
 */
export function getModelChain(modelId: string): string[] {
  const model = getModel(modelId);
  if (!model) return [process.env.LLM_MODEL || "mistral-medium-3-5"];
  return [model.apiModel, ...(model.fallbacks || [])];
}

/** LocalStorage key for the user's selected model */
export const MODEL_STORAGE_KEY = "devai:model";
