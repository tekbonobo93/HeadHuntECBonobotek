import express from "express";
import { ZodError } from "zod";
import { logEvent } from "./observability";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(
  handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFoundError(message: string) {
  return new HttpError(404, message);
}

export function badRequestError(message: string, details?: unknown) {
  return new HttpError(400, message, details);
}

export function unauthorizedError(message: string) {
  return new HttpError(401, message);
}

export function forbiddenError(message: string) {
  return new HttpError(403, message);
}

export function lockedError(message: string, details?: unknown) {
  return new HttpError(423, message, details);
}

export function tooManyRequestsError(message: string, details?: unknown) {
  return new HttpError(429, message, details);
}

export function sendJsonError(error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Solicitud invalida.",
      details: error.flatten(),
    });
  }

  const bodyParserError = error as { type?: string; status?: number; message?: string };
  if (bodyParserError.type === "entity.too.large") {
    return res.status(413).json({
      error: "El cuerpo de la solicitud supera el limite permitido para este endpoint.",
    });
  }

  if (bodyParserError.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "El cuerpo JSON de la solicitud es invalido.",
    });
  }

  if (error instanceof HttpError) {
    logEvent(error.status >= 500 ? "error" : "warn", "http.request.error", {
      requestId: res.locals.requestId || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: error.status,
      error: error.message,
      details: error.details,
    });
    return res.status(error.status).json({
      error: error.message,
      details: error.details,
    });
  }

  const err = error as Error;
  logEvent("error", "http.request.unhandled_error", {
    requestId: res.locals.requestId || null,
    method: req.method,
    path: req.originalUrl,
    error: err?.message || "unknown_error",
    name: err?.name || null,
  });
  return res.status(500).json({
    error: err?.message || "Ocurrio un error interno en el servidor.",
  });
}
