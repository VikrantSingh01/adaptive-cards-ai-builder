/**
 * LLM Client — Optional Claude/OpenAI API integration for complex card generation
 *
 * When an API key is configured, uses the LLM for creative card generation.
 * Falls back to deterministic pattern matching when no key is available.
 */

import type { LLMConfig, LLMGenerateRequest, LLMGenerateResponse } from "../types/index.js";

let currentConfig: LLMConfig | null = null;

/**
 * Configure the LLM client with API credentials
 */
export function configureLLM(config: LLMConfig): void {
  currentConfig = config;
}

/**
 * Check if LLM is configured and available
 */
export function isLLMAvailable(): boolean {
  return currentConfig !== null && currentConfig.apiKey.length > 0;
}

/**
 * Get current LLM configuration
 */
export function getLLMConfig(): LLMConfig | null {
  return currentConfig;
}

/**
 * Initialize LLM from environment variables
 */
export function initLLMFromEnv(): void {
  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    configureLLM({
      provider: "anthropic",
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    });
    return;
  }

  // Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    configureLLM({
      provider: "openai",
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    });
    return;
  }
}

/**
 * Generate text using the configured LLM
 */
export async function generateWithLLM(
  request: LLMGenerateRequest,
): Promise<LLMGenerateResponse> {
  if (!currentConfig) {
    throw new Error("LLM not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
  }

  if (currentConfig.provider === "anthropic") {
    return callAnthropic(request);
  } else {
    return callOpenAI(request);
  }
}

async function callAnthropic(
  request: LLMGenerateRequest,
): Promise<LLMGenerateResponse> {
  const config = currentConfig!;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  const textContent = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  return {
    content: textContent,
    usage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    },
  };
}

async function callOpenAI(
  request: LLMGenerateRequest,
): Promise<LLMGenerateResponse> {
  const config = currentConfig!;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      max_tokens: request.maxTokens || 4096,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content || "",
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    },
  };
}
