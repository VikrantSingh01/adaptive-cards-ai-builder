/**
 * Adaptive Cards AI Builder — Library Entry Point
 *
 * Exports core functions for programmatic use:
 *   import { generateCard, validateCard, dataToCard } from 'adaptive-cards-ai-builder'
 */

// Core modules
export { validateCard, getValidElementTypes, getValidActionTypes } from "./core/schema-validator.js";
export { analyzeCard, findDuplicateIds, countElements } from "./core/card-analyzer.js";
export { checkAccessibility } from "./core/accessibility-checker.js";
export {
  checkHostCompatibility,
  getHostSupport,
  getAllHostSupport,
} from "./core/host-compatibility.js";

// Tool handlers (high-level API)
export { handleGenerateCard as generateCard } from "./tools/generate-card.js";
export { handleValidateCard as validateCardFull } from "./tools/validate-card.js";
export { handleDataToCard as dataToCard } from "./tools/data-to-card.js";

// Generation utilities
export { assembleCard } from "./generation/card-assembler.js";
export { analyzeData, parseCSV } from "./generation/data-analyzer.js";
export { getAllPatterns, findPatternByIntent, findPatternByName, scorePatterns } from "./generation/layout-patterns.js";
export { selectExamples } from "./generation/example-selector.js";

// LLM configuration
export { configureLLM, isLLMAvailable, initLLMFromEnv } from "./generation/llm-client.js";

// Types
export type * from "./types/index.js";
