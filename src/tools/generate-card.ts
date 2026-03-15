/**
 * generate_card tool handler
 */

import type { GenerateCardInput, GenerateCardOutput } from "../types/index.js";
import { assembleCard } from "../generation/card-assembler.js";
import { isLLMAvailable, generateWithLLM } from "../generation/llm-client.js";
import { buildSystemPrompt, buildUserPrompt } from "../generation/prompt-builder.js";
import { handleValidateCard } from "./validate-card.js";

/**
 * Generate an Adaptive Card from content description and optional data
 */
export async function handleGenerateCard(
  input: GenerateCardInput,
): Promise<GenerateCardOutput> {
  const { content, data, host = "generic", intent, version = "1.6" } = input;

  let card: Record<string, unknown>;
  let designNotes: string;

  // Try LLM generation first if available
  if (isLLMAvailable()) {
    try {
      const result = await generateCardWithLLM(input);
      card = result.card;
      designNotes = result.designNotes;
    } catch (err) {
      // Fallback to deterministic generation
      card = assembleCard({
        content,
        data: data as unknown,
        intent,
        host,
        version,
      });
      designNotes = `Deterministic generation (LLM fallback due to: ${err instanceof Error ? err.message : "unknown error"}). Pattern-matched card based on content analysis.`;
    }
  } else {
    // Deterministic generation
    card = assembleCard({
      content,
      data: data as unknown,
      intent,
      host,
      version,
    });
    designNotes =
      "Deterministic generation (no LLM API key). Card assembled from pattern matching and data analysis. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for AI-powered generation.";
  }

  // Validate the generated card
  const validation = handleValidateCard({ card, host });

  return {
    card,
    validation,
    designNotes,
  };
}

async function generateCardWithLLM(
  input: GenerateCardInput,
): Promise<{ card: Record<string, unknown>; designNotes: string }> {
  const systemPrompt = buildSystemPrompt(input.host);
  const userPrompt = buildUserPrompt({
    content: input.content,
    data: input.data,
    intent: input.intent,
    host: input.host,
  });

  const response = await generateWithLLM({
    systemPrompt,
    userPrompt,
    maxTokens: 4096,
  });

  // Parse the JSON from the response
  const card = extractJSON(response.content);
  if (!card) {
    throw new Error("LLM response did not contain valid Adaptive Card JSON");
  }

  const designNotes = `AI-generated card using ${response.usage ? `${response.usage.inputTokens + response.usage.outputTokens} tokens` : "LLM"}. Validated against v1.6 schema.`;

  return { card, designNotes };
}

/**
 * Extract JSON object from LLM response text
 */
function extractJSON(text: string): Record<string, unknown> | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && parsed.type === "AdaptiveCard") {
      return parsed;
    }
  } catch {
    // Not direct JSON
  }

  // Try extracting from code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Invalid JSON in fence
    }
  }

  // Try finding JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*"type"\s*:\s*"AdaptiveCard"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Invalid JSON
    }
  }

  return null;
}
