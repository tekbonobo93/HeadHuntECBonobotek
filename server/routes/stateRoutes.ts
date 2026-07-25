import express from "express";
import { getPersistedState, listUsers, patchPersistedState } from "../../db";
import { AuthUser } from "../../src/types";
import { serverConfig } from "../config";
import { asyncHandler, badRequestError } from "../http";
import { jsonBodyParser, requestTimeoutMiddleware, requireAdmin } from "../middleware";
import { getObservabilitySnapshot } from "../observability";
import { logSecurityEvent } from "../securityAudit";
import { statePatchSchema } from "../validation";

export function createStateRouter() {
  const router = express.Router();
  router.use(requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.state, "solicitud de estado"));
  router.use(jsonBodyParser(serverConfig.bodyLimits.stateJson));

  router.get(
    "/state",
    asyncHandler(async (_req, res) => {
      const user = res.locals.authUser as AuthUser;
      const state = await getPersistedState(user.id);
      res.json(state);
    }),
  );

  router.patch(
    "/state",
    asyncHandler(async (req, res) => {
      const parsed = statePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequestError("El cuerpo de la solicitud debe ser un objeto JSON.");
      }

      const user = res.locals.authUser as AuthUser;
      const state = await patchPersistedState(user.id, parsed.data);
      res.json(state);
    }),
  );

  router.get(
    "/admin/users",
    requireAdmin,
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "consulta administrativa"),
    asyncHandler(async (_req, res) => {
      const user = res.locals.authUser as AuthUser;
      const users = await listUsers();
      logSecurityEvent("info", "admin.users_listed", _req, {
        userId: user.id,
        email: user.email,
      });
      res.json({ users });
    }),
  );

  router.get(
    "/admin/observability",
    requireAdmin,
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "observabilidad administrativa"),
    asyncHandler(async (_req, res) => {
      const user = res.locals.authUser as AuthUser;
      logSecurityEvent("info", "admin.observability_viewed", _req, {
        userId: user.id,
        email: user.email,
      });
      res.json(getObservabilitySnapshot());
    }),
  );

  return router;
}
