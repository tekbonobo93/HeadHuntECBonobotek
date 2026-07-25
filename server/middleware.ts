import express from "express";
import { checkAuthRateLimit } from "../authRateLimit";
import { AuthUser } from "../src/types";
import { serverConfig } from "./config";
import { ensureCsrfCookie, getCsrfToken, resolveAuthUser } from "./authContext";
import { forbiddenError, tooManyRequestsError, unauthorizedError } from "./http";
import { logSecurityEvent } from "./securityAudit";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isApiRequest(req: express.Request) {
  return req.path === "/api" || req.path.startsWith("/api/");
}

function getTrustedOrigins(req: express.Request) {
  const trustedOrigins = new Set(serverConfig.corsAllowedOrigins);
  const configuredAppUrl = process.env.APP_URL?.trim();

  if (configuredAppUrl) {
    trustedOrigins.add(new URL(configuredAppUrl).origin);
  } else {
    trustedOrigins.add(`${req.protocol}://${req.get("host") || "localhost"}`);
  }

  return trustedOrigins;
}

function getRequestOrigin(req: express.Request) {
  const originHeader = req.get("origin");
  if (originHeader) {
    return originHeader;
  }

  const refererHeader = req.get("referer");
  if (!refererHeader) {
    return null;
  }

  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
}

function applyCorsHeaders(res: express.Response, origin: string) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  res.setHeader("Vary", "Origin");
}

export function applySecurityMiddleware(app: express.Express) {
  app.disable("x-powered-by");

  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", true);
  }

  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", serverConfig.corsAllowedOrigins.length > 0 ? "cross-origin" : "same-site");
    res.setHeader("Origin-Agent-Cluster", "?1");

    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com;",
      );
    }

    next();
  });

  app.use((req, res, next) => {
    ensureCsrfCookie(req, res);
    next();
  });

  app.use((req, res, next) => {
    if (!isApiRequest(req)) {
      return next();
    }

    const origin = req.get("origin");
    if (!origin) {
      return next();
    }

    if (!getTrustedOrigins(req).has(origin)) {
      if (req.method === "OPTIONS") {
        return res.status(403).json({ error: "Origen no permitido por la politica CORS." });
      }

      logSecurityEvent("warn", "cors.rejected", req, { origin });
      return next();
    }

    applyCorsHeaders(res, origin);
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.use((req, res, next) => {
    if (!isApiRequest(req) || !STATE_CHANGING_METHODS.has(req.method)) {
      return next();
    }

    const requestOrigin = getRequestOrigin(req);
    if (!requestOrigin) {
      if (process.env.NODE_ENV === "production") {
        logSecurityEvent("warn", "csrf.origin_missing", req);
        return next(forbiddenError("La solicitud fue rechazada por validacion de origen."));
      }

      return next();
    }

    if (!getTrustedOrigins(req).has(requestOrigin)) {
      logSecurityEvent("warn", "csrf.origin_rejected", req, { origin: requestOrigin });
      return next(forbiddenError("La solicitud fue rechazada por validacion de origen."));
    }

    const csrfCookie = getCsrfToken(req);
    const csrfHeader = req.get(serverConfig.csrfHeaderName);
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logSecurityEvent("warn", "csrf.token_rejected", req);
      return next(forbiddenError("La solicitud fue rechazada por validacion CSRF."));
    }

    next();
  });

  app.use(express.urlencoded({ limit: serverConfig.bodyLimits.urlencoded, extended: false }));
}

export function getClientIp(req: express.Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

export async function authRateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const limit = serverConfig.authRouteLimits[req.path] ?? 20;
  const key = `${req.path}:${getClientIp(req)}`;

  try {
    const result = await checkAuthRateLimit(key, limit);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      logSecurityEvent("warn", "auth.rate_limit_blocked", req, {
        retryAfterSeconds: result.retryAfterSeconds,
        limit,
      });
      throw tooManyRequestsError("Demasiados intentos en autenticacion. Espera unos minutos e intentalo de nuevo.", {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuthenticatedApiUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.path.startsWith("/auth")) {
    return next();
  }

  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      throw unauthorizedError("Sesion no valida o expirada.");
    }

    res.locals.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = res.locals.authUser as AuthUser | undefined;
  if (!user || user.role !== "admin") {
    logSecurityEvent("warn", "admin.access_denied", req, {
      userId: user?.id || null,
      role: user?.role || null,
    });
    return next(forbiddenError("Este recurso requiere rol administrador."));
  }

  next();
}

export function jsonBodyParser(limit: string) {
  return express.json({ limit });
}

export function requestTimeoutMiddleware(timeoutMs: number, label = "solicitud") {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setTimeout(timeoutMs, () => {
      if (res.headersSent) {
        return;
      }

      logSecurityEvent("warn", "request.timeout", req, { label, timeoutMs });
      res.status(408).json({
        error: `La ${label} excedio el tiempo maximo permitido.`,
      });
    });

    next();
  };
}
