/**
 * LLM API client (OpenAI-compatible).
 * Optimized for LOW LATENCY streaming.
 *
 * Required env vars (set in Vercel):
 *   LLM_BASE_URL=https://api.groq.com/openai/v1
 *   LLM_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
 *   LLM_MODEL=llama-3.1-8b-instant
 *
 * Alternative fast providers:
 * - Together: LLM_BASE_URL=https://api.together.xyz/v1
 * - OpenRouter: LLM_BASE_URL=https://openrouter.ai/api/v1
 * - Cerebras: LLM_BASE_URL=https://api.cerebras.ai/v1
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getZaiConfig(modelOverride?: string): ZaiConfig {
  const baseUrl = process.env.LLM_BASE_URL || process.env.ZAI_BASE_URL;
  const apiKey = process.env.LLM_API_KEY || process.env.ZAI_API_KEY;
  const model = modelOverride || process.env.LLM_MODEL || "llama-3.1-8b-instant";

  if (!baseUrl || !apiKey) {
    throw new Error("Missing LLM_BASE_URL or LLM_API_KEY env var.");
  }

  return { baseUrl, apiKey, model };
}

function buildHeaders(config: ZaiConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": "pulse/1.0",
    Accept: "text/event-stream",
  };
}

/**
 * Stream from a single model with aggressive timeout for fast first token.
 */
async function* tryStreamModel(
  messages: ChatMessage[],
  apiModel: string,
  baseUrl: string,
  headers: Record<string, string>,
  timeoutMs = 15000  // Reduced from 45s to 15s for faster fallback
): AsyncGenerator<string, void, unknown> {
  const url = `${baseUrl}/chat/completions`;
  const body = { model: apiModel, messages, stream: true, max_tokens: 500 };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let hasYielded = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta;
          if (!delta) continue;
          const token = delta?.content;
          if (typeof token === "string" && token.length > 0) {
            hasYielded = true;
            yield token;
          }
        } catch {}
      }
    }

    if (!hasYielded) {
      throw new Error("Empty response from model");
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Stream with automatic fallback chain.
 * Tries each model in order, falls back immediately on failure.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  modelChain: string[] = []
): AsyncGenerator<string, void, unknown> {
  const config = getZaiConfig();
  const headers = buildHeaders(config);
  const chain = modelChain.length > 0 ? modelChain : [config.model];

  let lastError: Error | null = null;

  for (let i = 0; i < chain.length; i++) {
    const apiModel = chain[i];
    try {
      console.log(`[chat] Trying model ${i + 1}/${chain.length}: ${apiModel}`);
      let hasYielded = false;

      for await (const token of tryStreamModel(messages, apiModel, config.baseUrl, headers)) {
        hasYielded = true;
        yield token;
      }
      if (hasYielded) return; // Success - exit
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[chat] Model ${apiModel} failed: ${lastError.message}`);
      // Immediate fallback - no delay
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// Non-streaming completion (for fallback/background tasks)
export async function createChatCompletion(
  messages: ChatMessage[],
  modelChain: string[] = []
): Promise<string> {
  const config = getZaiConfig();
  const headers = buildHeaders(config);
  const chain = modelChain.length > 0 ? modelChain : [config.model];

  let lastError: Error | null = null;

  for (const apiModel of chain) {
    try {
      const url = `${config.baseUrl}/chat/completions`;
      const body = { model: apiModel, messages, max_tokens: 500 };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content) return content;
      throw new Error("Empty response");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[chat] Model ${apiModel} failed: ${lastError.message}`);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

export async function createVisionChatCompletion(
  messages: any[],
  modelChain: string[] = []
): Promise<string> {
  return createChatCompletion(messages as ChatMessage[], modelChain);
}

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 500));
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
  } catch (err) {
    console.error("[generateImage] failed:", err);
    return null;
  }
}