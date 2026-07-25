import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { checkDatabaseHealth, initializeDatabase } from "../db";
import {
  applySecurityMiddleware,
  authRateLimitMiddleware,
  requireAuthenticatedApiUser,
} from "./middleware";
import {
  cvAnalyzeHandler,
  goalsQuizHandler,
  interviewRespondHandler,
  interviewStartHandler,
  interviewTechnicalEvaluateHandler,
  interviewTechnicalQuestionsHandler,
  jobsCoverLetterHandler,
  jobsDailyRecommendationHandler,
  jobsLinkedinImportHandler,
  jobsRecommendationsHandler,
  jobsSalaryComparisonHandler,
  jobsSearchHandler,
} from "./aiHandlers";
import { createAiRouter } from "./routes/aiRoutes";
import { createAuthRouter } from "./routes/authRoutes";
import { createStateRouter } from "./routes/stateRoutes";
import { validateProductionConfig } from "./config";
import { asyncHandler, sendJsonError } from "./http";
import {
  getObservabilitySnapshot,
  logEvent,
  requestContextMiddleware,
  requestLoggingMiddleware,
  startDatabaseHeartbeat,
  updateDatabaseHealth,
} from "./observability";

export function createApp() {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(requestLoggingMiddleware);
  applySecurityMiddleware(app);

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const dbHealth = await checkDatabaseHealth();
      updateDatabaseHealth(dbHealth.ok, dbHealth.latencyMs, dbHealth.error);
      const snapshot = getObservabilitySnapshot();

      res.status(dbHealth.ok ? 200 : 503).json({
        ok: dbHealth.ok,
        status: dbHealth.ok ? "healthy" : "degraded",
        checks: {
          database: snapshot.database,
        },
        uptimeSeconds: snapshot.uptimeSeconds,
      });
    }),
  );

  app.use("/api/auth", authRateLimitMiddleware, createAuthRouter());

  app.use(
    "/api",
    requireAuthenticatedApiUser,
    createStateRouter(),
    createAiRouter({
      cvAnalyze: cvAnalyzeHandler,
      jobsSearch: jobsSearchHandler,
      jobsDailyRecommendation: jobsDailyRecommendationHandler,
      jobsSalaryComparison: jobsSalaryComparisonHandler,
      jobsLinkedinImport: jobsLinkedinImportHandler,
      jobsCoverLetter: jobsCoverLetterHandler,
      jobsRecommendations: jobsRecommendationsHandler,
      interviewStart: interviewStartHandler,
      interviewRespond: interviewRespondHandler,
      goalsQuiz: goalsQuizHandler,
      interviewTechnicalQuestions: interviewTechnicalQuestionsHandler,
      interviewTechnicalEvaluate: interviewTechnicalEvaluateHandler,
    }),
  );

  app.use(sendJsonError);
  return app;
}

export async function startServer() {
  validateProductionConfig();
  await initializeDatabase();
  startDatabaseHeartbeat(checkDatabaseHealth);

  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const shouldServeFrontend = process.env.SERVE_FRONTEND === "true";

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (shouldServeFrontend) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app.listen(port, host, () => {
    logEvent("info", "server.started", {
      host,
      port,
      nodeEnv: process.env.NODE_ENV || "development",
    });
  });
}
