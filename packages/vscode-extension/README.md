# Adaptive Cards AI Builder — VS Code Extension

AI-powered Adaptive Card generation, preview, and validation inside VS Code.

> Part of the [Adaptive Cards AI Builder](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) ecosystem.
> Also available as an [MCP server](https://github.com/VikrantSingh01/adaptive-cards-ai-builder/tree/main/packages/core) and [browser extension](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser).

## Features

- **Generate Card** (`Ctrl+Shift+A` / `Cmd+Shift+A`) — describe a card in natural language, select host and intent, get valid JSON
- **Preview** — rendered card in a side panel using the official Adaptive Cards JS renderer
- **Validate** — schema validation, accessibility scoring (0-100), host compatibility checks
- **Optimize** — auto-fix accessibility, modernize actions, upgrade version
- **Data to Card** — select JSON/CSV data, convert to optimal card (Table, FactSet, Chart)
- **CodeLens** — Preview / Validate / Optimize buttons on `.card.json` files
- **Snippets** — 11 code snippets for common card elements
- **Right-click menu** — generate from selection, convert data from selection

## Installation

### From Source

```bash
git clone https://github.com/VikrantSingh01/adaptive-cards-ai-builder-vscode.git
cd adaptive-cards-ai-builder-vscode
npm install
npm run compile
```

Then open the folder in VS Code and press **F5** to launch the Extension Development Host.

### From Monorepo

```bash
git clone https://github.com/VikrantSingh01/adaptive-cards-ai-builder.git
cd adaptive-cards-ai-builder/packages/vscode-extension
npm install
npm run compile
```

### From VSIX

```bash
npm run package
code --install-extension adaptive-cards-ai-builder-vscode-1.0.0.vsix
```

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Generate Card | `Ctrl+Shift+A` / `Cmd+Shift+A` | AI-powered card generation from natural language |
| Preview Card | — | Render card in side panel with live preview |
| Validate Card | — | Full diagnostics (schema, accessibility, host compat) |
| Optimize Card | — | Auto-fix accessibility and modernize best practices |
| Data to Card | — | Convert selected JSON/CSV to optimal card |

## Snippets

Type any prefix in a `.json` file to insert:

| Prefix | Description |
|--------|-------------|
| `ac-card` | Full Adaptive Card v1.6 skeleton |
| `ac-textblock` | TextBlock element |
| `ac-image` | Image with altText |
| `ac-columnset` | ColumnSet with 2 columns |
| `ac-factset` | FactSet |
| `ac-table` | Table with headers |
| `ac-input-text` | Input.Text with label |
| `ac-input-choice` | Input.ChoiceSet |
| `ac-action-execute` | Action.Execute (Universal Actions) |
| `ac-action-openurl` | Action.OpenUrl |
| `ac-container` | Container |

## Powered By

This extension uses [adaptive-cards-ai-builder](https://github.com/VikrantSingh01/adaptive-cards-ai-builder/tree/main/packages/core) as its core engine — the same library available as an MCP server for Claude Code, Copilot, and Cursor.

## Related

- [Adaptive Cards AI Builder (monorepo)](https://github.com/VikrantSingh01/adaptive-cards-ai-builder) — MCP server + core library + all extensions
- [Adaptive Cards AI Builder (browser extension)](https://github.com/VikrantSingh01/adaptive-cards-ai-builder-browser) — Chrome/Edge extension for the AC Designer
- [Adaptive Cards Documentation](https://adaptivecards.io/) — Official docs and Designer

## License

MIT
