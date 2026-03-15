/**
 * Card Analyzer — Analyze structure, compute stats, and inspect Adaptive Card JSON
 */

import type { CardStats } from "../types/index.js";

/**
 * Analyze an Adaptive Card and return structural statistics
 */
export function analyzeCard(card: Record<string, unknown>): CardStats {
  const elementTypes = new Set<string>();
  const actionTypes = new Set<string>();
  let elementCount = 0;
  let inputCount = 0;
  let imageCount = 0;
  let maxDepth = 0;

  function walkElements(elements: unknown[], depth: number): void {
    if (!Array.isArray(elements)) return;
    maxDepth = Math.max(maxDepth, depth);

    for (const el of elements) {
      if (!el || typeof el !== "object") continue;
      const element = el as Record<string, unknown>;
      const type = element.type as string;
      if (!type) continue;

      elementCount++;
      elementTypes.add(type);

      if (type.startsWith("Input.")) inputCount++;
      if (type === "Image") imageCount++;

      // Recurse into nested containers
      if (element.items && Array.isArray(element.items)) {
        walkElements(element.items, depth + 1);
      }
      if (element.columns && Array.isArray(element.columns)) {
        for (const col of element.columns) {
          const column = col as Record<string, unknown>;
          if (column.items && Array.isArray(column.items)) {
            walkElements(column.items, depth + 1);
          }
        }
      }
      if (element.rows && Array.isArray(element.rows)) {
        for (const row of element.rows) {
          const rowObj = row as Record<string, unknown>;
          if (rowObj.cells && Array.isArray(rowObj.cells)) {
            for (const cell of rowObj.cells) {
              const cellObj = cell as Record<string, unknown>;
              if (cellObj.items && Array.isArray(cellObj.items)) {
                walkElements(cellObj.items, depth + 1);
              }
            }
          }
        }
      }
      if (element.images && Array.isArray(element.images)) {
        walkElements(element.images, depth + 1);
      }
      // ActionSet actions
      if (element.actions && Array.isArray(element.actions)) {
        walkActions(element.actions);
      }
      // Carousel pages
      if (element.pages && Array.isArray(element.pages)) {
        walkElements(element.pages, depth + 1);
      }
    }
  }

  function walkActions(actions: unknown[]): void {
    if (!Array.isArray(actions)) return;
    for (const act of actions) {
      if (!act || typeof act !== "object") continue;
      const action = act as Record<string, unknown>;
      const type = action.type as string;
      if (type) actionTypes.add(type);

      // ShowCard has nested card
      if (action.card && typeof action.card === "object") {
        const subCard = action.card as Record<string, unknown>;
        if (subCard.body && Array.isArray(subCard.body)) {
          walkElements(subCard.body, 1);
        }
        if (subCard.actions && Array.isArray(subCard.actions)) {
          walkActions(subCard.actions);
        }
      }
    }
  }

  // Walk body
  if (card.body && Array.isArray(card.body)) {
    walkElements(card.body, 0);
  }

  // Walk top-level actions
  if (card.actions && Array.isArray(card.actions)) {
    walkActions(card.actions);
  }

  // Detect templating expressions
  const hasTemplating = detectTemplating(card);

  return {
    elementCount,
    nestingDepth: maxDepth,
    hasTemplating,
    version: (card.version as string) || "unknown",
    elementTypes: Array.from(elementTypes).sort(),
    actionTypes: Array.from(actionTypes).sort(),
    inputCount,
    imageCount,
  };
}

/**
 * Check if a card uses Adaptive Card Templating expressions
 */
function detectTemplating(obj: unknown): boolean {
  if (typeof obj === "string") {
    return obj.includes("${") || obj.includes("$data") || obj.includes("$when");
  }
  if (Array.isArray(obj)) {
    return obj.some(detectTemplating);
  }
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if ("$data" in record || "$when" in record) return true;
    return Object.values(record).some(detectTemplating);
  }
  return false;
}

/**
 * Find all duplicate element IDs in a card
 */
export function findDuplicateIds(card: Record<string, unknown>): string[] {
  const ids = new Map<string, number>();

  function walk(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    const record = obj as Record<string, unknown>;
    if (typeof record.id === "string") {
      ids.set(record.id, (ids.get(record.id) || 0) + 1);
    }
    Object.values(record).forEach(walk);
  }

  walk(card);
  return Array.from(ids.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
}

/**
 * Count the total number of elements in a card (including nested)
 */
export function countElements(card: Record<string, unknown>): number {
  return analyzeCard(card).elementCount;
}
