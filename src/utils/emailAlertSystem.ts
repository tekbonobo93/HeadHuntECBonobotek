/**
 * Email Alert Subscription & Simulated Weekly Digest System
 */
import { UserProfile, JobOffer } from "../types";

export interface EmailAlertConfig {
  email: string;
  isSubscribed: boolean;
  frequency: "lunes" | "viernes" | "quincenal";
  minCompatibilityScore: number;
  includeMarketAnalysis: boolean;
  includeInterviewTips: boolean;
}

export interface SimulatedEmail {
  id: string;
  subject: string;
  sentDate: string;
  sender: string;
  bodyHtml: string;
  jobsCount: number;
  jobTitles: string[];
}

const DEFAULT_CONFIG = (profileEmail?: string): EmailAlertConfig => ({
  email: profileEmail || "",
  isSubscribed: false,
  frequency: "lunes",
  minCompatibilityScore: 75,
  includeMarketAnalysis: true,
  includeInterviewTips: true,
});

export const loadEmailAlertConfig = (profileEmail?: string): EmailAlertConfig => {
  try {
    const saved = localStorage.getItem("talentomatch_email_alert_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        email: parsed.email || profileEmail || "",
        isSubscribed: typeof parsed.isSubscribed === "boolean" ? parsed.isSubscribed : false,
        frequency: parsed.frequency || "lunes",
        minCompatibilityScore: typeof parsed.minCompatibilityScore === "number" ? parsed.minCompatibilityScore : 75,
        includeMarketAnalysis: typeof parsed.includeMarketAnalysis === "boolean" ? parsed.includeMarketAnalysis : true,
        includeInterviewTips: typeof parsed.includeInterviewTips === "boolean" ? parsed.includeInterviewTips : true,
      };
    }
  } catch (e) {
    console.error("Failed to load email alert config", e);
  }
  return DEFAULT_CONFIG(profileEmail);
};

export const saveEmailAlertConfig = (config: EmailAlertConfig): void => {
  try {
    localStorage.setItem("talentomatch_email_alert_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save email alert config", e);
  }
};

export const loadSimulatedEmails = (): SimulatedEmail[] => {
  try {
    const saved = localStorage.getItem("talentomatch_simulated_emails");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load simulated emails", e);
  }
  return [];
};

export const saveSimulatedEmails = (emails: SimulatedEmail[]): void => {
  try {
    localStorage.setItem("talentomatch_simulated_emails", JSON.stringify(emails));
  } catch (e) {
    console.error("Failed to save simulated emails", e);
  }
};

/**
 * Dynamically synthesizes a beautifully structured, personalized weekly digest email
 */
