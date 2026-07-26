import express from "express";
import { listUsers, revokeUserSessions, setUserLockState, updateUserRole } from "../../db";
import { AuthUser } from "../../src/types";
import { serverConfig } from "../config";
import { asyncHandler, badRequestError } from "../http";
import { jsonBodyParser, requireAdmin, requestTimeoutMiddleware } from "../middleware";
import { getObservabilitySnapshot } from "../observability";
import { getRecentSecurityEvents, logSecurityEvent } from "../securityAudit";
import { adminLockUpdateSchema, adminRoleUpdateSchema } from "../validation";

export function createAdminRouter() {
  const router = express.Router();

  router.use(requireAdmin);
  router.use(jsonBodyParser(serverConfig.bodyLimits.admin ?? "32kb"));

  router.get(
    "/users",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "consulta administrativa"),
    asyncHandler(async (req, res) => {
      const user = res.locals.authUser as AuthUser;
      const users = await listUsers();
      logSecurityEvent("info", "admin.users_listed", req, {
        userId: user.id,
        email: user.email,
      });
      res.json({ users });
    }),
  );

  router.get(
    "/observability",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "observabilidad administrativa"),
    asyncHandler(async (req, res) => {
      const user = res.locals.authUser as AuthUser;
      logSecurityEvent("info", "admin.observability_viewed", req, {
        userId: user.id,
        email: user.email,
      });
      res.json(getObservabilitySnapshot());
    }),
  );

  router.get(
    "/security-events",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "auditoria administrativa"),
    asyncHandler(async (req, res) => {
      const user = res.locals.authUser as AuthUser;
      const level = typeof req.query.level === "string" && ["info", "warn", "error"].includes(req.query.level)
        ? (req.query.level as "info" | "warn" | "error")
        : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const limit = Number.isFinite(rawLimit) ? rawLimit : undefined;

      logSecurityEvent("info", "admin.security_events_viewed", req, {
        userId: user.id,
        email: user.email,
        level: level || null,
        search: search || null,
        limit: limit || null,
      });

      res.json({
        events: getRecentSecurityEvents({ level, search, limit }),
      });
    }),
  );

  router.patch(
    "/users/:userId/role",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "actualizacion de rol"),
    asyncHandler(async (req, res) => {
      const parsed = adminRoleUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw badRequestError("Rol administrativo invalido.");
      }

      const actor = res.locals.authUser as AuthUser;

      try {
        const updatedUser = await updateUserRole(req.params.userId, parsed.data.role, actor.id);
        if (!updatedUser) {
          throw badRequestError("El usuario objetivo no existe.");
        }

        logSecurityEvent("warn", "admin.user_role_updated", req, {
          actorUserId: actor.id,
          actorEmail: actor.email,
          targetUserId: updatedUser.id,
          targetEmail: updatedUser.email,
          nextRole: updatedUser.role,
        });

        res.json({ user: updatedUser });
      } catch (error) {
        if (error instanceof Error && error.message === "SELF_ROLE_DOWNGRADE_NOT_ALLOWED") {
          throw badRequestError("No puedes degradar tu propio rol de administrador.");
        }

        if (error instanceof Error && error.message === "LAST_ADMIN_DOWNGRADE_NOT_ALLOWED") {
          throw badRequestError("No puedes quitar el rol al ultimo administrador activo.");
        }

        throw error;
      }
    }),
  );

  router.patch(
    "/users/:userId/lock",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "actualizacion de bloqueo"),
    asyncHandler(async (req, res) => {
      const parsed = adminLockUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw badRequestError("Estado de bloqueo administrativo invalido.");
      }

      const actor = res.locals.authUser as AuthUser;
      if (req.params.userId === actor.id && parsed.data.locked) {
        throw badRequestError("No puedes bloquear tu propia cuenta desde el panel administrativo.");
      }
      const updatedState = await setUserLockState(req.params.userId, parsed.data.locked);
      if (!updatedState) {
        throw badRequestError("El usuario objetivo no existe.");
      }

      logSecurityEvent("warn", "admin.user_lock_updated", req, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        targetUserId: updatedState.user.id,
        targetEmail: updatedState.user.email,
        locked: parsed.data.locked,
        lockedUntil: updatedState.lockedUntil,
      });

      res.json(updatedState);
    }),
  );

  router.post(
    "/users/:userId/revoke-sessions",
    requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.admin, "revocacion de sesiones"),
    asyncHandler(async (req, res) => {
      const actor = res.locals.authUser as AuthUser;
      if (req.params.userId === actor.id) {
        throw badRequestError("No puedes revocar tu propia sesion activa desde esta accion.");
      }
      const revokedSessions = await revokeUserSessions(req.params.userId);

      logSecurityEvent("warn", "admin.user_sessions_revoked", req, {
        actorUserId: actor.id,
        actorEmail: actor.email,
        targetUserId: req.params.userId,
        revokedSessions,
      });

      res.json({ revokedSessions });
    }),
  );

  return router;
}
