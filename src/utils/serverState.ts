import { AuthSessionResponse, PersistedAppState } from "../types";
import { createDefaultPersistedState } from "./persistedState";

let notificationConfigCache = createDefaultPersistedState().notificationConfig;

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieName = `${name}=`;
  for (const cookie of document.cookie.split(";")) {
    const normalized = cookie.trim();
    if (normalized.startsWith(cookieName)) {
      return decodeURIComponent(normalized.slice(cookieName.length));
    }
  }

  return null;
}

export function createJsonApiInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const csrfToken = readCookie("talentomatch_csrf");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return {
    credentials: "same-origin",
    ...init,
    headers,
  };
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, createJsonApiInit(init));

  if (!response.ok) {
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }

    throw new ApiError(
      (typeof data.error === "string" && data.error) || text || `Request failed with status ${response.status}`,
      response.status,
      data,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchPersistedState(): Promise<PersistedAppState> {
  const state = await requestJson<PersistedAppState>("/api/state");
  notificationConfigCache = state.notificationConfig;
  return state;
}

export async function patchPersistedState(
  patch: Partial<PersistedAppState>,
): Promise<PersistedAppState> {
  const state = await requestJson<PersistedAppState>("/api/state", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  notificationConfigCache = state.notificationConfig;
  return state;
}

export function getNotificationConfigCache() {
  return notificationConfigCache;
}

export function setNotificationConfigCache(config: PersistedAppState["notificationConfig"]) {
  notificationConfigCache = config;
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/session");
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logoutSession(): Promise<void> {
  await requestJson<{ ok: true }>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function resendVerificationEmail(email: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function verifyEmailToken(token: string): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
