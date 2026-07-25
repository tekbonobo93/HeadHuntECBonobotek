import express from "express";
import { randomBytes } from "node:crypto";
import { getUserBySessionToken } from "../db";
import { serverConfig } from "./config";

export function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const item of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = item.trim().split("=");
    if (!rawName) continue;
    cookies[rawName] = decodeURIComponent(rawValueParts.join("="));
  }

  return cookies;
}

export function getSessionToken(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[serverConfig.sessionCookieName] || null;
}

function appendSetCookie(res: express.Response, cookieValue: string) {
  const currentHeader = res.getHeader("Set-Cookie");
  if (!currentHeader) {
    res.setHeader("Set-Cookie", [cookieValue]);
    return;
  }

  if (Array.isArray(currentHeader)) {
    res.setHeader("Set-Cookie", [...currentHeader.map(String), cookieValue]);
    return;
  }

  res.setHeader("Set-Cookie", [String(currentHeader), cookieValue]);
}

export function setSessionCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  appendSetCookie(
    res,
    `${serverConfig.sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      serverConfig.sessionCookieMaxAgeMs / 1000,
    )}${secure ? "; Secure" : ""}`,
  );
}

export function clearSessionCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === "production";
  appendSetCookie(res, `${serverConfig.sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
}

export function getCsrfToken(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[serverConfig.csrfCookieName] || null;
}

export function ensureCsrfCookie(req: express.Request, res: express.Response) {
  const existingToken = getCsrfToken(req);
  if (existingToken) {
    return existingToken;
  }

  const secure = process.env.NODE_ENV === "production";
  const csrfToken = randomBytes(32).toString("hex");
  appendSetCookie(
    res,
    `${serverConfig.csrfCookieName}=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      serverConfig.sessionCookieMaxAgeMs / 1000,
    )}${secure ? "; Secure" : ""}`,
  );

  return csrfToken;
}

export function getRequestBaseUrl(req: express.Request) {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host") || "localhost"}`;
}

export function buildAuthActionUrl(req: express.Request, mode: "verify" | "reset", token: string) {
  const baseUrl = getRequestBaseUrl(req);
  return `${baseUrl}/?mode=${mode}&token=${encodeURIComponent(token)}`;
}

export function buildPreviewUrl(req: express.Request, mode: "verify" | "reset", token?: string | null) {
  if (!serverConfig.authPreviewLinks || !token) {
    return null;
  }

  return buildAuthActionUrl(req, mode, token);
}

export async function resolveAuthUser(req: express.Request) {
  const token = getSessionToken(req);
  if (!token) return null;
  return getUserBySessionToken(token);
}
