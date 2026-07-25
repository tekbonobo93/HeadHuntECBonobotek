import express from "express";

type SecurityAuditLevel = "info" | "warn" | "error";

interface SecurityAuditDetails {
  [key: string]: unknown;
}

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
  const payload = {
    timestamp: new Date().toISOString(),
    category: "security_audit",
    level,
    event,
    method: req.method,
    path: req.originalUrl,
    ip: getClientIp(req),
    userAgent: sanitizeUserAgent(req.get("user-agent")),
    ...details,
  };

  console[level](JSON.stringify(payload));
}
