/**
 * Groq SDK client for PULSE.
 * Uses Groq's official SDK for optimal streaming performance.
 *
 * Required env vars:
 *   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Model: openai/gpt-oss-120b (fast, free, good quality on Groq)
 */

import { Groq } from "groq-sdk";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY env var");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Stream chat completion using Groq SDK.
 * Uses openai/gpt-oss-120b — fast, free, good quality on Groq.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  modelChain: string[] = []
): AsyncGenerator<string, void, unknown> {
  const groq = getGroqClient();
  const model = "openai/gpt-oss-120b";

  try {
    console.log(`[chat] Streaming with Groq: ${model}`);

    const stream = await groq.chat.completions.create({
      model,
      messages: messages as any,
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 1,
      stream: true,
      reasoning_effort: "medium",
    });

    let hasYielded = false;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (typeof token === "string" && token.length > 0) {
        hasYielded = true;
        yield token;
      }
    }

    if (!hasYielded) {
      throw new Error("Empty response from Groq");
    }
  } catch (err) {
    console.error("[chat] Groq stream error:", err);
    throw err;
  }
}

// Non-streaming fallback
export async function createChatCompletion(
  messages: ChatMessage[],
  modelChain: string[] = []
): Promise<string> {
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: messages as any,
    temperature: 0.7,
    max_completion_tokens: 2048,
    top_p: 1,
    reasoning_effort: "medium",
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (content) return content;
  throw new Error("Empty response from Groq");
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