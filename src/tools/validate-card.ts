/**
 * validate_card tool handler
 */

import type { ValidateCardInput, ValidationResult } from "../types/index.js";
import { validateCard } from "../core/schema-validator.js";
import { analyzeCard, findDuplicateIds } from "../core/card-analyzer.js";
import { checkAccessibility } from "../core/accessibility-checker.js";
import { checkHostCompatibility } from "../core/host-compatibility.js";

/**
 * Validate an Adaptive Card and return comprehensive diagnostics
 */
export function handleValidateCard(input: ValidateCardInput): ValidationResult {
  const { card, host = "generic", strictMode = false } = input;

  // Schema validation
  const schemaResult = validateCard(card);

  // Card analysis
  const stats = analyzeCard(card);

  // Accessibility check
  const accessibility = checkAccessibility(card);

  // Host compatibility
  const hostCompatibility = checkHostCompatibility(card, host);

  // Structural best-practice checks
  const errors = [...schemaResult.errors];

  // Check duplicate IDs
  const dupeIds = findDuplicateIds(card);
  for (const id of dupeIds) {
    errors.push({
      path: `(id="${id}")`,
      message: `Duplicate element ID: "${id}"`,
      severity: "error",
      rule: "duplicate-id",
    });
  }

  // Nesting depth warning
  if (stats.nestingDepth > 5) {
    errors.push({
      path: "$.body",
      message: `Nesting depth is ${stats.nestingDepth} (recommended max: 5)`,
      severity: "warning",
      rule: "nesting-depth",
    });
  }

  // Element count warning
  if (stats.elementCount > 50) {
    errors.push({
      path: "$.body",
      message: `Card has ${stats.elementCount} elements (recommended max: 50)`,
      severity: "warning",
      rule: "element-count",
    });
  }

  // Best practice: Action.Submit deprecation
  if (stats.actionTypes.includes("Action.Submit")) {
    errors.push({
      path: "(actions)",
      message: "Consider using Action.Execute instead of Action.Submit for Universal Actions support",
      severity: "info",
      rule: "prefer-execute",
    });
  }

  // Host compatibility as errors/warnings
  for (const unsupported of hostCompatibility.unsupportedElements) {
    errors.push({
      path: unsupported.path,
      message: unsupported.reason,
      severity: strictMode ? "error" : "warning",
      rule: "host-compatibility",
    });
  }

  const hasErrors = errors.some((e) => e.severity === "error");
  const hasWarnings = errors.some((e) => e.severity === "warning");

  return {
    valid: strictMode ? !hasErrors && !hasWarnings : !hasErrors,
    errors,
    accessibility,
    hostCompatibility,
    stats,
  };
}
