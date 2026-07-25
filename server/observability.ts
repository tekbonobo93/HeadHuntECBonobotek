import { randomUUID } from "node:crypto";
import express from "express";

type LogLevel = "info" | "warn" | "error";

interface RouteMetric {
  count: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
  lastStatus: number;
  lastSeenAt: string;
}

interface DatabaseHealthSnapshot {
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastError: string | null;
  latencyMs: number | null;
  status: "healthy" | "degraded" | "unknown";
}

interface GeminiFailureSnapshot {
  byScope: Record<string, number>;
  lastError: string | null;
  lastFailureAt: string | null;
  total: number;
  windowFailures: number;
}

const routeMetrics = new Map<string, RouteMetric>();
const recentRequestEvents: Array<{ at: number; failed: boolean }> = [];
const recentGeminiFailures: number[] = [];

const requestAlertWindowMs = 5 * 60 * 1000;
const geminiAlertWindowMs = 10 * 60 * 1000;

const metricsState = {
  appStartedAt: new Date().toISOString(),
  gemini: {
    byScope: {} as Record<string, number>,
    lastError: null as string | null,
    lastFailureAt: null as string | null,
    total: 0,
  },
  db: {
    consecutiveFailures: 0,
    lastCheckedAt: null as string | null,
    lastError: null as string | null,
    latencyMs: null as number | null,
    status: "unknown" as DatabaseHealthSnapshot["status"],
  },
  alerts: {
    dbUnavailableActive: false,
    highErrorRateActive: false,
    geminiFailuresActive: false,
  },
};

function trimWindow(events: number[] | Array<{ at: number; failed: boolean }>, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  if (events.length === 0) {
    return;
  }

  if (typeof events[0] === "number") {
    while (events.length > 0 && (events[0] as number) < cutoff) {
      events.shift();
    }
    return;
  }

  while (events.length > 0 && (events[0] as { at: number }).at < cutoff) {
    events.shift();
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return { message: String(error) };
}

export function logEvent(level: LogLevel, event: string, details: Record<string, unknown> = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  });

  console[level](payload);
}

export function requestContextMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requestId = req.get("x-request-id")?.trim() || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

function getRouteKey(req: express.Request) {
  const path = req.originalUrl.split("?")[0] || req.path || "/";
  return `${req.method} ${path}`;
}

function evaluateErrorRateAlert() {
  trimWindow(recentRequestEvents, requestAlertWindowMs);
  const total = recentRequestEvents.length;
  const errors = recentRequestEvents.filter((entry) => entry.failed).length;
  const errorRate = total > 0 ? errors / total : 0;

  if (total >= 20 && errorRate >= 0.2) {
    if (!metricsState.alerts.highErrorRateActive) {
      metricsState.alerts.highErrorRateActive = true;
      logEvent("error", "alert.high_error_rate", {
        totalRequests: total,
        errorRequests: errors,
        errorRate,
        windowMinutes: requestAlertWindowMs / 60000,
      });
    }
    return;
  }

  if (metricsState.alerts.highErrorRateActive) {
    metricsState.alerts.highErrorRateActive = false;
    logEvent("info", "alert.high_error_rate_recovered", {
      totalRequests: total,
      errorRequests: errors,
      errorRate,
    });
  }
}

function recordRequestMetric(routeKey: string, statusCode: number, durationMs: number) {
  const existing = routeMetrics.get(routeKey) ?? {
    count: 0,
    errors: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0,
    lastStatus: 0,
    lastSeenAt: new Date().toISOString(),
  };

  existing.count += 1;
  existing.totalDurationMs += durationMs;
  existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
  existing.lastDurationMs = durationMs;
  existing.lastStatus = statusCode;
  existing.lastSeenAt = new Date().toISOString();
  if (statusCode >= 400) {
    existing.errors += 1;
  }
  routeMetrics.set(routeKey, existing);

  recentRequestEvents.push({ at: Date.now(), failed: statusCode >= 400 });
  evaluateErrorRateAlert();
}

export function requestLoggingMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const routeKey = getRouteKey(req);
    recordRequestMetric(routeKey, res.statusCode, durationMs);

    logEvent(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", "http.request.completed", {
      requestId: res.locals.requestId || null,
      method: req.method,
      path: req.originalUrl,
      routeKey,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      contentLength: res.getHeader("Content-Length") || null,
    });
  });

  next();
}

