import os from 'node:os';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register, prefix: 'elevate_' });

function getOrCreateHistogram(name: string, config: Omit<ConstructorParameters<typeof Histogram>[0], 'name'>): Histogram<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Histogram<string>;
  return new Histogram({ name, ...config, registers: [register] });
}

function getOrCreateCounter(name: string, config: Omit<ConstructorParameters<typeof Counter>[0], 'name'>): Counter<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Counter<string>;
  return new Counter({ name, ...config, registers: [register] });
}

function getOrCreateGauge(name: string, config: Omit<ConstructorParameters<typeof Gauge>[0], 'name'>): Gauge<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Gauge<string>;
  return new Gauge({ name, ...config, registers: [register] });
}

const requestDurationMs = getOrCreateHistogram('elevate_http_request_duration_ms', {
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 25, 50, 100, 250, 500, 1000, 2000, 5000],
});

const requestCountTotal = getOrCreateCounter('elevate_http_requests_total', {
  help: 'Total HTTP requests by method, route, and status code',
  labelNames: ['method', 'route', 'status_code'],
});

const googleApiLatencyMs = getOrCreateHistogram('elevate_google_api_latency_ms', {
  help: 'Google API request latency in milliseconds',
  labelNames: ['api', 'operation', 'status_code'],
  buckets: [25, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
});

const mcpToolExecutionMs = getOrCreateHistogram('elevate_mcp_tool_execution_ms', {
  help: 'MCP tool execution time in milliseconds',
  labelNames: ['tool', 'status'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 3000, 10000],
});

const mcpToolExecutionCount = getOrCreateCounter('elevate_mcp_tool_execution_total', {
  help: 'Count of MCP tool executions',
  labelNames: ['tool', 'status'],
});

const googleApiQuotaEvents = getOrCreateCounter('elevate_google_api_quota_events_total', {
  help: 'Count of Google API quota-related responses',
  labelNames: ['api', 'operation'],
});

const databaseLatencyMs = getOrCreateHistogram('elevate_database_latency_ms', {
  help: 'Database query latency in milliseconds',
  labelNames: ['operation', 'status'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 3000],
});

const cacheAccessTotal = getOrCreateCounter('elevate_cache_access_total', {
  help: 'Cache accesses by namespace and outcome',
  labelNames: ['cache', 'result'],
});

const cacheHitRatio = getOrCreateGauge('elevate_cache_hit_ratio', {
  help: 'Cache hit ratio by namespace',
  labelNames: ['cache'],
});

const processMemoryBytes = getOrCreateGauge('elevate_process_memory_bytes', {
  help: 'Node.js process memory usage in bytes',
  labelNames: ['type'],
});

const processCpuSeconds = getOrCreateCounter('elevate_app_process_cpu_seconds_total', {
  help: 'Approximate process CPU usage in seconds',
  labelNames: ['type'],
});

const processUptimeSeconds = getOrCreateGauge('elevate_process_uptime_seconds', {
  help: 'Node.js process uptime in seconds',
});

const nodeVersionInfo = getOrCreateGauge('elevate_nodejs_version_info', {
  help: 'Node.js runtime version information',
  labelNames: ['version', 'major', 'minor', 'patch'],
});

let lastCpu = process.cpuUsage();
const cacheStats = new Map<string, { hit: number; miss: number }>();

export function observeRequestDuration(method: string, route: string, statusCode: number, durationMs: number) {
  requestDurationMs.labels(method, route, String(statusCode)).observe(durationMs);
  requestCountTotal.labels(method, route, String(statusCode)).inc();
}

export function observeGoogleApiLatency(api: string, operation: string, statusCode: number, durationMs: number) {
  googleApiLatencyMs.labels(api, operation, String(statusCode)).observe(durationMs);
}

export function observeMcpToolExecution(tool: string, status: 'ok' | 'error', durationMs: number) {
  mcpToolExecutionMs.labels(tool, status).observe(durationMs);
  mcpToolExecutionCount.labels(tool, status).inc();
}

export function incrementGoogleApiQuota(api: string, operation: string) {
  googleApiQuotaEvents.labels(api, operation).inc();
}

export function observeDatabaseLatency(operation: string, status: 'ok' | 'error', durationMs: number) {
  databaseLatencyMs.labels(operation, status).observe(durationMs);
}

export function observeCacheAccess(cache: string, result: 'hit' | 'miss') {
  cacheAccessTotal.labels(cache, result).inc();
  const current = cacheStats.get(cache) ?? { hit: 0, miss: 0 };
  current[result] += 1;
  cacheStats.set(cache, current);
  const total = current.hit + current.miss;
  cacheHitRatio.labels(cache).set(total === 0 ? 0 : current.hit / total);
}

export function updateProcessResourceMetrics() {
  const mem = process.memoryUsage();
  processMemoryBytes.labels('rss').set(mem.rss);
  processMemoryBytes.labels('heap_total').set(mem.heapTotal);
  processMemoryBytes.labels('heap_used').set(mem.heapUsed);
  processMemoryBytes.labels('external').set(mem.external);

  const cpu = process.cpuUsage(lastCpu);
  lastCpu = process.cpuUsage();
  processCpuSeconds.labels('user').inc(cpu.user / 1_000_000);
  processCpuSeconds.labels('system').inc(cpu.system / 1_000_000);
  processUptimeSeconds.set(process.uptime());
  const parsedVersion = /^v?(\d+)\.(\d+)\.(\d+)/.exec(process.version);
  const [, major = '0', minor = '0', patch = '0'] = parsedVersion ?? [];
  nodeVersionInfo.labels(process.version, major, minor, patch).set(1);
}

setInterval(() => {
  updateProcessResourceMetrics();
}, 10_000).unref();

export function getMetricsRegistry() {
  return register;
}

export function getNodeStatsSnapshot() {
  const load = os.loadavg();
  const mem = process.memoryUsage();
  return {
    cpuLoad1m: load[0],
    cpuLoad5m: load[1],
    cpuLoad15m: load[2],
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      uptimeSeconds: process.uptime(),
    },
  };
}
