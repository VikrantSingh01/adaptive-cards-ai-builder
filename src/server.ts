#!/usr/bin/env node
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
          enum: [
            "teams",
            "outlook",
            "webchat",
            "windows",
            "viva-connections",
            "webex",
            "generic",
          ],
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
            "display",
            "approval",
            "form",
            "notification",
            "dashboard",
            "report",
            "status",
            "profile",
            "list",
            "gallery",
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
          enum: [
            "teams",
            "outlook",
            "webchat",
            "windows",
            "viva-connections",
            "webex",
            "generic",
          ],
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
            "auto",
            "table",
            "facts",
            "chart-bar",
            "chart-line",
            "chart-pie",
            "chart-donut",
            "list",
            "carousel",
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
          enum: [
            "teams",
            "outlook",
            "webchat",
            "windows",
            "viva-connections",
            "webex",
            "generic",
          ],
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
    switch (name) {
      case "generate_card": {
        const result = await handleGenerateCard(args as any);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "validate_card": {
        const result = handleValidateCard(args as any);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "data_to_card": {
        const result = await handleDataToCard(args as any);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Adaptive Cards AI Builder MCP Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
