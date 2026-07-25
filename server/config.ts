import { validateRateLimitConfigForProduction } from "../authRateLimit";
import { validateSmtpConfigForProduction } from "../mailer";

function parseOriginList(rawValue?: string) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin);
}

export const serverConfig = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",
  sessionCookieName: "talentomatch_session",
  sessionCookieMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
  csrfCookieName: "talentomatch_csrf",
  csrfHeaderName: "x-csrf-token",
  authPreviewLinks: process.env.AUTH_PREVIEW_LINKS === "true" || process.env.NODE_ENV !== "production",
  corsAllowedOrigins: parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  bodyLimits: {
    authJson: "64kb",
    stateJson: "1mb",
    aiJson: "2mb",
    urlencoded: "32kb",
  },
  requestTimeoutsMs: {
    auth: 15_000,
    state: 15_000,
    admin: 10_000,
    aiDefault: 45_000,
    aiHeavy: 90_000,
  },
  authRouteLimits: {
    "/session": 40,
    "/login": 10,
    "/register": 8,
    "/logout": 20,
    "/forgot-password": 6,
    "/reset-password": 8,
    "/verify-email": 8,
    "/resend-verification": 6,
  } as Record<string, number>,
};

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  validateSmtpConfigForProduction();
  validateRateLimitConfigForProduction();

  const missingVars: string[] = [];

  if (!process.env.APP_URL?.trim()) {
    missingVars.push("APP_URL");
  }

  if (!process.env.INITIAL_ADMIN_EMAIL?.trim()) {
    missingVars.push("INITIAL_ADMIN_EMAIL");
  }

  if (process.env.TRUST_PROXY !== "true") {
    missingVars.push("TRUST_PROXY=true");
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required production configuration: ${missingVars.join(", ")}`);
  }

  if (process.env.AUTH_PREVIEW_LINKS === "true") {
    console.warn("[startup] AUTH_PREVIEW_LINKS=true is enabled in production. Use it only temporarily while SMTP is pending.");
  }
}
