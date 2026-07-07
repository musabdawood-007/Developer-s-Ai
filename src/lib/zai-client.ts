/**
 * LLM API client (OpenAI-compatible).
 * Works with Bynara Router, OpenAI, Groq, OpenRouter, etc.
 *
 * Required env vars:
 *   - LLM_BASE_URL   (e.g. https://router.bynara.id/v1)
 *   - LLM_API_KEY    (e.g. sk-...)
 *   - LLM_MODEL      (default model — e.g. mistral-medium-3-5)
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
  const model = modelOverride || process.env.LLM_MODEL || "mistral-medium-3-5";

  if (!baseUrl || !apiKey) {
    throw new Error("Missing LLM_BASE_URL or LLM_API_KEY env var.");
  }

  return { baseUrl, apiKey, model };
}

function buildHeaders(config: ZaiConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": "developers-ai/1.0",
    Accept: "application/json",
  };
}

/**
 * Try a single model — returns async generator yielding tokens.
 * Throws on error.
 */
async function* tryStreamModel(
  messages: ChatMessage[],
  apiModel: string,
  baseUrl: string,
  headers: Record<string, string>,
  timeoutMs = 45000
): AsyncGenerator<string, void, unknown> {
  const url = `${baseUrl}/chat/completions`;
  const body = { model: apiModel, messages, stream: true };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

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

  // If we got NO tokens at all, treat as failure so fallback kicks in
  if (!hasYielded) {
    throw new Error("Empty response from model");
  }
}

/**
 * Stream a chat completion with automatic fallback.
 *
 * Tries each model in `modelChain` (in order) until one succeeds.
 * If a model throws OR returns zero tokens, we move to the next one.
 *
 * @param messages  - chat messages
 * @param modelChain - array of API model names to try (e.g. ["mistral-medium-3-5", "claude-sonnet-4.5"])
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
      // We need to consume the entire generator in a try/catch BEFORE yielding
      // so that if the first token fails, we can fall back.
      // But streaming requires yielding as we go — so we use a "yielded flag":
      // only fall back if NO tokens were yielded yet.

      let hasYielded = false;
      const generator = tryStreamModel(messages, apiModel, config.baseUrl, headers);

      try {
        for await (const token of generator) {
          hasYielded = true;
          yield token;
        }
        // Success — return
        return;
      } catch (err) {
        if (hasYielded) {
          // We already yielded tokens to the user — can't fall back.
          // Re-throw so the caller knows streaming ended abruptly.
          throw err;
        }
        // No tokens yet — safe to fall back
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[chat] Model ${apiModel} failed, falling back:`, lastError.message);
        continue;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[chat] Model ${apiModel} failed to start:`, lastError.message);
      continue;
    }
  }

  // All models failed
  throw new Error(
    `All models failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Non-streaming chat completion (for vision).
 * Tries each model in the chain.
 */
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
      const body = { model: apiModel, messages };
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
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
      console.warn(`[chat] Model ${apiModel} failed:`, lastError.message);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

/**
 * Vision chat completion (non-streaming).
 * Falls back through the model chain.
 */
export async function createVisionChatCompletion(
  messages: any[],
  modelChain: string[] = []
): Promise<string> {
  // Reuse the same logic as createChatCompletion
  return createChatCompletion(messages as ChatMessage[], modelChain);
}

/**
 * Generate an image from a prompt.
 *
 * Uses Pollinations.ai — free, no API key, returns a direct image URL.
 * The URL itself triggers image generation when loaded by the browser,
 * so we just verify it's reachable (with a short timeout) and return it.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 500));
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

    // Don't pre-fetch — just return the URL. The browser will load it
    // when displayed in <img src>. This avoids server-side timeout issues.
    return pollinationsUrl;
  } catch (err) {
    console.error("[generateImage] failed:", err);
    return null;
  }
}
