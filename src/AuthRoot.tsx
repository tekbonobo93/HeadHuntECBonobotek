import React, { useEffect, useState } from "react";
import App from "./App";
import AdminApp from "./AdminApp";
import LoginPage, { AuthMode } from "./components/LoginPage";
import { AuthUser } from "./types";
import { isAdminUser } from "./utils/authz";
import { clearPersistedLocalState, initializeClientPersistence } from "./utils/clientPersistence";
import {
  ApiError,
  fetchAuthSession,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmailToken,
} from "./utils/serverState";

type AuthStatus = "checking" | "guest" | "loading-app" | "authenticated";

function readAuthIntent(): { mode: AuthMode; token: string | null } {
  if (typeof window === "undefined") {
    return { mode: "login", token: null };
  }

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const token = params.get("token");

  if (mode === "verify" || mode === "reset") {
    return { mode, token };
  }

  return { mode: "login", token: null };
}

function clearAuthIntentFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

function formatAuthError(error: unknown) {
  if (error instanceof ApiError) {
    if (typeof error.data.lockedUntil === "string" && error.data.lockedUntil) {
      const until = new Date(error.data.lockedUntil).toLocaleString("es-CO");
      return `Acceso bloqueado temporalmente. Intenta de nuevo despues de ${until}.`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No fue posible completar la autenticacion.";
}

export default function AuthRoot() {
  const initialIntent = readAuthIntent();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>(initialIntent.mode);
  const [token, setToken] = useState<string | null>(initialIntent.token);
  const [pendingEmail, setPendingEmail] = useState("");

  const bootAuthenticatedApp = async (authUser: AuthUser) => {
    setStatus("loading-app");
    setError(null);
    await initializeClientPersistence();
    clearAuthIntentFromUrl();
    setToken(null);
    setUser(authUser);
    setStatus("authenticated");
  };

  const resetGuestState = (nextMode?: AuthMode) => {
    setStatus("guest");
    if (nextMode) {
      setMode(nextMode);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.authenticated && session.user) {
          await bootAuthenticatedApp(session.user);
        } else {
          clearPersistedLocalState();
          resetGuestState(initialIntent.mode);
        }
      } catch (err) {
        console.error(err);
        clearPersistedLocalState();
        resetGuestState(initialIntent.mode);
      }
    };

    void bootstrap();
  }, []);

  const runGuestAction = async (action: () => Promise<void>, fallbackMode?: AuthMode) => {
    try {
      setError(null);
      setMessage(null);
      setPreviewUrl(null);
      setStatus("loading-app");
      await action();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.data.requiresEmailVerification) {
          setMode("verify");
          if (typeof err.data.previewUrl === "string") {
            setPreviewUrl(err.data.previewUrl);
          }
        }
      }

      resetGuestState(fallbackMode);
      setError(formatAuthError(err));
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const session = await loginWithPassword(email, password);
    if (!session.authenticated || !session.user) {
      throw new Error("No fue posible iniciar sesion.");
    }
    await bootAuthenticatedApp(session.user);
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const response = await registerWithPassword(name, email, password);
    setPendingEmail(email);
    setMode("verify");
    setPreviewUrl(response.previewUrl || null);
    setMessage(response.message || "Revisa tu correo para verificar tu cuenta.");
    resetGuestState("verify");
  };

  const handleForgotPassword = async (email: string) => {
    const response = await requestPasswordReset(email);
    setPendingEmail(email);
    setPreviewUrl(response.previewUrl || null);
    setMessage(response.message || "Si la cuenta existe, enviamos un enlace de recuperacion.");
    resetGuestState("forgot");
  };

  const handleResetPassword = async (rawToken: string, password: string) => {
    const response = await resetPassword(rawToken, password);
    clearAuthIntentFromUrl();
    setToken(null);
    setPreviewUrl(null);
    setMessage(response.message || "Contrasena actualizada. Ya puedes iniciar sesion.");
    resetGuestState("login");
  };

  const handleVerifyEmail = async (rawToken: string) => {
    const response = await verifyEmailToken(rawToken);
    if (!response.authenticated || !response.user) {
      throw new Error("No fue posible verificar el correo.");
    }
    await bootAuthenticatedApp(response.user);
  };

  const handleResendVerification = async (email: string) => {
    const response = await resendVerificationEmail(email);
    setPendingEmail(email);
    setPreviewUrl(response.previewUrl || null);
    setMessage(response.message || "Si la cuenta existe, enviamos un nuevo enlace de verificacion.");
    resetGuestState("verify");
  };

  const handleLogout = async () => {
    await logoutSession();
    clearPersistedLocalState();
    setUser(null);
    setError(null);
    setMessage(null);
    setPreviewUrl(null);
    setPendingEmail("");
    setMode("login");
    setStatus("guest");
  };

  if (status === "checking" || status === "loading-app" && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-300/20 border-t-indigo-400 rounded-full animate-spin"></div>
          <p className="text-sm font-bold tracking-wide text-slate-300">
            {status === "checking" ? "Validando sesion..." : "Preparando tu espacio de trabajo..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "guest" || status === "loading-app") {
    return (
      <LoginPage
        mode={mode}
        token={token}
        emailDraft={pendingEmail}
        isLoading={status === "loading-app"}
        error={error}
        message={message}
        previewUrl={previewUrl}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          setError(null);
          setMessage(null);
          if (nextMode !== "verify" && nextMode !== "forgot") {
            setPreviewUrl(null);
          }
        }}
        onLogin={(email, password) => runGuestAction(() => handleLogin(email, password), "login")}
        onRegister={(name, email, password) => runGuestAction(() => handleRegister(name, email, password), "verify")}
        onForgotPassword={(email) => runGuestAction(() => handleForgotPassword(email), "forgot")}
        onResetPassword={(rawToken, password) => runGuestAction(() => handleResetPassword(rawToken, password), "login")}
        onVerifyEmail={(rawToken) => runGuestAction(() => handleVerifyEmail(rawToken), "verify")}
        onResendVerification={(email) => runGuestAction(() => handleResendVerification(email), "verify")}
      />
    );
  }

  if (!user) {
    return null;
  }

  if (isAdminUser(user)) {
    return <AdminApp authUser={user} onLogout={handleLogout} />;
  }

  return <App authUser={user} onLogout={handleLogout} />;
}
