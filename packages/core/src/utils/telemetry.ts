/**
 * Telemetry — Opt-in metrics collection via OpenTelemetry-compatible interface
 *
 * Enable via: MCP_TELEMETRY=true
 *
 * This provides a lightweight metrics interface. For full OpenTelemetry support,
 * connect an OTel collector externally.
 */

interface ToolMetrics {
  callCount: number;
  errorCount: number;
  totalDurationMs: number;
  lastCallAt: number;
  totalOutputBytes: number;
}

interface SessionInfo {
  startedAt: number;
  version: string;
  transport: string;
  platform: string;
  nodeVersion: string;
  totalRequests: number;
  totalErrors: number;
  hostsUsed: Set<string>;
  intentsUsed: Set<string>;
}

const metrics = new Map<string, ToolMetrics>();
let telemetryEnabled = false;
const session: SessionInfo = {
  startedAt: Date.now(),
  version: "",
  transport: "",
  platform: process.platform,
  nodeVersion: process.version,
  totalRequests: 0,
  totalErrors: 0,
  hostsUsed: new Set(),
  intentsUsed: new Set(),
};

/**
 * Initialize telemetry from environment
 */
export function initTelemetry(): void {
  telemetryEnabled = process.env.MCP_TELEMETRY === "true";
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return telemetryEnabled;
}

/**
 * Record session startup info
 */
export function recordSessionStart(version: string, transport: string): void {
  session.startedAt = Date.now();
  session.version = version;
  session.transport = transport;
}

/**
 * Record host/intent usage for tracking popular configurations
 */
export function recordUsageContext(host?: string, intent?: string): void {
  if (!telemetryEnabled) return;
  if (host && host !== "generic") session.hostsUsed.add(host);
  if (intent) session.intentsUsed.add(intent);
}

/**
 * Record a tool invocation
 */
export function recordToolCall(
  tool: string,
  durationMs: number,
  error?: boolean,
  outputBytes?: number,
): void {
  if (!telemetryEnabled) return;

  session.totalRequests++;
  if (error) session.totalErrors++;

  let m = metrics.get(tool);
  if (!m) {
    m = { callCount: 0, errorCount: 0, totalDurationMs: 0, lastCallAt: 0, totalOutputBytes: 0 };
    metrics.set(tool, m);
  }

  m.callCount++;
  m.totalDurationMs += durationMs;
  m.lastCallAt = Date.now();
  if (error) m.errorCount++;
  if (outputBytes) m.totalOutputBytes += outputBytes;
}

/**
 * Get metrics snapshot for all tools
 */
export function getMetricsSnapshot(): Record<string, unknown> {
  const tools: Record<string, ToolMetrics & { avgDurationMs: number; avgOutputBytes: number }> = {};
  for (const [tool, m] of metrics) {
    tools[tool] = {
      ...m,
      avgDurationMs: m.callCount > 0 ? Math.round(m.totalDurationMs / m.callCount) : 0,
      avgOutputBytes: m.callCount > 0 ? Math.round(m.totalOutputBytes / m.callCount) : 0,
    };
  }
  return {
    session: {
      startedAt: new Date(session.startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - session.startedAt) / 1000),
      version: session.version,
      transport: session.transport,
      platform: session.platform,
      nodeVersion: session.nodeVersion,
      totalRequests: session.totalRequests,
      totalErrors: session.totalErrors,
      errorRate: session.totalRequests > 0
        ? (session.totalErrors / session.totalRequests * 100).toFixed(1) + "%"
        : "0%",
      hostsUsed: Array.from(session.hostsUsed),
      intentsUsed: Array.from(session.intentsUsed),
    },
    tools,
  };
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  metrics.clear();
}

// Note: initTelemetry() is NOT called on module load. The server calls it
// explicitly. Library users should call initTelemetry() themselves.