export function recordGeminiFailure(scope: string, error: unknown) {
  metricsState.gemini.total += 1;
  metricsState.gemini.byScope[scope] = (metricsState.gemini.byScope[scope] || 0) + 1;
  metricsState.gemini.lastFailureAt = new Date().toISOString();
  metricsState.gemini.lastError = serializeError(error).message;
  recentGeminiFailures.push(Date.now());
  trimWindow(recentGeminiFailures, geminiAlertWindowMs);

  logEvent("warn", "gemini.failure", {
    scope,
    error: serializeError(error),
    windowFailures: recentGeminiFailures.length,
  });

  if (recentGeminiFailures.length >= 5) {
    if (!metricsState.alerts.geminiFailuresActive) {
      metricsState.alerts.geminiFailuresActive = true;
      logEvent("error", "alert.gemini_failures", {
        windowMinutes: geminiAlertWindowMs / 60000,
        failures: recentGeminiFailures.length,
      });
    }
    return;
  }

  if (metricsState.alerts.geminiFailuresActive) {
    metricsState.alerts.geminiFailuresActive = false;
    logEvent("info", "alert.gemini_failures_recovered", {
      windowFailures: recentGeminiFailures.length,
    });
  }
}

export function updateDatabaseHealth(ok: boolean, latencyMs: number | null, error?: unknown) {
  metricsState.db.lastCheckedAt = new Date().toISOString();
  metricsState.db.latencyMs = latencyMs;

  if (ok) {
    const wasDegraded = metricsState.db.status !== "healthy";
    metricsState.db.status = "healthy";
    metricsState.db.lastError = null;
    metricsState.db.consecutiveFailures = 0;
    if (metricsState.alerts.dbUnavailableActive) {
      metricsState.alerts.dbUnavailableActive = false;
      logEvent("info", "alert.db_unavailable_recovered", {
        latencyMs,
      });
    } else if (wasDegraded) {
      logEvent("info", "db.health.recovered", {
        latencyMs,
      });
    }
    return;
  }

  metricsState.db.status = "degraded";
  metricsState.db.consecutiveFailures += 1;
  metricsState.db.lastError = serializeError(error).message;
  logEvent("error", "db.health.failed", {
    latencyMs,
    consecutiveFailures: metricsState.db.consecutiveFailures,
    error: serializeError(error),
  });

  if (metricsState.db.consecutiveFailures >= 3 && !metricsState.alerts.dbUnavailableActive) {
    metricsState.alerts.dbUnavailableActive = true;
    logEvent("error", "alert.db_unavailable", {
      consecutiveFailures: metricsState.db.consecutiveFailures,
      lastError: metricsState.db.lastError,
    });
  }
}

export async function runDatabaseHeartbeat(check: () => Promise<{ ok: boolean; latencyMs: number | null; error?: unknown }>) {
  const result = await check();
  updateDatabaseHealth(result.ok, result.latencyMs, result.error);
}

export function startDatabaseHeartbeat(check: () => Promise<{ ok: boolean; latencyMs: number | null; error?: unknown }>, intervalMs = 30000) {
  void runDatabaseHeartbeat(check);
  const handle = setInterval(() => {
    void runDatabaseHeartbeat(check);
  }, intervalMs);
  handle.unref?.();
}

export function getObservabilitySnapshot() {
  trimWindow(recentRequestEvents, requestAlertWindowMs);
  trimWindow(recentGeminiFailures, geminiAlertWindowMs);

  const requestsInWindow = recentRequestEvents.length;
  const errorCountInWindow = recentRequestEvents.filter((entry) => entry.failed).length;

  const routes = Array.from(routeMetrics.entries())
    .map(([route, metric]) => ({
      route,
      count: metric.count,
      errors: metric.errors,
      errorRate: metric.count > 0 ? Number((metric.errors / metric.count).toFixed(4)) : 0,
      avgDurationMs: metric.count > 0 ? Number((metric.totalDurationMs / metric.count).toFixed(2)) : 0,
      maxDurationMs: Number(metric.maxDurationMs.toFixed(2)),
      lastDurationMs: Number(metric.lastDurationMs.toFixed(2)),
      lastStatus: metric.lastStatus,
      lastSeenAt: metric.lastSeenAt,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 20);

  return {
    uptimeSeconds: Math.round((Date.now() - new Date(metricsState.appStartedAt).getTime()) / 1000),
    startedAt: metricsState.appStartedAt,
    alerts: {
      ...metricsState.alerts,
      requestWindowMinutes: requestAlertWindowMs / 60000,
      geminiWindowMinutes: geminiAlertWindowMs / 60000,
    },
    requests: {
      windowCount: requestsInWindow,
      windowErrors: errorCountInWindow,
      windowErrorRate: requestsInWindow > 0 ? Number((errorCountInWindow / requestsInWindow).toFixed(4)) : 0,
      routes,
    },
    database: { ...metricsState.db } satisfies DatabaseHealthSnapshot,
    gemini: {
      ...metricsState.gemini,
      windowFailures: recentGeminiFailures.length,
    } satisfies GeminiFailureSnapshot,
  };
}
