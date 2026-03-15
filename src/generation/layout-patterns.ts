/**
 * Layout Patterns — Canonical card patterns for deterministic card generation
 */

import type { CardIntent, LayoutPattern } from "../types/index.js";

/**
 * Build a notification card pattern
 */
function notificationPattern(): LayoutPattern {
  return {
    name: "notification",
    description: "Simple notification with header, body text, and optional action",
    intent: ["notification", "status"],
    elements: ["TextBlock", "ActionSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{body}}",
          wrap: true,
        },
      ],
      actions: [],
    },
  };
}

/**
 * Build an approval card pattern
 */
function approvalPattern(): LayoutPattern {
  return {
    name: "approval",
    description: "Approval card with details, facts, and approve/reject actions",
    intent: ["approval"],
    elements: ["TextBlock", "FactSet", "ActionSet", "Container", "ColumnSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: "{{title}}",
              size: "large",
              weight: "bolder",
              wrap: true,
              style: "heading",
            },
          ],
          bleed: true,
        },
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{avatarUrl}}",
                      size: "small",
                      style: "person",
                      altText: "{{requesterName}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{requesterName}}",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{subtitle}}",
                      isSubtle: true,
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            {
              type: "FactSet",
              facts: [],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Approve",
          style: "positive",
          verb: "approve",
        },
        {
          type: "Action.Execute",
          title: "Reject",
          style: "destructive",
          verb: "reject",
        },
        {
          type: "Action.ShowCard",
          title: "Comment",
          card: {
            type: "AdaptiveCard",
            version: "1.6",
            body: [
              {
                type: "Input.Text",
                id: "comment",
                label: "Add a comment",
                isMultiline: true,
                placeholder: "Enter your comment...",
              },
            ],
            actions: [
              {
                type: "Action.Execute",
                title: "Submit",
                verb: "comment",
              },
            ],
          },
        },
      ],
    },
    example: "expense-report.json",
  };
}

/**
 * Build a data table card pattern
 */
function dataTablePattern(): LayoutPattern {
  return {
    name: "data-table",
    description: "Tabular data display using Table element with headers",
    intent: ["display", "report", "dashboard"],
    elements: ["TextBlock", "Table"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "Table",
          firstRowAsHeader: true,
          showGridLines: true,
          gridStyle: "accent",
          columns: [],
          rows: [],
        },
      ],
    },
  };
}

/**
 * Build a key-value facts card pattern
 */
function factsPattern(): LayoutPattern {
  return {
    name: "facts",
    description: "Key-value pairs displayed using FactSet",
    intent: ["display", "status", "profile"],
    elements: ["TextBlock", "FactSet"],
    dataShape: "key-value",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
    },
  };
}

/**
 * Build an image gallery card pattern
 */
function imageGalleryPattern(): LayoutPattern {
  return {
    name: "image-gallery",
    description: "Image gallery using ImageSet or Carousel",
    intent: ["gallery", "display"],
    elements: ["TextBlock", "ImageSet"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "ImageSet",
          imageSize: "medium",
          images: [],
        },
      ],
    },
    example: "image-gallery.json",
  };
}

/**
 * Build a dashboard card pattern
 */
function dashboardPattern(): LayoutPattern {
  return {
    name: "dashboard",
    description: "Dashboard with metrics in columns and optional chart",
    intent: ["dashboard", "report"],
    elements: ["TextBlock", "ColumnSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "ColumnSet",
          columns: [],
        },
      ],
    },
  };
}

/**
 * Build an input form card pattern
 */
function inputFormPattern(): LayoutPattern {
  return {
    name: "input-form",
    description: "Data collection form with various input types and submit action",
    intent: ["form"],
    elements: [
      "TextBlock",
      "Input.Text",
      "Input.ChoiceSet",
      "Input.Date",
      "Input.Toggle",
      "ActionSet",
    ],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{description}}",
          wrap: true,
          isSubtle: true,
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Submit",
          style: "positive",
          verb: "submit",
        },
      ],
    },
    example: "input-form.json",
  };
}

/**
 * Build a status update card pattern
 */
