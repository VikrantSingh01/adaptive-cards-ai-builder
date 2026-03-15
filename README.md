# Adaptive Cards AI Builder

AI-powered tool that converts any content into schema-validated [Adaptive Card](https://adaptivecards.io/) v1.6 JSON.

Available as an **MCP server**, **npm library**, **VS Code extension**, and **browser extension** for the Adaptive Cards Designer.

## Ecosystem

This is a monorepo. Each package is also published as a standalone repo for independent installation.

| Package | Description | Standalone Repo | Install |
|---------|-------------|-----------------|---------|
| [packages/core](packages/core/) | MCP server + npm library (7 tools) | — | `npx adaptive-cards-ai-builder` |
| [packages/vscode-extension](packages/vscode-extension/) | VS Code extension — generate, preview, validate, optimize | [adaptive-cards-ai-builder-vscode](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode) | VS Code Marketplace (coming soon) |
| [packages/browser-extension](packages/browser-extension/) | Chrome/Edge extension — AI panel for AC Designer | [adaptive-cards-ai-builder-browser](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser) | Chrome Web Store (coming soon) |

## Quick Start

### MCP Server (Claude Code / Copilot / Cursor)

```bash
# Add to Claude Code
claude mcp add adaptive-cards-ai-builder -- npx adaptive-cards-ai-builder

# Or run directly
npx adaptive-cards-ai-builder
```

Then ask your AI assistant:
- *"Generate an expense approval card for Teams"*
- *"Convert this JSON data to an Adaptive Card table"*
- *"Validate this card and check accessibility"*

### npm Library

```typescript
import { generateCard, validateCardFull, dataToCard, optimizeCard } from 'adaptive-cards-ai-builder';

const result = await generateCard({
  content: "Create a flight status card",
  host: "teams",
  intent: "display"
});
```

### VS Code Extension

Install from the [standalone repo](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode) or from `packages/vscode-extension/`:

```bash
cd packages/vscode-extension && npm install && npm run compile
```

Press `Cmd+Shift+A` to generate a card. See the [extension README](packages/vscode-extension/README.md) for all features.

### Browser Extension

Install from the [standalone repo](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser) or load `packages/browser-extension/` as an unpacked extension:

1. Open `chrome://extensions/` → Enable Developer mode
2. Click "Load unpacked" → select `packages/browser-extension/`
3. Navigate to [adaptivecards.io/designer](https://adaptivecards.io/designer)

See the [extension README](packages/browser-extension/README.md) for details.

## MCP Tools (7)

| Tool | Description |
|------|-------------|
| `generate_card` | Natural language / data → valid Adaptive Card v1.6 JSON |
| `validate_card` | Schema validation + accessibility score (0-100) + host compatibility |
| `data_to_card` | Auto-select Table / FactSet / Chart / List from data shape |
| `optimize_card` | Improve accessibility, performance, modernize actions |
| `template_card` | Static card → `${expression}` data-bound template |
| `transform_card` | Version upgrade/downgrade, host-config adaptation |
| `suggest_layout` | Recommend best layout pattern for a description |

## Host Compatibility

| Host | Max Version | Notes |
|------|-------------|-------|
| Teams | 1.6 | Max 6 actions, Action.Execute preferred |
| Outlook | 1.4 | Limited elements, max 4 actions |
| Web Chat | 1.6 | Full support |
| Windows | 1.6 | Subset of elements |
| Viva Connections | 1.4 | SPFx-based ACE framework |
| Webex | 1.3 | No Table, no Action.Execute |

## Development

```bash
# Core library
cd packages/core
npm install
npm run build    # TypeScript + copy data files
npm test         # 42 tests (vitest)
node dist/server.js  # Run MCP server locally

# VS Code extension
cd packages/vscode-extension
npm install
npm run compile  # Then press F5 in VS Code

# Browser extension
# No build step — load packages/browser-extension/ as unpacked extension
```

## Architecture

```
packages/
├── core/                          # npm: adaptive-cards-ai-builder
│   ├── src/
│   │   ├── server.ts              # MCP server (stdio, 7 tools)
│   │   ├── index.ts               # Library exports
│   │   ├── tools/                 # generate, validate, data-to-card, optimize,
│   │   │                          # template, transform, suggest-layout
│   │   ├── core/                  # Schema validator, analyzer, accessibility, host compat
│   │   ├── generation/            # 11 layout patterns, data analyzer, assembler, LLM client
│   │   ├── data/                  # v1.6 schema, 25 examples, host configs
│   │   └── types/                 # TypeScript interfaces
│   └── tests/                     # 42 unit tests (vitest)
├── vscode-extension/              # repo: adaptive-cards-ai-builder-vscode
│   ├── src/                       # 5 commands, preview panel, CodeLens
│   └── snippets/                  # 11 AC code snippets
└── browser-extension/             # repo: adaptive-cards-ai-builder-browser
    ├── content-script.js          # AI panel for AC Designer
    ├── manifest.json              # Chrome/Edge Manifest V3
    └── popup.html                 # Quick-generate popup
```

## Related Projects

- [AdaptiveCards-Mobile](https://github.com/nicfera/AdaptiveCards-Mobile) — Cross-platform Adaptive Cards renderer (source for schema + test cards)
- [Adaptive Cards Documentation](https://adaptivecards.io/) — Official docs and Designer
- [Adaptive Cards Schema Explorer](https://adaptivecards.io/explorer/) — Interactive schema reference

## License

MIT
