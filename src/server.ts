/**
 * Adaptive Cards AI Builder — MCP Server
 *
 * A Model Context Protocol server that converts any content into
 * schema-validated Adaptive Card v1.6 JSON.
 *
 * Usage:
 *   npx adaptive-cards-ai-builder          # Start MCP server
 *   ANTHROPIC_API_KEY=... npx adaptive-cards-ai-builder  # With LLM support
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleGenerateCard } from "./tools/generate-card.js";
import { handleValidateCard } from "./tools/validate-card.js";
import { handleDataToCard } from "./tools/data-to-card.js";
import { handleOptimizeCard } from "./tools/optimize-card.js";
import { handleTemplateCard } from "./tools/template-card.js";
import { handleTransformCard } from "./tools/transform-card.js";
import { handleSuggestLayout } from "./tools/suggest-layout.js";
import { initLLMFromEnv } from "./generation/llm-client.js";

// Initialize LLM from environment variables (optional)
initLLMFromEnv();

// Create MCP server
const server = new Server(
  {
    name: "adaptive-cards-ai-builder",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ─── Host enum (shared across tools) ────────────────────────────────────────

const HOST_ENUM = [
  "teams", "outlook", "webchat", "windows", "viva-connections", "webex", "generic",
];

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "generate_card",
    description:
      "Convert any content — natural language description, structured data, or a combination — into a valid Adaptive Card v1.6 JSON. Supports host-specific generation (Teams, Outlook, etc.) and optional templating.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description:
            "Natural language description of the card to generate, or paste raw data/text. Examples: 'Create a flight status card', 'Make an expense approval card with approve/reject buttons'",
        },
        data: {
          description:
            "Optional structured data (JSON object or CSV string) to incorporate into the card",
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description:
            "Target host app. Generates cards compatible with the host's supported schema version and elements. Default: generic",
        },
        theme: {
          type: "string",
          enum: ["light", "dark"],
          description: "Theme for styling hints",
        },
        intent: {
          type: "string",
          enum: [
            "display", "approval", "form", "notification", "dashboard",
            "report", "status", "profile", "list", "gallery",
          ],
          description:
            "The intent of the card — helps select the best layout pattern",
        },
        version: {
          type: "string",
          description: 'Target Adaptive Card schema version. Default: "1.6"',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "validate_card",
    description:
      "Validate an Adaptive Card JSON against the v1.6 schema. Returns detailed diagnostics: schema errors, accessibility score (0-100), host compatibility, structural stats (element count, nesting depth, element types), and best practice recommendations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          type: "object",
          description: "The Adaptive Card JSON object to validate",
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description:
            "Check compatibility with this host app. Default: generic",
        },
        strictMode: {
          type: "boolean",
          description:
            "When true, warnings are treated as errors. Default: false",
        },
      },
      required: ["card"],
    },
  },
  {
    name: "data_to_card",
    description:
      "Convert structured data (JSON array, CSV, key-value object) into the optimal Adaptive Card presentation. Auto-selects between Table, FactSet, Chart (Bar/Line/Pie), List, or Carousel based on data shape analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        data: {
          description:
            "The data to convert — JSON object, JSON array of objects, or CSV string",
        },
        presentation: {
          type: "string",
          enum: [
            "auto", "table", "facts", "chart-bar", "chart-line",
            "chart-pie", "chart-donut", "list", "carousel",
          ],
          description:
            'Presentation type. "auto" (default) analyzes data shape and picks the best option',
        },
        title: {
          type: "string",
          description: "Title for the card header",
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description: "Target host app. Default: generic",
        },
        templateMode: {
          type: "boolean",
          description:
            "Generate a templated card with ${expression} data binding instead of static values. Default: false",
        },
      },
      required: ["data"],
    },
  },
  {
    name: "optimize_card",
    description:
      "Optimize an existing Adaptive Card for accessibility, performance, compactness, or modern best practices. Returns the improved card with a detailed list of changes and before/after metrics.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          type: "object",
          description: "The Adaptive Card JSON object to optimize",
        },
        goals: {
          type: "array",
          items: {
            type: "string",
            enum: ["accessibility", "performance", "compact", "modern", "readability"],
          },
          description:
            'Optimization goals. Default: all. Options: "accessibility" (add altText, labels, wrap, speak), "performance" (flatten nesting, remove empties), "compact" (reduce spacing/padding), "modern" (Action.Execute, v1.6, heading styles), "readability" (separators, spacing)',
        },
        host: {
          type: "string",
          enum: HOST_ENUM,
          description: "Target host app for host-specific optimizations",
        },
      },
      required: ["card"],
    },
  },
  {
    name: "template_card",
    description:
      "Convert a static Adaptive Card into an Adaptive Card Template with ${expression} data binding, $data repeaters, and $when conditionals. Returns the template, sample data, expression list, and a binding guide.",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          type: "object",
          description: "A static Adaptive Card to convert into a template. If omitted, provide a description to generate a templated card from scratch.",
        },
        dataShape: {
          type: "object",
          description: "Optional data shape hint — keys describe the expected data fields",
        },
        description: {
          type: "string",
          description: "If no card is provided, describe the card to generate as a template",
        },
      },
    },
  },
  {
    name: "transform_card",
    description:
      "Transform an Adaptive Card: upgrade/downgrade version, apply host-specific constraints, or flatten nesting. Handles element replacement (e.g., Table→ColumnSet for v1.3, Action.Submit→Action.Execute).",
    inputSchema: {
      type: "object" as const,
      properties: {
        card: {
          type: "object",
          description: "The Adaptive Card JSON object to transform",
        },
        transform: {
          type: "string",
          enum: ["upgrade-version", "downgrade-version", "apply-host-config", "flatten"],
          description: "The type of transformation to apply",
        },
        targetVersion: {
          type: "string",
          description: 'Target version for upgrade/downgrade (e.g., "1.3", "1.5", "1.6")',
        },
        targetHost: {
          type: "string",
          enum: HOST_ENUM,
          description: "Target host for apply-host-config transform",
        },
      },
      required: ["card", "transform"],
    },
  },
  {
    name: "suggest_layout",
    description:
      "Recommend the best Adaptive Card layout pattern for a given description. Returns the suggested pattern with elements, layout rationale, and alternative options — without generating a full card.",
    inputSchema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "Describe the card you want to build — e.g., 'team roster with photos and roles' or 'deployment status dashboard'",
        },
        constraints: {
          type: "object",
          properties: {
            interactive: {
              type: "boolean",
              description: "Whether the card needs user input/actions",
            },
            targetHost: {
              type: "string",
              enum: HOST_ENUM,
              description: "Target host app",
            },
          },
        },
      },
      required: ["description"],
    },
  },
];

// ─── Request Handlers ────────────────────────────────────────────────────────

// Handle tools/list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tools/call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // MCP clients may send JSON fields as strings — parse them
    const parsed = { ...args } as Record<string, unknown>;
    for (const key of ["card", "data", "dataShape", "constraints"]) {
      if (typeof parsed[key] === "string") {
        try {
          parsed[key] = JSON.parse(parsed[key] as string);
        } catch {
          // Leave as string (e.g., CSV data)
        }
      }
    }
    if (typeof parsed.goals === "string") {
      try { parsed.goals = JSON.parse(parsed.goals as string); } catch { /* leave */ }
    }

    let result: unknown;

    switch (name) {
      case "generate_card":
        result = await handleGenerateCard(parsed as any);
        break;
      case "validate_card":
        result = handleValidateCard(parsed as any);
        break;
      case "data_to_card":
        result = await handleDataToCard(parsed as any);
        break;
      case "optimize_card":
        result = handleOptimizeCard(parsed as any);
        break;
      case "template_card":
        result = handleTemplateCard(parsed as any);
        break;
      case "transform_card":
        result = handleTransformCard(parsed as any);
        break;
      case "suggest_layout":
        result = handleSuggestLayout(parsed as any);
        break;
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Adaptive Cards AI Builder MCP Server started (7 tools)");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
