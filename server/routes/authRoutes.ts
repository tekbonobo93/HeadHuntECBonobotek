import express from "express";
import { authenticateUser, createEmailVerificationToken, createPasswordResetToken, createSession, createUser, deleteSession, resendEmailVerificationToken, resetPasswordWithToken, verifyEmailByToken } from "../../db";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../mailer";
import { buildAuthActionUrl, buildPreviewUrl, clearSessionCookie, getSessionToken, resolveAuthUser, setSessionCookie } from "../authContext";
import { asyncHandler, badRequestError, forbiddenError, lockedError, unauthorizedError } from "../http";
import { serverConfig } from "../config";
import { jsonBodyParser, requestTimeoutMiddleware } from "../middleware";
import { logSecurityEvent } from "../securityAudit";
import { emailBodySchema, loginBodySchema, registerBodySchema, resetPasswordBodySchema, verifyTokenBodySchema } from "../validation";

export function createAuthRouter() {
  const router = express.Router();
  router.use(requestTimeoutMiddleware(serverConfig.requestTimeoutsMs.auth, "solicitud de autenticacion"));
  router.use(jsonBodyParser(serverConfig.bodyLimits.authJson));

  router.get(
    "/session",
    asyncHandler(async (req, res) => {
      const user = await resolveAuthUser(req);
      res.json({
        authenticated: Boolean(user),
        user,
      });
    }),
  );

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const { name, email, password } = registerBodySchema.parse(req.body ?? {});

      try {
        const user = await createUser(name, email, password);
        const verificationToken = await createEmailVerificationToken(user.id);
        const verificationUrl = buildAuthActionUrl(req, "verify", verificationToken);
        await sendVerificationEmail(email, name.trim(), verificationUrl);
        logSecurityEvent("info", "auth.register.succeeded", req, {
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        res.status(201).json({
          authenticated: false,
          user: null,
          requiresEmailVerification: true,
          verificationEmailSent: true,
          message: "Tu cuenta fue creada. Verifica tu correo antes de iniciar sesion.",
          previewUrl: buildPreviewUrl(req, "verify", verificationToken),
        });
      } catch (error: any) {
        if (error?.code === "23505") {
          logSecurityEvent("warn", "auth.register.duplicate", req, { email: email.trim().toLowerCase() });
          throw badRequestError("Ya existe una cuenta con ese correo.");
        }
        throw error;
      }
    }),
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const { email, password } = loginBodySchema.parse(req.body ?? {});
      const authResult = await authenticateUser(email, password);

      if (authResult.ok === false) {
        if (authResult.reason === "email_not_verified") {
          logSecurityEvent("warn", "auth.login.email_not_verified", req, { email: email.trim().toLowerCase() });
          const verification = await resendEmailVerificationToken(email);
          if (verification) {
            const verificationUrl = buildAuthActionUrl(req, "verify", verification.token);
            await sendVerificationEmail(verification.user.email, verification.user.name, verificationUrl);
          }

          throw forbiddenError("Debes verificar tu correo antes de iniciar sesion.");
        }

        if (authResult.reason === "locked") {
          logSecurityEvent("warn", "auth.login.locked", req, {
            email: email.trim().toLowerCase(),
            lockedUntil: authResult.lockedUntil || null,
          });
          throw lockedError("La cuenta fue bloqueada temporalmente por multiples intentos fallidos.", {
            lockedUntil: authResult.lockedUntil || null,
          });
        }

        logSecurityEvent("warn", "auth.login.failed", req, { email: email.trim().toLowerCase() });
        throw unauthorizedError("Credenciales invalidas.");
      }

      const token = await createSession(authResult.user.id);
      setSessionCookie(res, token);
      logSecurityEvent("info", "auth.login.succeeded", req, {
        userId: authResult.user.id,
        email: authResult.user.email,
        role: authResult.user.role,
      });
      res.json({ authenticated: true, user: authResult.user });
    }),
  );

  router.post(
    "/resend-verification",
    asyncHandler(async (req, res) => {
      const { email } = emailBodySchema.parse(req.body ?? {});
      const verification = await resendEmailVerificationToken(email);
      if (verification) {
        const verificationUrl = buildAuthActionUrl(req, "verify", verification.token);
        await sendVerificationEmail(verification.user.email, verification.user.name, verificationUrl);
      }
      logSecurityEvent("info", "auth.verification_resent", req, {
        email: email.trim().toLowerCase(),
        accountFound: Boolean(verification),
      });

      res.json({
        authenticated: false,
        user: null,
        requiresEmailVerification: true,
        verificationEmailSent: true,
        message: "Si la cuenta existe y sigue pendiente, enviamos un nuevo enlace de verificacion.",
        previewUrl: buildPreviewUrl(req, "verify", verification?.token),
      });
    }),
  );

  router.post(
    "/verify-email",
    asyncHandler(async (req, res) => {
      const { token } = verifyTokenBodySchema.parse(req.body ?? {});
      const user = await verifyEmailByToken(token);
      if (!user) {
        logSecurityEvent("warn", "auth.verify_email.failed", req);
        throw badRequestError("El enlace de verificacion no es valido o ya expiro.");
      }

      const sessionToken = await createSession(user.id);
      setSessionCookie(res, sessionToken);
      logSecurityEvent("info", "auth.verify_email.succeeded", req, {
        userId: user.id,
        email: user.email,
      });
      res.json({
        authenticated: true,
        user,
        message: "Correo verificado correctamente.",
      });
    }),
  );

  router.post(
    "/forgot-password",
    asyncHandler(async (req, res) => {
      const { email } = emailBodySchema.parse(req.body ?? {});
      const reset = await createPasswordResetToken(email);
      if (reset) {
        const resetUrl = buildAuthActionUrl(req, "reset", reset.token);
        await sendPasswordResetEmail(reset.user.email, reset.user.name, resetUrl);
      }
      logSecurityEvent("info", "auth.password_reset.requested", req, {
        email: email.trim().toLowerCase(),
        accountFound: Boolean(reset),
      });

      res.json({
        authenticated: false,
        user: null,
        passwordResetEmailSent: true,
        message: "Si la cuenta existe, enviamos un enlace para restablecer la contrasena.",
        previewUrl: buildPreviewUrl(req, "reset", reset?.token),
      });
    }),
  );

  router.post(
    "/reset-password",
    asyncHandler(async (req, res) => {
      const { token, password } = resetPasswordBodySchema.parse(req.body ?? {});
      const user = await resetPasswordWithToken(token, password);
      if (!user) {
        logSecurityEvent("warn", "auth.password_reset.failed", req);
        throw badRequestError("El enlace de recuperacion no es valido o ya expiro.");
      }
      logSecurityEvent("info", "auth.password_reset.succeeded", req, {
        userId: user.id,
        email: user.email,
      });

      res.json({
        authenticated: false,
        user: null,
        message: "La contrasena fue actualizada. Ya puedes iniciar sesion.",
      });
    }),
  );

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      const token = getSessionToken(req);
      const user = await resolveAuthUser(req);
      if (token) {
        await deleteSession(token);
      }
      clearSessionCookie(res);
      logSecurityEvent("info", "auth.logout.succeeded", req, {
        userId: user?.id || null,
        email: user?.email || null,
      });
      res.json({ ok: true });
    }),
  );
  return router;
}
