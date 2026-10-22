/**
 * Available AI conversation modes for PULSE.
 * Uses Groq SDK with openai/gpt-oss-120b — fast, free, good quality.
 */

export type ModelTier = "free" | "pro";

export interface ModelInfo {
  id: string;
  label: string;
  tagline: string;
  apiModel: string;
  provider: string;
  dailyLimit: number;
  tier: ModelTier;
  badge: string;
  order: number;
  fallbacks?: string[];
}

export const FREE_DAILY_LIMIT = 30;

export const MODELS: ModelInfo[] = [
  {
    id: "pulse-gpt-oss",
    label: "PULSE GPT-OSS",
    tagline: "🧠 Smart & fast — Groq powered",
    apiModel: "openai/gpt-oss-120b",
    provider: "Groq",
    dailyLimit: FREE_DAILY_LIMIT,
    tier: "free",
    badge: "🧠",
    order: 1,
    fallbacks: [],
  },
];

export const DEFAULT_MODEL_ID = "pulse-gpt-oss";

export function getModel(id: string | undefined): ModelInfo | undefined {
  if (!id) return undefined;
  return MODELS.find((m) => m.id === id);
}

export function getDefaultModel(): ModelInfo {
  return getModel(DEFAULT_MODEL_ID)!;
}

export function getModelChain(modelId: string): string[] {
  const model = getModel(modelId);
  if (!model) return ["openai/gpt-oss-120b"];
  return [model.apiModel, ...(model.fallbacks || [])];
}