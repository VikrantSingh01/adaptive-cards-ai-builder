/**
 * Example Selector — Find the most relevant example cards for few-shot prompting
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface ExampleCard {
  name: string;
  content: Record<string, unknown>;
  tags: string[];
  intent: string[];
}

let cachedExamples: ExampleCard[] | null = null;

/**
 * Load and tag all example cards from the data/examples directory
 */
function loadExamples(): ExampleCard[] {
  if (cachedExamples) return cachedExamples;

  const examples: ExampleCard[] = [];

  try {
    // Resolve path relative to this module
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const examplesDir = join(__dirname, "..", "data", "examples");

    // Try loading from built location first, then source
    let dir: string;
    try {
      readdirSync(examplesDir);
      dir = examplesDir;
    } catch {
      // Fallback to source directory
      dir = join(__dirname, "..", "..", "src", "data", "examples");
    }

    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".data.json"),
    );

    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(dir, file), "utf-8"));
        const tags = inferTags(file, content);
        const intent = inferIntent(file, content);
        examples.push({ name: file, content, tags, intent });
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // No examples directory — return empty
  }

  cachedExamples = examples;
  return examples;
}

/**
 * Infer tags from filename and card content
 */
function inferTags(filename: string, card: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const lower = filename.toLowerCase();

  // From filename
  if (lower.includes("expense")) tags.push("expense", "approval", "finance");
  if (lower.includes("flight")) tags.push("flight", "travel", "itinerary");
  if (lower.includes("food") || lower.includes("restaurant"))
    tags.push("food", "order", "menu");
  if (lower.includes("weather")) tags.push("weather", "forecast");
  if (lower.includes("input") || lower.includes("form")) tags.push("form", "input");
  if (lower.includes("calendar")) tags.push("calendar", "reminder", "event");
  if (lower.includes("stock")) tags.push("stock", "finance", "update");
  if (lower.includes("image") || lower.includes("gallery"))
    tags.push("image", "gallery");
  if (lower.includes("order")) tags.push("order", "confirmation");
  if (lower.includes("activity")) tags.push("activity", "update", "notification");
  if (lower.includes("chart")) tags.push("chart", "data", "visualization");
  if (lower.includes("action")) tags.push("actions");
  if (lower.includes("list")) tags.push("list");
  if (lower.includes("container")) tags.push("container", "layout");
  if (lower.includes("template")) tags.push("template", "data-binding");

  // From card content
  if (card.body && Array.isArray(card.body)) {
    const types = new Set<string>();
    function walk(elements: unknown[]): void {
      for (const el of elements) {
        if (el && typeof el === "object") {
          const e = el as Record<string, unknown>;
          if (e.type) types.add(e.type as string);
          if (e.items && Array.isArray(e.items)) walk(e.items);
          if (e.columns && Array.isArray(e.columns)) {
            for (const col of e.columns) {
              const c = col as Record<string, unknown>;
              if (c.items && Array.isArray(c.items)) walk(c.items);
            }
          }
        }
      }
    }
    walk(card.body);

    if (types.has("Table")) tags.push("table");
    if (types.has("FactSet")) tags.push("facts");
    if (types.has("ImageSet")) tags.push("images");
    if (types.has("Input.Text") || types.has("Input.ChoiceSet")) tags.push("form");
    if (types.has("ColumnSet")) tags.push("columns", "layout");
  }

  return [...new Set(tags)];
}

/**
 * Infer card intent from filename and content
 */
function inferIntent(filename: string, _card: Record<string, unknown>): string[] {
  const intents: string[] = [];
  const lower = filename.toLowerCase();

  if (lower.includes("approval") || lower.includes("expense")) intents.push("approval");
  if (lower.includes("form") || lower.includes("input")) intents.push("form");
  if (lower.includes("update") || lower.includes("activity")) intents.push("notification");
  if (lower.includes("order") || lower.includes("confirmation")) intents.push("display");
  if (lower.includes("chart") || lower.includes("dashboard")) intents.push("dashboard");
  if (lower.includes("gallery") || lower.includes("image")) intents.push("gallery");
  if (lower.includes("list")) intents.push("list");
  if (lower.includes("calendar") || lower.includes("reminder")) intents.push("notification");
  if (lower.includes("weather") || lower.includes("stock")) intents.push("display");

  if (intents.length === 0) intents.push("display");
  return intents;
}

/**
 * Select the top N most relevant example cards for a given description/intent
 */
export function selectExamples(
  description: string,
  maxExamples: number = 3,
): ExampleCard[] {
  const examples = loadExamples();
  const lower = description.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);

  const scored = examples.map((example) => {
    let score = 0;
    // Tag matching
    for (const tag of example.tags) {
      if (lower.includes(tag)) score += 10;
      for (const word of words) {
        if (tag.includes(word) || word.includes(tag)) score += 5;
      }
    }
    // Intent matching
    for (const intent of example.intent) {
      if (lower.includes(intent)) score += 8;
    }
    // Filename matching
    const nameWords = example.name.replace(".json", "").split(/[-_]/);
    for (const nw of nameWords) {
      if (lower.includes(nw.toLowerCase())) score += 3;
    }
    return { example, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExamples)
    .filter((s) => s.score > 0)
    .map((s) => s.example);
}

/**
 * Get all loaded examples
 */
export function getAllExamples(): ExampleCard[] {
  return loadExamples();
}