export const generateWeeklyDigestEmail = (
  profile: UserProfile,
  allJobs: JobOffer[],
  config: EmailAlertConfig
): SimulatedEmail => {
  // Filter jobs by compatibility and user preferences
  const filteredJobs = allJobs
    .filter((job) => {
      const score = job.compatibilityScore || 50;
      if (score < config.minCompatibilityScore) return false;

      // Filter by seniority if set
      if (profile.preferences.seniorityLevel !== "cualquiera") {
        if (job.seniorityLevel !== profile.preferences.seniorityLevel) return false;
      }
      // Filter by location type
      if (profile.preferences.locationType !== "cualquiera") {
        if (job.locationType !== profile.preferences.locationType) return false;
      }
      return true;
    })
    // Sort by highest compatibility
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    // Take top 3
    .slice(0, 3);

  // Fallback to top 3 global jobs if filters are too tight
  const jobsToDisplay = filteredJobs.length > 0 
    ? filteredJobs 
    : [...allJobs].sort((a, b) => b.compatibilityScore - a.compatibilityScore).slice(0, 3);

  const formatCurrency = (currency: string) => {
    return currency || "USD";
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `🎯 Resumen Semanal de Empleo: ${jobsToDisplay.length} vacantes de alto impacto para ti`;

  // HTML template for the simulation
  const bodyHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
      <!-- Header -->
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 2px dashed #e2e8f0;">
        <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 8px 16px; border-radius: 9999px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          TalentoMatch IA
        </div>
        <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.02em;">Tu Alerta de Empleo Semanal</h1>
        <p style="font-size: 12px; color: #64748b; margin: 0; font-weight: 500;">Generado inteligentemente el ${formattedDate}</p>
      </div>

      <!-- Welcome Message -->
      <div style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #334155;">
          Hola, <strong>${profile.name || "Candidato Profesional"}</strong>:
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 8px 0 0 0;">
          Hemos escaneado el mercado laboral de acuerdo con tu currículum y tus preferencias de búsqueda (<strong>${profile.preferences.locationType}</strong>, rango salarial deseado de <strong>${profile.preferences.desiredSalaryRange.min}-${profile.preferences.desiredSalaryRange.max} ${profile.preferences.desiredSalaryRange.currency}</strong>). Aquí tienes las mejores oportunidades de contratación detectadas:
        </p>
      </div>

      <!-- Jobs Section -->
      <div style="padding: 20px 0;">
        <h3 style="font-size: 12px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">🎯 Vacantes Sugeridas con Alto Match</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${jobsToDisplay
            .map(
              (job) => `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                  <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${job.title}</h4>
                  <span style="font-size: 12px; font-weight: 600; color: #4f46e5;">${job.company}</span>
                </div>
                <div style="background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0;">
                  ${job.compatibilityScore}% Match
                </div>
              </div>
              
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                <span style="background-color: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: capitalize;">📍 ${job.locationType}</span>
                <span style="background-color: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">💼 ${job.jobType}</span>
                <span style="background-color: #fef3c7; color: #d97706; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">💰 ${job.salary}</span>
              </div>

              <div style="background-color: #f8fafc; border-left: 3px solid #6366f1; padding: 8px 12px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
                <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; display: block; margin-bottom: 2px;">Análisis de Compatibilidad IA</span>
                <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 0;">${job.compatibilityAnalysis}</p>
              </div>

              <div style="text-align: right;">
                <a href="${job.applyUrl || "#"}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 6px; transition: background-color 0.2s;">
                  Ver Oferta Completa
                </a>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Extra sections based on config -->
      ${
        config.includeMarketAnalysis
          ? `
      <div style="padding: 16px; background-color: #e0e7ff; border-radius: 12px; margin-bottom: 16px; border: 1px solid #c7d2fe;">
        <h4 style="font-size: 12px; font-weight: 800; color: #3730a3; text-transform: uppercase; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          📈 Insights de Mercado Recientes
        </h4>
        <p style="font-size: 11px; line-height: 1.6; color: #1e1b4b; margin: 0;">
          Las vacantes que coinciden con tu especialidad de <strong>${profile.skills.slice(0, 3).join(", ") || "tecnología"}</strong> han incrementado un 14.5% en contratación remota global este mes. Los salarios base para desarrolladores de tu nivel de seniority (<strong>${profile.preferences.seniorityLevel}</strong>) oscilan entre un 8% por encima de tu expectativa mínima configurada.
        </p>
      </div>
      `
          : ""
      }

      ${
        config.includeInterviewTips
          ? `
      <div style="padding: 16px; background-color: #f0fdf4; border-radius: 12px; margin-bottom: 16px; border: 1px solid #bbf7d0;">
        <h4 style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin: 0 0 6px 0;">
          💡 Tip del Reclutador IA
        </h4>
        <p style="font-size: 11px; line-height: 1.6; color: #14532d; margin: 0;">
          Dado que tienes experiencia demostrada en tu perfil, cuando apliques a empresas internacionales resalta de forma proactiva tus metodologías de comunicación asíncrona. Los reclutadores para estos perfiles valoran la autonomía por encima de los años de servicio.
        </p>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">Recibes esto porque te suscribiste a las alertas semanales de TalentoMatch IA.</p>
        <p style="margin: 0;">
          <a href="#unsubscribe" style="color: #4f46e5; text-decoration: underline; font-weight: 600;">Modificar Preferencias</a> • 
          <a href="#unsubscribe" style="color: #64748b; text-decoration: underline;">Dar de baja alertas</a>
        </p>
      </div>
    </div>
  `;

  return {
    id: `email_${Date.now()}`,
    subject,
    sentDate: today.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    sender: "alertas@talentomatch.ai",
    bodyHtml,
    jobsCount: jobsToDisplay.length,
    jobTitles: jobsToDisplay.map((j) => j.title),
  };
};
