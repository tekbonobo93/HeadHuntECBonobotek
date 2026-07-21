import React, { useState, useEffect } from "react";
import { Mail, Bell, Settings, Eye, CheckCircle2, AlertCircle, Calendar, RefreshCw, Send, Check, ShieldCheck, ArrowRight, Sparkles, Inbox, Trash2, X } from "lucide-react";
import { UserProfile, JobOffer } from "../types";
import {
  EmailAlertConfig,
  SimulatedEmail,
  loadEmailAlertConfig,
  saveEmailAlertConfig,
  loadSimulatedEmails,
  saveSimulatedEmails,
  generateWeeklyDigestEmail
} from "../utils/emailAlertSystem";

interface EmailAlertsWidgetProps {
  profile: UserProfile;
  onUpdateProfileEmail: (newEmail: string) => void;
  isDarkMode?: boolean;
}

// We'll import a set of mock or current jobs from a local cache or generate some if empty.
// In the parent component, we'll fetch them, but here we can look them up from localStorage or use a hardcoded set.
export default function EmailAlertsWidget({ profile, onUpdateProfileEmail, isDarkMode }: EmailAlertsWidgetProps) {
  const [config, setConfig] = useState<EmailAlertConfig>(() => loadEmailAlertConfig(profile.email));
  const [emails, setEmails] = useState<SimulatedEmail[]>(() => loadSimulatedEmails());
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [emailInput, setEmailInput] = useState(profile.email || "");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state if profile email changes externally
  useEffect(() => {
    if (profile.email && !emailInput) {
      setEmailInput(profile.email);
      setConfig(prev => ({ ...prev, email: profile.email }));
    }
  }, [profile.email]);

  const handleSaveConfig = (updatedConfig: EmailAlertConfig) => {
    setConfig(updatedConfig);
    saveEmailAlertConfig(updatedConfig);
    
    // Also sync email back to general user profile
    if (updatedConfig.email !== profile.email && updatedConfig.email.trim() !== "") {
      onUpdateProfileEmail(updatedConfig.email);
    }

    setSuccessMsg("¡Preferencias de alertas guardadas con éxito!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleToggleSubscription = () => {
    if (!emailInput.trim()) {
      setErrorMsg("Por favor, introduce un correo electrónico válido primero.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setErrorMsg("El formato del correo electrónico no es válido.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const newSubState = !config.isSubscribed;
    const updated = {
      ...config,
      email: emailInput.trim(),
      isSubscribed: newSubState
    };
    
    handleSaveConfig(updated);
  };

  const handleSimulateWeeklyDigest = () => {
    if (!config.isSubscribed) {
      setErrorMsg("Debes suscribirte a las alertas de correo para simular el envío.");
      setTimeout(() => setErrorMsg(null), 4500);
      return;
    }

    setIsSimulating(true);

    // Retrieve active job offers from the local storage or default jobs
    let currentJobs: JobOffer[] = [];
    try {
      const storedJobs = localStorage.getItem("talentomatch_cached_jobs");
      if (storedJobs) {
        currentJobs = JSON.parse(storedJobs);
      }
    } catch (e) {
      console.error("Failed to load cached jobs for email simulation", e);
    }

    // Fallback if no jobs exist in storage
    if (currentJobs.length === 0) {
      currentJobs = [
        {
          id: "job_sim_1",
          title: "Senior Full Stack Developer (React / Node)",
          company: "Innovación Tecnológica Global",
          location: "Remoto (Latinoamérica)",
          locationType: "remoto",
          jobType: "completa",
          salary: "$4,500 - $6,000 USD",
          description: "Desarrollo de microservicios y frontend responsivo",
          requirements: ["React", "TypeScript", "Node.js", "Docker"],
          sourcePlatform: "TalentoMatch Search Engine",
          compatibilityScore: 92,
          compatibilityAnalysis: "Tu perfil tiene un 92% de match gracias a tus 4 años de experiencia sólida usando React y Node.js.",
          seniorityLevel: "senior",
          postedDate: "Ayer"
        },
        {
          id: "job_sim_2",
          title: "Frontend Developer Junior",
          company: "Agencia Interactiva Pixel",
          location: "Bogotá, Colombia",
          locationType: "hibrido",
          jobType: "completa",
          salary: "$1,800 - $2,200 USD",
          description: "Maquetación y creación de landing pages de alta conversión",
          requirements: ["React", "HTML5", "Tailwind CSS", "JavaScript"],
          sourcePlatform: "LinkedIn Scraper",
          compatibilityScore: 84,
          compatibilityAnalysis: "Tu portfolio cuenta con amplia experiencia con Tailwind CSS y maquetación responsiva, calzando al 100%.",
          seniorityLevel: "junior",
          postedDate: "Hace 2 días"
        },
        {
          id: "job_sim_3",
          title: "QA Engineer Automation",
          company: "Sistemas Financieros Seguros",
          location: "Madrid, España",
          locationType: "presencial",
          jobType: "completa",
          salary: "€3,200 - €4,000 EUR",
          description: "Automatización de pruebas funcionales y de seguridad",
          requirements: ["Selenium", "Jest", "TypeScript", "CI/CD"],
          sourcePlatform: "Indeed",
          compatibilityScore: 78,
          compatibilityAnalysis: "Posees conocimientos de testing Jest, pero requiere Selenium adicional que podrías capacitarte rápido.",
          seniorityLevel: "semi-senior",
          postedDate: "Hace 3 días"
        }
      ];
    }

    // Simulate sending time (1.2 seconds)
    setTimeout(() => {
      const simulatedEmail = generateWeeklyDigestEmail(profile, currentJobs, config);
      const updatedEmails = [simulatedEmail, ...emails];
      setEmails(updatedEmails);
      saveSimulatedEmails(updatedEmails);
      
      setIsSimulating(false);
      setSelectedEmail(simulatedEmail);
      setShowInbox(true);
      
      setSuccessMsg("📬 ¡Simulación enviada! Revisa la bandeja de entrada.");
      setTimeout(() => setSuccessMsg(null), 3500);
    }, 1200);
  };

  const handleDeleteEmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = emails.filter(em => em.id !== id);
    setEmails(updated);
    saveSimulatedEmails(updated);
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
  };

  const handleClearInbox = () => {
    setEmails([]);
    saveSimulatedEmails([]);
    setSelectedEmail(null);
  };

  return (
    <div id="email-alerts-widget-container" className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
        <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Mail className="w-4 h-4 text-indigo-500" />
          Alertas de Empleo por Correo Electrónico
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          config.isSubscribed 
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
            : "bg-neutral-100 text-neutral-500 border border-neutral-200"
        }`}>
          {config.isSubscribed ? "Suscrito" : "Inactivo"}
        </span>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed font-medium">
        Recibe semanalmente en tu bandeja de entrada un resumen optimizado por IA con los nuevos empleos del mercado que tienen mayor compatibilidad con tu perfil y preferencias de postulación.
      </p>

      {/* Inputs and subscription controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setConfig(prev => ({ ...prev, email: e.target.value }));
              }}
              placeholder="correo@ejemplo.com"
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 font-medium text-neutral-800"
            />
          </div>
          <button
            onClick={handleToggleSubscription}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 ${
              config.isSubscribed
                ? "bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            }`}
          >
            {config.isSubscribed ? "Cancelar Suscripción" : "Suscribirse con un Clic"}
          </button>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Configurations parameters (Only shown if subscribed) */}
        {config.isSubscribed && (
          <div className="p-4 bg-neutral-50/80 border border-neutral-200/50 rounded-xl space-y-4 animate-in fade-in duration-200">
            <div className="text-[11px] font-bold text-neutral-700 flex items-center gap-1 uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              Parámetros de Envío
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequency selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Frecuencia de Alertas
                </label>
                <select
                  value={config.frequency}
                  onChange={(e) => handleSaveConfig({ ...config, frequency: e.target.value as any })}
                  className="w-full text-xs bg-white border border-neutral-200 rounded-lg p-2 font-semibold text-neutral-800 focus:outline-none"
                >
                  <option value="lunes">🗓️ Todos los lunes (Recomendado)</option>
                  <option value="viernes">🗓️ Fin de semana (Cada viernes)</option>
                  <option value="quincenal">🗓️ Quincenal (Cada 15 días)</option>
                </select>
              </div>

              {/* Threshold matching filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center justify-between">
                  <span>🎯 Match de Compatibilidad Mínimo</span>
                  <span className="font-mono text-indigo-600 font-bold">{config.minCompatibilityScore}%</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={config.minCompatibilityScore}
                    onChange={(e) => setConfig({ ...config, minCompatibilityScore: parseInt(e.target.value) })}
                    onMouseUp={() => handleSaveConfig(config)}
                    onTouchEnd={() => handleSaveConfig(config)}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Content options checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={config.includeMarketAnalysis}
                  onChange={(e) => handleSaveConfig({ ...config, includeMarketAnalysis: e.target.checked })}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 cursor-pointer"
                />
                Incluir análisis de tendencias del mercado
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={config.includeInterviewTips}
                  onChange={(e) => handleSaveConfig({ ...config, includeInterviewTips: e.target.checked })}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 cursor-pointer"
                />
                Incluir tips personalizados de entrevistas IA
              </label>
            </div>

            {/* Simulation and Inbox Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200/50">
              <button
                onClick={handleSimulateWeeklyDigest}
                disabled={isSimulating}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200/40"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Simulando Envío...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Simular Envío de Alerta IA
                  </>
                )}
              </button>

              <button
                onClick={() => setShowInbox(!showInbox)}
                className="px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-neutral-200"
              >
                <Inbox className="w-3.5 h-3.5 text-neutral-400" />
                <span>Bandeja de Entrada ({emails.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simulated Webmail Inbox Section */}
      {config.isSubscribed && showInbox && (
        <div className="border border-neutral-200 rounded-xl overflow-hidden mt-4 bg-neutral-50">
          <div className="bg-neutral-100/80 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between text-xs font-bold text-neutral-700">
            <span className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-indigo-500" />
              Bandeja de Entrada Simulada (alertas@talentomatch.ai)
            </span>
            {emails.length > 0 && (
              <button
                onClick={handleClearInbox}
                className="text-[10px] text-neutral-500 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer border-none bg-transparent"
              >
                <Trash2 className="w-3 h-3" /> Limpiar Bandeja
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 min-h-[300px]">
            {/* Left sidebar: Email list */}
            <div className="md:col-span-1 border-r border-neutral-200 overflow-y-auto max-h-[350px] bg-white divide-y divide-neutral-100">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-400 italic">
                  No hay correos simulados. Haz clic en "Simular Envío" arriba para probar.
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 text-left cursor-pointer transition-colors relative hover:bg-neutral-50/70 ${
                      selectedEmail?.id === email.id ? "bg-indigo-50/40 border-l-2 border-indigo-600" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-1">
                      <span className="text-[10px] font-extrabold text-indigo-600 truncate">{email.sender}</span>
                      <span className="text-[9px] text-neutral-400 font-mono shrink-0">{email.sentDate.split(" ")[0]}</span>
                    </div>
                    <h4 className="text-[11px] font-bold text-neutral-800 line-clamp-2 leading-snug mb-1">
                      {email.subject}
                    </h4>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {email.jobTitles.join(", ")}
                    </p>
                    <button
                      onClick={(e) => handleDeleteEmail(email.id, e)}
                      className="absolute right-2 bottom-2 p-1 text-neutral-400 hover:text-red-500 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Eliminar correo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Right panel: Email content body reader */}
            <div className="md:col-span-2 p-4 bg-white overflow-y-auto max-h-[350px] flex flex-col justify-between">
              {selectedEmail ? (
                <div className="space-y-4">
                  {/* Email header details */}
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 text-xs text-neutral-600 space-y-1">
                    <div><strong>De:</strong> {selectedEmail.sender}</div>
                    <div><strong>Para:</strong> {config.email}</div>
                    <div><strong>Asunto:</strong> <span className="text-neutral-900 font-bold">{selectedEmail.subject}</span></div>
                    <div className="text-[10px] text-neutral-400"><strong>Enviado:</strong> {selectedEmail.sentDate}</div>
                  </div>

                  {/* Render simulated html email */}
                  <div 
                    className="border border-neutral-100 rounded-xl p-2 max-w-full overflow-x-auto shadow-inner bg-[#f8fafc]"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400 space-y-3">
                  <Mail className="w-10 h-10 text-neutral-300 stroke-[1.5]" />
                  <div>
                    <h5 className="text-xs font-bold text-neutral-600">Visualizador de Correo IA</h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Selecciona un correo semanal de la izquierda para desplegar el boletín completo con el formato HTML real de entrega.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
