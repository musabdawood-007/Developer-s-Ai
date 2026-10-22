/**
 * Available AI conversation modes for PULSE.
 *
 * Free tier: PULSE Listener — 10 messages/day (PRD rate limit).
 * Pro tier:  PULSE Pro — unlimited-ish, deeper context (future).
 *
 * The chat API will automatically FALL BACK to the next model in the
 * `fallbacks` array if the primary model fails (timeout, rate limit, etc).
 *
 * NOTE: Real model names are kept INTERNAL only — users only see
 * "PULSE Listener" and "PULSE Deep Session".
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
  /** Badge emoji for UI */
  badge: string;
  /** Order in the selector */
  order: number;
  /** Models to try if this one fails (in order) */
  fallbacks?: string[];
}

export const FREE_DAILY_LIMIT = 10;

export const MODELS: ModelInfo[] = [
  {
    id: "pulse-listener",
    label: "PULSE Listener",
    tagline: "Gentle. Present. Hears you out.",
    apiModel: "agnes-2.5-flash",
    provider: "PULSE",
    dailyLimit: FREE_DAILY_LIMIT,
    tier: "free",
    badge: "💛",
    order: 1,
    fallbacks: ["laguna-s-2.1"],
  },
  {
    id: "pulse-deep",
    label: "PULSE Deep Session",
    tagline: "Longer, deeper dives. Coming with Pro.",
    apiModel: "laguna-s-2.1",
    provider: "PULSE",
    dailyLimit: 0,
    tier: "pro",
    badge: "🌊",
    order: 2,
  },
];

export const DEFAULT_MODEL_ID = "pulse-listener";

export function getModel(id: string | undefined): ModelInfo | undefined {
  if (!id) return undefined;
  return MODELS.find((m) => m.id === id);
}

export function getDefaultModel(): ModelInfo {
  return getModel(DEFAULT_MODEL_ID)!;
}

export function getModelChain(modelId: string): string[] {
  const model = getModel(modelId);
  if (!model) return [process.env.LLM_MODEL || "mistral-medium-3-5"];
  return [model.apiModel, ...(model.fallbacks || [])];
}

export const MODEL_STORAGE_KEY = "pulse:model";
