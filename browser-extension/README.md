# Adaptive Cards AI Builder — Browser Extension

AI-powered card generation panel for the [Adaptive Cards Designer](https://adaptivecards.io/designer).

## Features

- Floating AI Builder button on the Adaptive Cards Designer
- Natural language card generation (describe what you want)
- Validate and optimize cards directly in the Designer
- Load generated cards into the Designer editor with one click
- Dark theme matching the Designer aesthetic
- Quick-generate popup available on any page

## Installation

### Chrome / Edge (Developer Mode)

1. Clone or download this `browser-extension/` folder
2. Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `browser-extension/` folder
6. Navigate to [adaptivecards.io/designer](https://adaptivecards.io/designer)
7. Click the sparkle button (bottom-right) to open the AI panel

### Icons

Replace the placeholder icons in `icons/` with actual PNG icons:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## Usage

1. Open the Adaptive Cards Designer
2. Click the sparkle button in the bottom-right corner
3. Describe the card you want in natural language
4. Select host (Teams, Outlook, etc.) and intent
5. Click "Generate Card"
6. Click "Load into Designer" to inject it into the editor

## Supported Patterns

- **Notification** — alerts, messages, deployments
- **Approval** — expense reports, purchase requests
- **Form** — surveys, registrations, feedback
- **Data Table** — tabular data, grids
- **Facts/Details** — key-value summaries, status
- **Dashboard** — KPIs, metrics, analytics
- **Profile** — person/contact cards
