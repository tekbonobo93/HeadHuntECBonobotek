import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";

interface LoginPageProps {
  mode: AuthMode;
  token: string | null;
  emailDraft: string;
  isLoading: boolean;
  error: string | null;
  message: string | null;
  previewUrl: string | null;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (token: string, password: string) => Promise<void>;
  onVerifyEmail: (token: string) => Promise<void>;
  onResendVerification: (email: string) => Promise<void>;
}

function getHeadline(mode: AuthMode) {
  if (mode === "register") return { eyebrow: "Crear cuenta", title: "Abre tu espacio de trabajo" };
  if (mode === "forgot") return { eyebrow: "Recuperar acceso", title: "Restablece tu acceso" };
  if (mode === "reset") return { eyebrow: "Nueva contrasena", title: "Define una clave nueva" };
  if (mode === "verify") return { eyebrow: "Verificar correo", title: "Activa tu cuenta" };
  return { eyebrow: "Iniciar sesion", title: "Bienvenido de vuelta" };
}

export default function LoginPage({
  mode,
  token,
  emailDraft,
  isLoading,
  error,
  message,
  previewUrl,
  onModeChange,
  onLogin,
  onRegister,
  onForgotPassword,
  onResetPassword,
  onVerifyEmail,
  onResendVerification,
}: LoginPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailDraft);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setEmail(emailDraft);
  }, [emailDraft]);

  useEffect(() => {
    if (mode !== "reset") {
      setConfirmPassword("");
    }
  }, [mode]);

  const headline = getHeadline(mode);
  const isLoginLike = mode === "login" || mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      await onLogin(email, password);
      return;
    }

    if (mode === "register") {
      await onRegister(name, email, password);
      return;
    }

    if (mode === "forgot") {
      await onForgotPassword(email);
      return;
    }

    if (mode === "verify") {
      if (token) {
        await onVerifyEmail(token);
      } else {
        await onResendVerification(email);
      }
      return;
    }

    if (password !== confirmPassword) {
      throw new Error("Las contrasenas no coinciden.");
    }

    if (!token) {
      throw new Error("No hay token de recuperacion disponible.");
    }

    await onResetPassword(token, password);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_28%)]"></div>
      <div className="relative min-h-screen grid lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden lg:flex flex-col justify-between p-10 border-r border-white/10 bg-white/[0.03] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-900/30">
              TM
            </div>
            <div>
              <p className="text-sm font-black tracking-wide">TalentoMatch IA</p>
              <p className="text-xs text-slate-300">Busqueda laboral inteligente y centralizada</p>
            </div>
          </div>

          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              Acceso Seguro
            </div>
            <h1 className="text-4xl font-black leading-tight text-white">
              Protege tu progreso laboral con acceso persistente y verificable.
            </h1>
            <p className="text-sm leading-7 text-slate-300 max-w-lg">
              Cada cuenta conserva perfil, candidaturas, alertas y configuraciones con sesion privada, recuperacion de acceso y verificacion de correo.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Sesion privada por usuario</p>
                  <p className="text-xs text-slate-400">Persistencia real en PostgreSQL y cookies seguras.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-500/15 p-2 text-indigo-300">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Recuperacion y verificacion</p>
                  <p className="text-xs text-slate-400">Flujos listos para correo verificado y restablecimiento de contrasena.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900/80 p-6 md:p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">{headline.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{headline.title}</h2>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-indigo-300 border border-white/10">
                {mode === "register" ? <User className="w-5 h-5" /> : mode === "verify" ? <RefreshCw className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
              </div>
            </div>

            <div className="mb-4 flex rounded-2xl bg-slate-950/70 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => onModeChange("login")}
                className={`flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  mode === "login" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => onModeChange("register")}
                className={`flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                  mode === "register" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Registrarme
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
              <button type="button" onClick={() => onModeChange("forgot")} className="rounded-full border border-white/10 px-3 py-1 hover:text-white">
                Recuperar contrasena
              </button>
              <button type="button" onClick={() => onModeChange("verify")} className="rounded-full border border-white/10 px-3 py-1 hover:text-white">
                Verificar correo
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nombre</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                    <User className="w-4 h-4 text-slate-500" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre profesional"
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                </label>
              )}

              {(mode === "login" || mode === "register" || mode === "forgot" || (mode === "verify" && !token)) && (
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Correo</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                </label>
              )}

              {(mode === "login" || mode === "register" || mode === "reset") && (
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {mode === "reset" ? "Nueva contrasena" : "Contrasena"}
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 8 caracteres"
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                </label>
              )}

              {mode === "reset" && (
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirmar contrasena</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contrasena"
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                </label>
              )}

              {mode === "verify" && token && (
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                  El enlace de verificacion ya fue detectado. Pulsa el boton para activar la cuenta.
                </div>
              )}

              {mode === "reset" && !token && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Falta el token de recuperacion. Solicita un nuevo enlace para continuar.
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {error}
                </div>
              )}

              {previewUrl && (
                <a
                  href={previewUrl}
                  className="block rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 hover:bg-sky-500/15"
                >
                  Abrir enlace de prueba
                </a>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-black text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
              >
                {isLoading
                  ? "Procesando..."
                  : mode === "login"
                    ? "Entrar al panel"
                    : mode === "register"
                      ? "Crear cuenta"
                      : mode === "forgot"
                        ? "Enviar enlace"
                        : mode === "verify"
                          ? token
                            ? "Verificar ahora"
                            : "Reenviar verificacion"
                          : "Actualizar contrasena"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-6 text-slate-400">
              {isLoginLike
                ? "Tu progreso, candidaturas y perfil se recuperan automaticamente despues de iniciar sesion."
                : mode === "verify"
                  ? "La verificacion de correo activa el acceso y reduce abuso en el sistema."
                  : "Los enlaces de recuperacion y verificacion se invalidan automaticamente al usarse o expirar."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
