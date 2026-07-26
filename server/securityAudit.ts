import express from "express";

type SecurityAuditLevel = "info" | "warn" | "error";

interface SecurityAuditDetails {
  [key: string]: unknown;
}

interface SecurityAuditEvent {
  timestamp: string;
  category: "security_audit";
  level: SecurityAuditLevel;
  event: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  details: SecurityAuditDetails;
}

const MAX_AUDIT_EVENTS = 200;
const recentSecurityEvents: SecurityAuditEvent[] = [];

function getClientIp(req: express.Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

function sanitizeUserAgent(userAgent?: string) {
  if (!userAgent) {
    return undefined;
  }

  return userAgent.slice(0, 200);
}

export function logSecurityEvent(
  level: SecurityAuditLevel,
  event: string,
  req: express.Request,
  details: SecurityAuditDetails = {},
) {
  const payload: SecurityAuditEvent = {
    timestamp: new Date().toISOString(),
    category: "security_audit",
    level,
    event,
    method: req.method,
    path: req.originalUrl,
    ip: getClientIp(req),
    userAgent: sanitizeUserAgent(req.get("user-agent")),
    details,
  };

  recentSecurityEvents.unshift(payload);
  if (recentSecurityEvents.length > MAX_AUDIT_EVENTS) {
    recentSecurityEvents.length = MAX_AUDIT_EVENTS;
  }

  console[level](JSON.stringify(payload));
}

export function getRecentSecurityEvents(filters?: {
  level?: SecurityAuditLevel;
  search?: string;
  limit?: number;
}) {
  const normalizedSearch = filters?.search?.trim().toLowerCase();
  const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);

  return recentSecurityEvents
    .filter((entry) => {
      if (filters?.level && entry.level !== filters.level) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = JSON.stringify(entry).toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .slice(0, limit);
}
