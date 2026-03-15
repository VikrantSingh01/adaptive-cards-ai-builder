# Adaptive Cards AI Builder — Browser Extension

AI-powered card generation panel for the [Adaptive Cards Designer](https://adaptivecards.io/designer).

> Part of the [Adaptive Cards AI Builder](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) ecosystem.
> Also available as an [MCP server](https://github.com/VikrantSingh01/adaptive-cards-ai-builder/tree/main/packages/core) and [VS Code extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode).

## Features

- Floating AI Builder button on the Adaptive Cards Designer
- Natural language card generation (describe what you want)
- Validate and optimize cards directly in the Designer
- Load generated cards into the Designer editor with one click
- Dark theme matching the Designer aesthetic
- Quick-generate popup available on any page

## Installation

### Chrome / Edge (Developer Mode)

```bash
git clone https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser.git
```

1. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the cloned folder
5. Navigate to [adaptivecards.io/designer](https://adaptivecards.io/designer)
6. Click the sparkle button (bottom-right) to open the AI panel

### From Monorepo

```bash
git clone https://github.com/VikrantSingh01/adaptive-cards-ai-builder.git
```

Then load `packages/browser-extension/` as an unpacked extension.

## Usage

1. Open the [Adaptive Cards Designer](https://adaptivecards.io/designer)
2. Click the sparkle button in the bottom-right corner
3. Describe the card you want in natural language
4. Select host (Teams, Outlook, etc.) and intent
5. Click **"Generate Card"**
6. Click **"Load into Designer"** to inject it into the editor

**Keyboard shortcut:** `Ctrl+Enter` / `Cmd+Enter` in the input box to generate.

## Supported Patterns

| Pattern | Keywords | Example Use |
|---------|----------|-------------|
| **Notification** | alert, message, deploy | Build deployment notification |
| **Approval** | approve, reject, expense | Expense approval with actions |
| **Form** | form, survey, register | Bug report form with inputs |
| **Data Table** | table, data, grid | Employee roster table |
| **Facts/Details** | status, info, summary | Ticket status summary |
| **Dashboard** | metrics, KPI, analytics | Revenue dashboard with metrics |
| **Profile** | person, contact, member | Team member profile card |

## How It Works

The extension uses lightweight pattern-matching card generation (no API keys needed). It:

1. Matches your description against keyword patterns
2. Selects the best card template
3. Fills in the template with contextual content
4. Validates the output against the Adaptive Card v1.6 schema

For more advanced AI-powered generation, use the [MCP server](https://github.com/VikrantSingh01/adaptive-cards-ai-builder/tree/main/packages/core) with Claude Code or Copilot.

## Icons

Replace the placeholder icons in `icons/` with actual PNG files:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## Related

- [Adaptive Cards AI Builder (monorepo)](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) — MCP server + core library + all extensions
- [Adaptive Cards AI Builder (VS Code extension)](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode) — Generate, preview, validate cards in VS Code
- [Adaptive Cards Documentation](https://adaptivecards.io/) — Official docs and Designer

## License

MIT
