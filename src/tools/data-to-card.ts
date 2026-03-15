/**
 * data_to_card tool handler
 */

import type { DataToCardInput, GenerateCardOutput } from "../types/index.js";
import { assembleCard } from "../generation/card-assembler.js";
import { analyzeData } from "../generation/data-analyzer.js";
import { isLLMAvailable, generateWithLLM } from "../generation/llm-client.js";
import { buildSystemPrompt, buildDataToCardPrompt } from "../generation/prompt-builder.js";
import { handleValidateCard } from "./validate-card.js";

/**
 * Convert structured data into an optimal Adaptive Card
 */
export async function handleDataToCard(
  input: DataToCardInput,
): Promise<GenerateCardOutput> {
  const {
    data,
    presentation = "auto",
    title,
    host = "generic",
    theme,
    templateMode = false,
  } = input;

  const analysis = analyzeData(data);
  let card: Record<string, unknown>;
  let designNotes: string;

  // Try LLM for complex data structures
  if (isLLMAvailable() && (analysis.shape === "nested-object" || analysis.shape === "unknown")) {
    try {
      const systemPrompt = buildSystemPrompt(host);
      const userPrompt = buildDataToCardPrompt({
        data,
        title,
        presentation,
      });

      const response = await generateWithLLM({
        systemPrompt,
        userPrompt,
        maxTokens: 4096,
      });

      const parsed = extractJSON(response.content);
      if (parsed) {
        card = parsed;
        designNotes = `AI-generated from ${analysis.shape} data. ${analysis.summary}. Presentation: ${presentation === "auto" ? analysis.presentation : presentation}.`;
      } else {
        throw new Error("Failed to parse LLM output");
      }
    } catch {
      // Fallback to deterministic
      card = assembleCard({
        data,
        title,
        presentation,
        host,
      });
      designNotes = `Deterministic generation from ${analysis.shape} data. ${analysis.summary}. Auto-selected: ${analysis.presentation}.`;
    }
  } else {
    // Deterministic generation
    card = assembleCard({
      data,
      title,
      presentation,
      host,
    });
    designNotes = `Generated from ${analysis.shape} data. ${analysis.summary}. Presentation: ${presentation === "auto" ? analysis.presentation : presentation}.`;
  }

  // Validate
  const validation = handleValidateCard({ card, host });

  return {
    card,
    validation,
    designNotes,
  };
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Not direct JSON
  }
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Invalid
    }
  }
  const jsonMatch = text.match(/\{[\s\S]*"type"\s*:\s*"AdaptiveCard"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Invalid
    }
  }
  return null;
}
