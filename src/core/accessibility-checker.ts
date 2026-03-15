/**
 * Accessibility Checker — WCAG compliance checks for Adaptive Cards
 */

import type { AccessibilityReport } from "../types/index.js";

/**
 * Check an Adaptive Card for accessibility issues and return a score + issues list
 */
export function checkAccessibility(
  card: Record<string, unknown>,
): AccessibilityReport {
  const issues: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check card-level speak property
  totalChecks++;
  if (card.speak && typeof card.speak === "string") {
    passedChecks++;
  } else {
    issues.push(
      "Card is missing 'speak' property for screen reader accessibility",
    );
  }

  // Walk all elements
  function walkElements(elements: unknown[], parentPath: string): void {
    if (!Array.isArray(elements)) return;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as Record<string, unknown>;
      if (!el || typeof el !== "object") continue;
      const path = `${parentPath}[${i}]`;
      const type = el.type as string;

      switch (type) {
        case "Image":
          checkImage(el, path);
          break;
        case "TextBlock":
          checkTextBlock(el, path);
          break;
        case "Input.Text":
        case "Input.Number":
        case "Input.Date":
        case "Input.Time":
        case "Input.Toggle":
        case "Input.ChoiceSet":
        case "Input.Rating":
          checkInput(el, path);
          break;
      }

      // Recurse into containers
      if (el.items && Array.isArray(el.items)) {
        walkElements(el.items, `${path}.items`);
      }
      if (el.columns && Array.isArray(el.columns)) {
        for (let c = 0; c < el.columns.length; c++) {
          const col = el.columns[c] as Record<string, unknown>;
          if (col && col.items && Array.isArray(col.items)) {
            walkElements(col.items, `${path}.columns[${c}].items`);
          }
        }
      }
      if (el.rows && Array.isArray(el.rows)) {
        for (let r = 0; r < el.rows.length; r++) {
          const row = el.rows[r] as Record<string, unknown>;
          if (row && row.cells && Array.isArray(row.cells)) {
            for (let ce = 0; ce < row.cells.length; ce++) {
              const cell = row.cells[ce] as Record<string, unknown>;
              if (cell && cell.items && Array.isArray(cell.items)) {
                walkElements(
                  cell.items,
                  `${path}.rows[${r}].cells[${ce}].items`,
                );
              }
            }
          }
        }
      }
      if (el.actions && Array.isArray(el.actions)) {
        checkActions(el.actions, `${path}.actions`);
      }
    }
  }

  function checkImage(el: Record<string, unknown>, path: string): void {
    totalChecks++;
    if (el.altText && typeof el.altText === "string" && el.altText.length > 0) {
      passedChecks++;
    } else {
      issues.push(`${path}: Image missing 'altText' for screen readers`);
    }
  }

  function checkTextBlock(el: Record<string, unknown>, path: string): void {
    totalChecks++;
    if (el.wrap === true) {
      passedChecks++;
    } else {
      issues.push(
        `${path}: TextBlock missing 'wrap: true' — text may be truncated on small screens`,
      );
    }
  }

  function checkInput(el: Record<string, unknown>, path: string): void {
    totalChecks++;
    if (el.label && typeof el.label === "string" && el.label.length > 0) {
      passedChecks++;
    } else {
      issues.push(
        `${path}: ${el.type} input missing 'label' for accessibility`,
      );
    }

    // Check for ID (needed for form submission)
    totalChecks++;
    if (el.id && typeof el.id === "string") {
      passedChecks++;
    } else {
      issues.push(
        `${path}: ${el.type} input missing 'id' — required for form submission`,
      );
    }
  }

  function checkActions(actions: unknown[], parentPath: string): void {
    if (!Array.isArray(actions)) return;
    for (let i = 0; i < actions.length; i++) {
      const act = actions[i] as Record<string, unknown>;
      if (!act || typeof act !== "object") continue;

      totalChecks++;
      if (
        act.title &&
        typeof act.title === "string" &&
        act.title.length > 0
      ) {
        passedChecks++;
      } else {
        issues.push(
          `${parentPath}[${i}]: Action missing 'title' for accessibility`,
        );
      }

      // Recurse into ShowCard
      if (act.card && typeof act.card === "object") {
        const subCard = act.card as Record<string, unknown>;
        if (subCard.body && Array.isArray(subCard.body)) {
          walkElements(subCard.body, `${parentPath}[${i}].card.body`);
        }
      }
    }
  }

  // Walk body
  if (card.body && Array.isArray(card.body)) {
    walkElements(card.body, "$.body");
  }

  // Check top-level actions
  if (card.actions && Array.isArray(card.actions)) {
    checkActions(card.actions, "$.actions");
  }

  // Calculate score
  const score =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return { score, issues };
}
