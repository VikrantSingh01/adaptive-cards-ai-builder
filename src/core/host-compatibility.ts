/**
 * Host Compatibility Checker — Validates card compatibility with specific host apps
 */

import type { HostApp, HostCompatibilityReport, HostVersionSupport } from "../types/index.js";
import { analyzeCard } from "./card-analyzer.js";

/**
 * Host-specific version and feature support map
 */
const HOST_SUPPORT: Record<HostApp, HostVersionSupport> = {
  teams: {
    host: "teams",
    maxVersion: "1.5",
    unsupportedElements: ["Media"],
    unsupportedActions: [],
    maxActions: 6,
    notes: [
      "Teams supports up to v1.5 on most clients",
      "Carousel requires Teams v1.6 client (limited rollout)",
      "Charts are Teams-specific extensions",
      "Action.Execute preferred over Action.Submit for Universal Actions",
    ],
  },
  outlook: {
    host: "outlook",
    maxVersion: "1.4",
    unsupportedElements: [
      "Media",
      "Carousel",
      "Accordion",
      "TabSet",
      "List",
      "CompoundButton",
      "CodeBlock",
      "Rating",
      "ProgressBar",
      "ProgressRing",
      "Spinner",
      "DonutChart",
      "BarChart",
      "LineChart",
      "PieChart",
      "Badge",
      "Icon",
      "Input.Rating",
      "Input.DataGrid",
    ],
    unsupportedActions: ["Action.Popover", "Action.RunCommands", "Action.OpenUrlDialog"],
    maxActions: 4,
    notes: [
      "Outlook Actionable Messages support up to v1.4",
      "Action.Execute requires Universal Action Model registration",
      "Voting buttons sunsetting July 2026 — migrate to Adaptive Cards",
    ],
  },
  webchat: {
    host: "webchat",
    maxVersion: "1.6",
    unsupportedElements: [],
    unsupportedActions: ["Action.Popover", "Action.RunCommands", "Action.OpenUrlDialog"],
    maxActions: 10,
    notes: ["Bot Framework Web Chat supports full v1.6 schema"],
  },
  windows: {
    host: "windows",
    maxVersion: "1.6",
    unsupportedElements: [
      "Carousel",
      "Accordion",
      "TabSet",
      "DonutChart",
      "BarChart",
      "LineChart",
      "PieChart",
    ],
    unsupportedActions: ["Action.Popover", "Action.RunCommands", "Action.OpenUrlDialog"],
    maxActions: 5,
    notes: ["Windows Widgets support a subset of v1.6"],
  },
  "viva-connections": {
    host: "viva-connections",
    maxVersion: "1.4",
    unsupportedElements: [
      "Media",
      "Carousel",
      "Accordion",
      "TabSet",
      "List",
      "CompoundButton",
      "CodeBlock",
      "DonutChart",
      "BarChart",
      "LineChart",
      "PieChart",
    ],
    unsupportedActions: ["Action.Popover", "Action.RunCommands", "Action.OpenUrlDialog"],
    maxActions: 5,
    notes: [
      "Viva Connections ACE framework supports up to v1.4",
      "Requires SPFx-based Adaptive Card Extensions",
    ],
  },
  webex: {
    host: "webex",
    maxVersion: "1.3",
    unsupportedElements: [
      "Table",
      "Carousel",
      "Accordion",
      "CodeBlock",
      "Rating",
      "ProgressBar",
      "ProgressRing",
      "Spinner",
      "TabSet",
      "List",
      "CompoundButton",
      "DonutChart",
      "BarChart",
      "LineChart",
      "PieChart",
      "Badge",
      "Icon",
      "Input.Rating",
      "Input.DataGrid",
    ],
    unsupportedActions: [
      "Action.Execute",
      "Action.Popover",
      "Action.RunCommands",
      "Action.OpenUrlDialog",
    ],
    maxActions: 5,
    notes: [
      "Cisco Webex locked to v1.3 — no roadmap for 1.4/1.5",
      "Action.Execute not supported — use Action.Submit",
    ],
  },
  generic: {
    host: "generic",
    maxVersion: "1.6",
    unsupportedElements: [],
    unsupportedActions: [],
    maxActions: 20,
    notes: [],
  },
};

/**
 * Check if a card is compatible with a specific host app
 */
export function checkHostCompatibility(
  card: Record<string, unknown>,
  host: HostApp = "generic",
): HostCompatibilityReport {
  const support = HOST_SUPPORT[host];
  const stats = analyzeCard(card);
  const unsupportedElements: HostCompatibilityReport["unsupportedElements"] = [];

  // Check element types
  for (const elementType of stats.elementTypes) {
    if (support.unsupportedElements.includes(elementType)) {
      unsupportedElements.push({
        path: `(element type)`,
        type: elementType,
        reason: `${elementType} is not supported on ${host} (max version: ${support.maxVersion})`,
      });
    }
  }

  // Check action types
  for (const actionType of stats.actionTypes) {
    if (support.unsupportedActions.includes(actionType)) {
      unsupportedElements.push({
        path: `(action type)`,
        type: actionType,
        reason: `${actionType} is not supported on ${host}`,
      });
    }
  }

  // Check version compatibility
  const cardVersion = parseFloat(stats.version);
  const maxVersion = parseFloat(support.maxVersion);
  if (!isNaN(cardVersion) && !isNaN(maxVersion) && cardVersion > maxVersion) {
    unsupportedElements.push({
      path: "$.version",
      type: "version",
      reason: `Card version ${stats.version} exceeds ${host} max supported version ${support.maxVersion}`,
    });
  }

  // Check action count at card level
  if (card.actions && Array.isArray(card.actions)) {
    if (card.actions.length > support.maxActions) {
      unsupportedElements.push({
        path: "$.actions",
        type: "action-count",
        reason: `Card has ${card.actions.length} actions, but ${host} supports max ${support.maxActions}`,
      });
    }
  }

  return {
    supported: unsupportedElements.length === 0,
    unsupportedElements,
  };
}

/**
 * Get host support information
 */
export function getHostSupport(host: HostApp): HostVersionSupport {
  return HOST_SUPPORT[host];
}

/**
 * Get all supported hosts
 */
export function getAllHostSupport(): Record<HostApp, HostVersionSupport> {
  return { ...HOST_SUPPORT };
}
