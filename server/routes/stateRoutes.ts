import express from "express";
import { getPersistedState, patchPersistedState } from "../../db";
import { AuthUser } from "../../src/types";
import { serverConfig } from "../config";
import { asyncHandler, badRequestError } from "../http";
import { jsonBodyParser, requestTimeoutMiddleware } from "../middleware";
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
  return router;
}
