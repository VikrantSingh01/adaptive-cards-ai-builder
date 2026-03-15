/**
 * Adaptive Cards AI Builder — Content Script
 * Injects an AI generation panel into the Adaptive Cards Designer
 */
(function () {
  "use strict";
  if (document.getElementById("ac-ai-builder-btn")) return;

  // ─── Lightweight Card Generator (pattern-matching, no LLM) ──────────────────

  const PATTERNS = {
    notification: {
      keywords: ["notify", "notification", "alert", "message", "announce", "deploy", "build"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "TextBlock", text: extractTitle(desc), size: "medium", weight: "bolder", wrap: true, style: "heading" },
            { type: "TextBlock", text: desc, wrap: true }
          ],
          actions: [
            { type: "Action.OpenUrl", title: "View Details", url: "https://example.com" }
          ]
        };
      }
    },
    approval: {
      keywords: ["approve", "approval", "reject", "request", "authorize", "expense", "purchase"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "Container", style: "emphasis", bleed: true, items: [
              { type: "TextBlock", text: extractTitle(desc), size: "large", weight: "bolder", wrap: true, style: "heading" }
            ]},
            { type: "ColumnSet", columns: [
              { type: "Column", width: "auto", items: [
                { type: "Image", url: "https://adaptivecards.io/content/cats/1.png", size: "small", style: "person", altText: "Requester" }
              ]},
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: "Requester Name", weight: "bolder", wrap: true },
                { type: "TextBlock", text: "Submitted just now", isSubtle: true, spacing: "none", wrap: true }
              ]}
            ]},
            { type: "FactSet", facts: [
              { title: "Amount", value: "$0.00" },
              { title: "Category", value: "General" },
              { title: "Due Date", value: "TBD" }
            ]}
          ],
          actions: [
            { type: "Action.Execute", title: "Approve", style: "positive", verb: "approve" },
            { type: "Action.Execute", title: "Reject", style: "destructive", verb: "reject" }
          ]
        };
      }
    },
    form: {
      keywords: ["form", "input", "survey", "collect", "register", "signup", "feedback"],
      build(desc, host) {
        const lower = desc.toLowerCase();
        const body = [
          { type: "TextBlock", text: extractTitle(desc), size: "medium", weight: "bolder", wrap: true, style: "heading" }
        ];
        if (/\b(title|name|subject)\b/.test(lower)) body.push({ type: "Input.Text", id: "title", label: "Title", placeholder: "Enter title..." });
        if (/\b(description|details|body|notes)\b/.test(lower)) body.push({ type: "Input.Text", id: "description", label: "Description", isMultiline: true, placeholder: "Enter description..." });
        if (/\b(severity|priority|urgency)\b/.test(lower)) body.push({ type: "Input.ChoiceSet", id: "severity", label: "Severity", style: "compact", choices: [
          { title: "Critical", value: "critical" }, { title: "High", value: "high" }, { title: "Medium", value: "medium" }, { title: "Low", value: "low" }
        ]});
        if (/\b(email|e-mail)\b/.test(lower)) body.push({ type: "Input.Text", id: "email", label: "Email", placeholder: "user@example.com" });
        if (/\b(date|due|deadline)\b/.test(lower)) body.push({ type: "Input.Date", id: "date", label: "Date" });
        if (/\b(comment|feedback|message)\b/.test(lower)) body.push({ type: "Input.Text", id: "comment", label: "Comment", isMultiline: true });
        if (body.length === 1) {
          body.push({ type: "Input.Text", id: "name", label: "Name", placeholder: "Enter name..." });
          body.push({ type: "Input.Text", id: "details", label: "Details", isMultiline: true, placeholder: "Enter details..." });
        }
        return {
          type: "AdaptiveCard", version: "1.6", body,
          actions: [{ type: "Action.Execute", title: "Submit", style: "positive", verb: "submit" }]
        };
      }
    },
    table: {
      keywords: ["table", "data", "rows", "columns", "grid", "spreadsheet", "tabular", "list"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "TextBlock", text: extractTitle(desc), size: "medium", weight: "bolder", wrap: true, style: "heading" },
            { type: "Table", firstRowAsHeader: true, showGridLines: true, gridStyle: "accent",
              columns: [{ width: 1 }, { width: 1 }, { width: 1 }],
              rows: [
                { type: "TableRow", cells: [
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Column 1", weight: "bolder", wrap: true }] },
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Column 2", weight: "bolder", wrap: true }] },
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Column 3", weight: "bolder", wrap: true }] }
                ]},
                { type: "TableRow", cells: [
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Value 1", wrap: true }] },
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Value 2", wrap: true }] },
                  { type: "TableCell", items: [{ type: "TextBlock", text: "Value 3", wrap: true }] }
                ]}
              ]
            }
          ]
        };
      }
    },
    facts: {
      keywords: ["detail", "info", "summary", "status", "properties", "metadata", "facts", "key-value"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "TextBlock", text: extractTitle(desc), size: "medium", weight: "bolder", wrap: true, style: "heading" },
            { type: "FactSet", facts: [
              { title: "Status", value: "Active" },
              { title: "Priority", value: "High" },
              { title: "Assigned To", value: "Team" },
              { title: "Created", value: new Date().toISOString().split("T")[0] }
            ]}
          ]
        };
      }
    },
    dashboard: {
      keywords: ["dashboard", "metrics", "kpi", "overview", "stats", "analytics"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "TextBlock", text: extractTitle(desc), size: "medium", weight: "bolder", wrap: true, style: "heading" },
            { type: "ColumnSet", columns: [
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: "Metric 1", isSubtle: true, wrap: true },
                { type: "TextBlock", text: "1,234", size: "extraLarge", weight: "bolder", color: "accent" }
              ]},
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: "Metric 2", isSubtle: true, wrap: true },
                { type: "TextBlock", text: "567", size: "extraLarge", weight: "bolder", color: "good" }
              ]},
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: "Metric 3", isSubtle: true, wrap: true },
                { type: "TextBlock", text: "89%", size: "extraLarge", weight: "bolder", color: "warning" }
              ]}
            ]}
          ]
        };
      }
    },
    profile: {
      keywords: ["profile", "person", "contact", "user", "member", "employee"],
      build(desc, host) {
        return {
          type: "AdaptiveCard", version: "1.6",
          body: [
            { type: "ColumnSet", columns: [
              { type: "Column", width: "auto", items: [
                { type: "Image", url: "https://adaptivecards.io/content/cats/1.png", size: "large", style: "person", altText: "Profile photo" }
              ]},
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: "Name", size: "large", weight: "bolder", wrap: true },
                { type: "TextBlock", text: "Title / Role", isSubtle: true, spacing: "none", wrap: true },
                { type: "TextBlock", text: "Organization", isSubtle: true, spacing: "none", wrap: true }
              ]}
            ]},
            { type: "FactSet", facts: [
              { title: "Email", value: "user@example.com" },
              { title: "Phone", value: "+1 (555) 000-0000" },
              { title: "Location", value: "City, Country" }
            ]}
          ],
          actions: [
            { type: "Action.OpenUrl", title: "View Profile", url: "https://example.com" }
          ]
        };
      }
    }
  };

  function extractTitle(desc) {
    const s = desc.split(/[.!?\n]/)[0].trim();
    return s.length <= 60 ? s : s.slice(0, 57) + "...";
  }

  function generateCard(description, host, intent) {
    const lower = description.toLowerCase();
    // If intent is specified, use it directly
    if (intent && intent !== "auto" && PATTERNS[intent]) {
      return PATTERNS[intent].build(description, host);
    }
    // Pattern match on description
    let bestPattern = null, bestScore = 0;
    for (const [name, pat] of Object.entries(PATTERNS)) {
      let score = 0;
      for (const kw of pat.keywords) {
        if (lower.includes(kw)) score += 10;
      }
      if (score > bestScore) { bestScore = score; bestPattern = name; }
    }
    if (bestPattern) return PATTERNS[bestPattern].build(description, host);
    return PATTERNS.notification.build(description, host);
  }

  function validateCard(card) {
    const errors = [];
    if (!card || typeof card !== "object") return [{ severity: "error", message: "Not a valid JSON object" }];
    if (card.type !== "AdaptiveCard") errors.push({ severity: "error", message: 'Missing or invalid "type": must be "AdaptiveCard"' });
    if (!card.version) errors.push({ severity: "error", message: 'Missing "version" property' });
    if (!card.body || !Array.isArray(card.body)) errors.push({ severity: "error", message: 'Missing or invalid "body" array' });
    if (card.body) {
      card.body.forEach((el, i) => {
        if (!el.type) errors.push({ severity: "error", message: `body[${i}]: Missing "type" property` });
        if (el.type === "Image" && !el.url) errors.push({ severity: "error", message: `body[${i}]: Image missing "url"` });
        if (el.type === "Image" && !el.altText) errors.push({ severity: "warning", message: `body[${i}]: Image missing "altText" (accessibility)` });
        if (el.type === "TextBlock" && !el.text) errors.push({ severity: "error", message: `body[${i}]: TextBlock missing "text"` });
        if (el.type === "TextBlock" && el.wrap !== true) errors.push({ severity: "warning", message: `body[${i}]: TextBlock should have "wrap: true"` });
        if (el.type && el.type.startsWith("Input.") && !el.label) errors.push({ severity: "warning", message: `body[${i}]: ${el.type} missing "label" (accessibility)` });
        if (el.type && el.type.startsWith("Input.") && !el.id) errors.push({ severity: "error", message: `body[${i}]: ${el.type} missing "id"` });
      });
    }
    if (card.actions) {
      card.actions.forEach((act, i) => {
        if (!act.title) errors.push({ severity: "warning", message: `actions[${i}]: Action missing "title"` });
        if (act.type === "Action.Submit") errors.push({ severity: "info", message: `actions[${i}]: Consider using Action.Execute instead of Action.Submit` });
      });
    }
    return errors;
  }

  // ─── Designer Integration ─────────────────────────────────────────────────────

  function getDesignerCardJson() {
    // Try Monaco editor first
    const monacoEditors = document.querySelectorAll(".monaco-editor");
    if (monacoEditors.length > 0 && window.monaco) {
      const models = window.monaco.editor.getModels();
      for (const model of models) {
        const text = model.getValue();
        try {
          const parsed = JSON.parse(text);
          if (parsed.type === "AdaptiveCard") return text;
        } catch (e) { /* skip */ }
      }
    }
    // Try textarea fallback
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      try {
        const parsed = JSON.parse(ta.value);
        if (parsed.type === "AdaptiveCard") return ta.value;
      } catch (e) { /* skip */ }
    }
    // Try CodeMirror
    const cmEls = document.querySelectorAll(".CodeMirror");
    for (const cmEl of cmEls) {
      if (cmEl.CodeMirror) {
        try {
          const parsed = JSON.parse(cmEl.CodeMirror.getValue());
          if (parsed.type === "AdaptiveCard") return cmEl.CodeMirror.getValue();
        } catch (e) { /* skip */ }
      }
    }
    return null;
  }

  function setDesignerCardJson(jsonStr) {
    // Try Monaco first
    if (window.monaco) {
      const models = window.monaco.editor.getModels();
      for (const model of models) {
        try {
          const parsed = JSON.parse(model.getValue());
          if (parsed.type === "AdaptiveCard") {
            model.setValue(jsonStr);
            return true;
          }
        } catch (e) { /* skip */ }
      }
      // If no AC model found, set the first model
      if (models.length > 0) {
        models[0].setValue(jsonStr);
        return true;
      }
    }
    // Try textarea fallback
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      try {
        JSON.parse(ta.value);
        ta.value = jsonStr;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      } catch (e) { /* skip */ }
    }
    return false;
  }

  // ─── UI Construction ──────────────────────────────────────────────────────────

  // Floating button
  const btn = document.createElement("button");
  btn.id = "ac-ai-builder-btn";
  btn.innerHTML = "&#x2728;";
  btn.title = "Adaptive Cards AI Builder";
  document.body.appendChild(btn);

  // Side panel
  const panel = document.createElement("div");
  panel.id = "ac-ai-panel";
  panel.innerHTML = `
    <div class="ac-ai-header">
      <h2>AI Card Builder</h2>
      <button class="ac-ai-close" id="ac-ai-close">&times;</button>
    </div>
    <div class="ac-ai-body">
      <div>
        <div class="ac-ai-label">Describe your card</div>
        <textarea class="ac-ai-textarea" id="ac-ai-input" placeholder="e.g., Create an expense approval card with approve/reject buttons"></textarea>
      </div>
      <div class="ac-ai-row">
        <div>
          <div class="ac-ai-label">Host</div>
          <select class="ac-ai-select" id="ac-ai-host">
            <option value="generic">Generic</option>
            <option value="teams" selected>Teams</option>
            <option value="outlook">Outlook</option>
            <option value="webchat">Web Chat</option>
            <option value="windows">Windows</option>
          </select>
        </div>
        <div>
          <div class="ac-ai-label">Intent</div>
          <select class="ac-ai-select" id="ac-ai-intent">
            <option value="auto">Auto-detect</option>
            <option value="notification">Notification</option>
            <option value="approval">Approval</option>
            <option value="form">Form</option>
            <option value="table">Data Table</option>
            <option value="facts">Facts/Details</option>
            <option value="dashboard">Dashboard</option>
            <option value="profile">Profile</option>
          </select>
        </div>
      </div>
      <button class="ac-ai-btn ac-ai-btn-primary" id="ac-ai-generate" style="width:100%">&#x2728; Generate Card</button>
      <hr class="ac-ai-divider">
      <div class="ac-ai-row">
        <button class="ac-ai-btn ac-ai-btn-secondary" id="ac-ai-validate">Validate Current</button>
        <button class="ac-ai-btn ac-ai-btn-secondary" id="ac-ai-optimize">Optimize Current</button>
      </div>
      <div id="ac-ai-status-area"></div>
      <div>
        <div class="ac-ai-label">Output</div>
        <textarea class="ac-ai-output" id="ac-ai-output" readonly placeholder="Generated card JSON will appear here..."></textarea>
      </div>
      <div class="ac-ai-row">
        <button class="ac-ai-btn ac-ai-btn-success" id="ac-ai-load">Load into Designer</button>
        <button class="ac-ai-btn ac-ai-btn-secondary" id="ac-ai-copy">Copy JSON</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ─── Event Handlers ───────────────────────────────────────────────────────────

  let panelOpen = false;
  btn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.classList.toggle("open", panelOpen);
  });
  document.getElementById("ac-ai-close").addEventListener("click", () => {
    panelOpen = false;
    panel.classList.remove("open");
  });

  function showStatus(msg, type) {
    const area = document.getElementById("ac-ai-status-area");
    area.innerHTML = `<div class="ac-ai-status ${type}">${msg}</div>`;
    setTimeout(() => { if (area.firstChild) area.firstChild.style.opacity = "0.5"; }, 5000);
  }

  // Generate
  document.getElementById("ac-ai-generate").addEventListener("click", () => {
    const desc = document.getElementById("ac-ai-input").value.trim();
    if (!desc) { showStatus("Please enter a description", "error"); return; }
    const host = document.getElementById("ac-ai-host").value;
    const intent = document.getElementById("ac-ai-intent").value;
    try {
      const card = generateCard(desc, host, intent);
      const json = JSON.stringify(card, null, 2);
      document.getElementById("ac-ai-output").value = json;
      showStatus("Card generated successfully!", "success");
    } catch (e) {
      showStatus("Error: " + e.message, "error");
    }
  });

  // Validate current card in Designer
  document.getElementById("ac-ai-validate").addEventListener("click", () => {
    const raw = getDesignerCardJson();
    if (!raw) { showStatus("No Adaptive Card found in Designer editor", "error"); return; }
    try {
      const card = JSON.parse(raw);
      const errors = validateCard(card);
      if (errors.length === 0) {
        showStatus("Card is valid! No issues found.", "success");
      } else {
        const errorCount = errors.filter(e => e.severity === "error").length;
        const warnCount = errors.filter(e => e.severity === "warning").length;
        const details = errors.map(e => `[${e.severity}] ${e.message}`).join("\n");
        document.getElementById("ac-ai-output").value = details;
        showStatus(`Found ${errorCount} error(s), ${warnCount} warning(s)`, errorCount > 0 ? "error" : "info");
      }
    } catch (e) {
      showStatus("Invalid JSON in Designer: " + e.message, "error");
    }
  });

  // Optimize current card
  document.getElementById("ac-ai-optimize").addEventListener("click", () => {
    const raw = getDesignerCardJson();
    if (!raw) { showStatus("No Adaptive Card found in Designer editor", "error"); return; }
    try {
      const card = JSON.parse(raw);
      let changes = 0;
      // Add wrap:true to TextBlocks
      function walkOptimize(elements) {
        if (!Array.isArray(elements)) return;
        for (const el of elements) {
          if (!el || typeof el !== "object") continue;
          if (el.type === "TextBlock" && el.wrap !== true) { el.wrap = true; changes++; }
          if (el.type === "Image" && !el.altText) { el.altText = el.url ? "Image" : "Decorative image"; changes++; }
          if (el.type && el.type.startsWith("Input.") && !el.label) { el.label = el.id || el.type.replace("Input.", ""); changes++; }
          if (el.items) walkOptimize(el.items);
          if (el.columns) el.columns.forEach(c => { if (c.items) walkOptimize(c.items); });
          if (el.rows) el.rows.forEach(r => { if (r.cells) r.cells.forEach(c => { if (c.items) walkOptimize(c.items); }); });
        }
      }
      walkOptimize(card.body || []);
      // Replace Action.Submit with Action.Execute
      if (card.actions) {
        for (const act of card.actions) {
          if (act.type === "Action.Submit") { act.type = "Action.Execute"; act.verb = act.verb || "submit"; changes++; }
        }
      }
      // Add speak if missing
      if (!card.speak) {
        const firstText = (card.body || []).find(e => e.type === "TextBlock");
        if (firstText) { card.speak = firstText.text; changes++; }
      }
      document.getElementById("ac-ai-output").value = JSON.stringify(card, null, 2);
      showStatus(`Optimized! ${changes} improvement(s) applied.`, changes > 0 ? "success" : "info");
    } catch (e) {
      showStatus("Error optimizing: " + e.message, "error");
    }
  });

  // Load into Designer
  document.getElementById("ac-ai-load").addEventListener("click", () => {
    const json = document.getElementById("ac-ai-output").value.trim();
    if (!json) { showStatus("No card to load — generate one first", "error"); return; }
    try {
      JSON.parse(json); // validate
      if (setDesignerCardJson(json)) {
        showStatus("Card loaded into Designer!", "success");
      } else {
        showStatus("Could not find Designer editor to inject into. Try copying instead.", "error");
      }
    } catch (e) {
      showStatus("Invalid JSON: " + e.message, "error");
    }
  });

  // Copy
  document.getElementById("ac-ai-copy").addEventListener("click", () => {
    const json = document.getElementById("ac-ai-output").value;
    if (!json) { showStatus("Nothing to copy", "error"); return; }
    navigator.clipboard.writeText(json).then(() => {
      showStatus("Copied to clipboard!", "success");
    }).catch(() => {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showStatus("Copied to clipboard!", "success");
    });
  });

  // Keyboard shortcut: Ctrl+Enter to generate
  document.getElementById("ac-ai-input").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      document.getElementById("ac-ai-generate").click();
    }
  });

})();