function statusUpdatePattern(): LayoutPattern {
  return {
    name: "status-update",
    description: "Status update with header, progress indicator, and details",
    intent: ["status", "notification"],
    elements: ["TextBlock", "ColumnSet", "FactSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{iconUrl}}",
                  size: "small",
                  altText: "{{status}}",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "{{title}}",
                  size: "medium",
                  weight: "bolder",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{subtitle}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
    },
    example: "activity-update.json",
  };
}

/**
 * Build a list card pattern
 */
function listPattern(): LayoutPattern {
  return {
    name: "list",
    description: "List of items with titles and optional descriptions",
    intent: ["list", "display"],
    elements: ["TextBlock", "Container"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
      ],
    },
  };
}

/**
 * Build a profile/person card pattern
 */
function profilePattern(): LayoutPattern {
  return {
    name: "profile",
    description: "Person/profile card with avatar, name, role, and contact details",
    intent: ["profile", "display"],
    elements: ["TextBlock", "Image", "ColumnSet", "FactSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{avatarUrl}}",
                  size: "large",
                  style: "person",
                  altText: "{{name}}",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "{{name}}",
                  size: "large",
                  weight: "bolder",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{role}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{organization}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "View Profile",
          url: "{{profileUrl}}",
        },
      ],
    },
  };
}

/**
 * Build a chart card pattern
 */
function chartPattern(): LayoutPattern {
  return {
    name: "chart",
    description: "Data visualization with bar, line, pie, or donut chart",
    intent: ["dashboard", "report"],
    elements: ["TextBlock", "BarChart"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
      ],
    },
    example: "charts.json",
  };
}

// ─── Pattern Registry ────────────────────────────────────────────────────────

const ALL_PATTERNS: LayoutPattern[] = [
  notificationPattern(),
  approvalPattern(),
  dataTablePattern(),
  factsPattern(),
  imageGalleryPattern(),
  dashboardPattern(),
  inputFormPattern(),
  statusUpdatePattern(),
  listPattern(),
  profilePattern(),
  chartPattern(),
];

/**
 * Get all available layout patterns
 */
export function getAllPatterns(): LayoutPattern[] {
  return ALL_PATTERNS;
}

/**
 * Find the best matching pattern for a given intent
 */
export function findPatternByIntent(intent: CardIntent): LayoutPattern | undefined {
  return ALL_PATTERNS.find((p) => p.intent.includes(intent));
}

/**
 * Find pattern by name
 */
export function findPatternByName(name: string): LayoutPattern | undefined {
  return ALL_PATTERNS.find((p) => p.name === name);
}

/**
 * Score patterns against a description for best match
 */
export function scorePatterns(
  description: string,
): Array<{ pattern: LayoutPattern; score: number }> {
  const lower = description.toLowerCase();
  const keywords: Record<string, string[]> = {
    notification: ["notify", "notification", "alert", "message", "announce"],
    approval: ["approve", "approval", "reject", "request", "authorize", "sign off"],
    "data-table": ["table", "data", "rows", "columns", "grid", "spreadsheet", "tabular"],
    facts: ["detail", "info", "summary", "key-value", "properties", "metadata", "facts"],
    "image-gallery": ["image", "gallery", "photo", "picture", "portfolio"],
    dashboard: ["dashboard", "metrics", "kpi", "overview", "summary", "stats"],
    "input-form": ["form", "input", "survey", "questionnaire", "collect", "register", "signup"],
    "status-update": ["status", "update", "progress", "tracking", "activity"],
    list: ["list", "items", "todo", "tasks", "menu", "options", "catalog"],
    profile: ["profile", "person", "contact", "user", "member", "employee", "team"],
    chart: ["chart", "graph", "visualization", "plot", "bar chart", "pie chart", "analytics"],
  };

  return ALL_PATTERNS.map((pattern) => {
    let score = 0;
    const patternKeywords = keywords[pattern.name] || [];
    for (const kw of patternKeywords) {
      if (lower.includes(kw)) score += 10;
    }
    // Partial matches on pattern description
    const descWords = pattern.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && lower.includes(word)) score += 2;
    }
    return { pattern, score };
  })
    .sort((a, b) => b.score - a.score);
}
