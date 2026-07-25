import express from "express";
import { serverConfig } from "../config";
import { jsonBodyParser, requestTimeoutMiddleware } from "../middleware";

export interface AiRouteHandlers {
  cvAnalyze: express.RequestHandler;
  jobsSearch: express.RequestHandler;
  jobsDailyRecommendation: express.RequestHandler;
  jobsSalaryComparison: express.RequestHandler;
  jobsLinkedinImport: express.RequestHandler;
  jobsCoverLetter: express.RequestHandler;
  jobsRecommendations: express.RequestHandler;
  interviewStart: express.RequestHandler;
  interviewRespond: express.RequestHandler;
  goalsQuiz: express.RequestHandler;
  interviewTechnicalQuestions: express.RequestHandler;
  interviewTechnicalEvaluate: express.RequestHandler;
}

export function createAiRouter(handlers: AiRouteHandlers) {
  const router = express.Router();
  router.use(jsonBodyParser(serverConfig.bodyLimits.aiJson));

  router.post("/cv/analyze", requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiHeavy, "analisis de CV"), handlers.cvAnalyze);
  router.post("/jobs/search", requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "busqueda de vacantes"), handlers.jobsSearch);
  router.post(
    "/jobs/daily-recommendation",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "recomendacion diaria"),
    handlers.jobsDailyRecommendation,
  );
  router.post(
    "/jobs/salary-comparison",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "comparacion salarial"),
    handlers.jobsSalaryComparison,
  );
  router.post(
    "/jobs/linkedin-import",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "importacion de perfil"),
    handlers.jobsLinkedinImport,
  );
  router.post(
    "/jobs/cover-letter",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "generacion de carta"),
    handlers.jobsCoverLetter,
  );
  router.post(
    "/jobs/recommendations",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "recomendaciones de IA"),
    handlers.jobsRecommendations,
  );
  router.post("/interview/start", requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiHeavy, "inicio de entrevista"), handlers.interviewStart);
  router.post(
    "/interview/respond",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiHeavy, "respuesta de entrevista"),
    handlers.interviewRespond,
  );
  router.post("/goals/quiz", requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiDefault, "quiz de metas"), handlers.goalsQuiz);
  router.post(
    "/interview/technical/questions",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiHeavy, "preguntas tecnicas"),
    handlers.interviewTechnicalQuestions,
  );
  router.post(
    "/interview/technical/evaluate",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.aiHeavy, "evaluacion tecnica"),
    handlers.interviewTechnicalEvaluate,
  );

  return router;
}
