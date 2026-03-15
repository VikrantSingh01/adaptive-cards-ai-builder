/**
 * Prompt Builder — Construct LLM prompts with schema context and few-shot examples
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { selectExamples } from "./example-selector.js";
import type { HostApp, CardIntent } from "../types/index.js";

let cachedSchema: string | null = null;

function loadSchema(): string {
  if (cachedSchema) return cachedSchema;
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    // Try dist location first
    let schemaPath = join(__dirname, "..", "data", "schema.json");
    try {
      cachedSchema = readFileSync(schemaPath, "utf-8");
    } catch {
      // Try source location
      schemaPath = join(__dirname, "..", "..", "src", "data", "schema.json");
      cachedSchema = readFileSync(schemaPath, "utf-8");
    }
    return cachedSchema!;
  } catch {
    return "Schema not available";
  }
}

/**
 * Build the system prompt for card generation
 */
export function buildSystemPrompt(host?: HostApp): string {
  const schema = loadSchema();

  return `You are an expert Adaptive Card v1.6 architect. You generate valid, production-ready Adaptive Card JSON.

## Schema (v1.6)
${schema}

## Rules
1. ALWAYS output valid JSON. The root object must have "type": "AdaptiveCard" and "version": "1.6".
2. Use proper element types: TextBlock, Image, Container, ColumnSet, FactSet, Table, ActionSet, etc.
3. Use proper action types: Action.Execute (preferred), Action.OpenUrl, Action.ShowCard, Action.ToggleVisibility.
4. ALWAYS set "wrap": true on TextBlock elements.
5. ALWAYS include "altText" on Image elements.
6. ALWAYS include "label" and "id" on Input elements.
7. Use "style": "heading" on title TextBlocks.
8. Prefer Action.Execute over Action.Submit for new cards.
9. Use "style": "emphasis" on header Containers for visual separation.
10. Use ColumnSet for side-by-side layouts, Table for tabular data, FactSet for key-value pairs.
${host && host !== "generic" ? `\n## Host: ${host}\nGenerate cards compatible with ${host}. Avoid unsupported elements.` : ""}

## Output Format
Return ONLY the Adaptive Card JSON object. No markdown, no explanation, no code fences.`;
}

/**
 * Build the user prompt for card generation
 */
export function buildUserPrompt(options: {
  content: string;
  data?: unknown;
  intent?: CardIntent;
  host?: HostApp;
}): string {
  const parts: string[] = [];

  // Add relevant examples
  const examples = selectExamples(options.content, 2);
  if (examples.length > 0) {
    parts.push("## Reference Examples\nUse these as style/structure references:\n");
    for (const ex of examples) {
      parts.push(`### ${ex.name}\n\`\`\`json\n${JSON.stringify(ex.content, null, 2).slice(0, 2000)}\n\`\`\`\n`);
    }
  }

  // Add the request
  parts.push("## Request");
  parts.push(options.content);

  if (options.intent) {
    parts.push(`\nIntent: ${options.intent}`);
  }

  if (options.data) {
    const dataStr =
      typeof options.data === "string"
        ? options.data
        : JSON.stringify(options.data, null, 2);
    parts.push(`\n## Data to incorporate\n\`\`\`json\n${dataStr.slice(0, 3000)}\n\`\`\``);
  }

  parts.push("\nGenerate the Adaptive Card JSON now.");

  return parts.join("\n");
}

/**
 * Build a prompt specifically for data-to-card conversion
 */
export function buildDataToCardPrompt(options: {
  data: unknown;
  title?: string;
  presentation?: string;
}): string {
  const dataStr =
    typeof options.data === "string"
      ? options.data
      : JSON.stringify(options.data, null, 2);

  return `Convert this data into an Adaptive Card. ${options.title ? `Title: "${options.title}".` : ""} ${options.presentation && options.presentation !== "auto" ? `Use ${options.presentation} presentation.` : "Choose the best presentation (Table for tabular data, FactSet for key-value pairs, Chart for numeric series, List for simple items)."}

Data:
\`\`\`
${dataStr.slice(0, 4000)}
\`\`\`

Generate the Adaptive Card JSON now.`;
}
