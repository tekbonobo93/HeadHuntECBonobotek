import React, { useState } from "react";
import { Linkedin, Shield, Sparkles, RefreshCw, AlertCircle, X, Check, User, Code, Briefcase, FileText } from "lucide-react";
import { createJsonApiInit } from "../utils/serverState";

export default function LinkedInSimPopup() {
  const [selectedProfileId, setSelectedProfileId] = useState<string>("silva");
  const [customName, setCustomName] = useState("");
  const [customText, setCustomText] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MOCK_PROFILES = [
    {
      id: "silva",
      name: "Alejandro Silva",
      role: "Senior Fullstack Engineer | React | Node.js | AWS",
      avatarLetter: "A",
      skills: ["React", "TypeScript", "Node.js", "Express.js", "AWS", "SQL", "Docker", "Tailwind CSS"],
      experience: [
        {
          company: "Globant",
          role: "Tech Lead",
          duration: "2 años",
          description: "Liderazgo de equipo de 5 desarrolladores front-end. Optimización de tiempos de carga en un 40% mediante lazy loading, suspense y memoización de componentes críticos."
        },
        {
          company: "Mercado Libre",
          role: "Software Developer",
          duration: "3 años",
          description: "Desarrollo de microservicios robustos en Node.js y bases de datos relacionales SQL. Integración de pasarelas de pago y soporte a millones de solicitudes simultáneas."
        }
      ]
    },
    {
      id: "mendoza",
      name: "Beatriz Mendoza",
      role: "Data Scientist | Python | Machine Learning | SQL | Tableau",
      avatarLetter: "B",
      skills: ["Python", "SQL", "Machine Learning", "Tableau", "Spark", "Pandas", "Scikit-Learn", "Git"],
      experience: [
        {
          company: "Rappi",
          role: "Senior Data Analyst",
          duration: "2 años",
          description: "Creación de modelos predictivos avanzados para tiempos de entrega de mensajería, incrementando la eficiencia de despacho local en un 15%."
        },
        {
          company: "Banco de Crédito",
          role: "Junior BI Analyst",
          duration: "2 años",
          description: "Desarrollo y mantenimiento de tableros de control complejos en Tableau. Automatización de pipelines de extracción, transformación y carga (ETL) con scripts en Python."
        }
      ]
    },
    {
      id: "ortiz",
      name: "Camila Ortiz",
      role: "UX/UI Designer | Figma | Product Design | Design Systems",
      avatarLetter: "C",
      skills: ["Figma", "UX Research", "UI Design", "Design Systems", "Wireframing", "Prototyping", "Adobe XD"],
      experience: [
        {
          company: "Platzi",
          role: "Senior Product Designer",
          duration: "3 años",
          description: "Rediseño completo de la experiencia de pago móvil (checkout), lo que mejoró las tasas de conversión de cursos en un 22%. Creación y escalado de su librería central de componentes."
        },
        {
          company: "Freelance",
          role: "UX Designer",
          duration: "2 años",
          description: "Diseño y validación de prototipos interactivos para múltiples startups tecnológicas en etapas iniciales en América Latina, liderando más de 30 entrevistas con usuarios reales."
        }
      ]
    }
  ];

  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);

    let linkedinData: any = {};

    if (selectedProfileId === "custom") {
      if (!customName.trim()) {
        setError("Por favor, ingresa tu nombre completo.");
        setLoading(false);
        return;
      }
      if (!customText.trim() || customText.length < 20) {
        setError("Por favor, escribe o pega un extracto más detallado de tu perfil o experiencia.");
        setLoading(false);
        return;
      }

      linkedinData = {
        name: customName.trim(),
        rawText: customText.trim()
      };
    } else {
      const selected = MOCK_PROFILES.find(p => p.id === selectedProfileId);
      if (selected) {
        linkedinData = {
          name: selected.name,
          skills: selected.skills,
          experience: selected.experience
        };
      }
    }

    try {
      const response = await fetch("/api/jobs/linkedin-import", {
        ...createJsonApiInit({
          method: "POST",
          body: JSON.stringify({ linkedinData }),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo completar la importación inteligente.");
      }

      const parsedProfile = await response.json();

      // Send the structured data back to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "LINKEDIN_SYNC_SUCCESS",
            data: parsedProfile
          },
          "*"
        );
        
        // Wait a small moment so the user sees completion before close
        setTimeout(() => {
          window.close();
        }, 1200);
      } else {
        // Fallback for non-popup viewing
        alert("¡Éxito! Sincronización simulada completada. Cierra esta pestaña.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar la información del perfil.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Blue LinkedIn header */}
      <header className="bg-[#004182] text-white px-5 py-3.5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white text-[#004182] p-1 rounded font-bold text-lg leading-none select-none">
            in
          </div>
          <span className="font-extrabold text-sm tracking-tight">Portal de Conectividad OAuth</span>
        </div>
        <button 
          onClick={handleCancel}
          className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Content wrapper */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-5 shadow-lg animate-in fade-in zoom-in duration-300">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#0a66c2] border-t-transparent animate-spin"></div>
              <Linkedin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-[#0a66c2] animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Estableciendo Conexión Segura
              </h3>
              <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">
                Gemini 3.5 está analizando tus habilidades, cargos y logros del perfil de LinkedIn para estructurarlos de forma automatizada...
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
            {/* Header / Consent request */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-blue-50 text-[#0a66c2] rounded-full flex items-center justify-center mx-auto mb-1">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Permisos de Sincronización
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                La aplicación <span className="text-[#0a66c2] font-black">TalentoMatch IA</span> solicita acceso para leer la información de tu cuenta.
              </p>
            </div>

            {/* Requested scopes */}
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Alcances del consentimiento:</span>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-600">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>Importar nombre, titular profesional y correo electrónico de contacto.</p>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-600">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>Importar habilidades, certificaciones e historial cronológico de empleo.</p>
              </div>
            </div>

            {/* Selector section */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Selecciona Perfil LinkedIn para Simular
              </span>

              <div className="space-y-2.5">
                {MOCK_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      selectedProfileId === p.id
                        ? "bg-blue-50/60 border-[#0a66c2] shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-full font-bold text-slate-700 flex items-center justify-center text-sm border border-slate-200/50 shrink-0">
                      {p.avatarLetter}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 block truncate">{p.name}</span>
                        {selectedProfileId === p.id && (
                          <span className="w-4 h-4 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-[10px] font-black">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium truncate block">{p.role}</span>
                    </div>
                  </button>
                ))}

                {/* Custom Profile Option */}
                <button
                  onClick={() => setSelectedProfileId("custom")}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                    selectedProfileId === "custom"
                      ? "bg-blue-50/60 border-[#0a66c2] shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-full font-bold text-slate-700 flex items-center justify-center text-sm border border-slate-200/50 shrink-0">
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 block truncate">Perfil Personalizado</span>
                      {selectedProfileId === "custom" && (
                        <span className="w-4 h-4 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-[10px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block">Pega tu propia biografía o currículum</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Inputs */}
            {selectedProfileId === "custom" && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ej. Daniel Ramírez"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#0a66c2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Biografía / Cargos de LinkedIn</label>
                  <textarea
                    required
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={4}
                    placeholder="Pega aquí los detalles de tus trabajos o resumen (ej. 'Desarrollador de software con 4 años de experiencia en Laravel, React...')"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#0a66c2] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Error messaging */}
            {error && (
              <div className="flex gap-2 items-center text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs font-semibold leading-normal">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAuthorize}
                className="flex-1 py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Permitir y Sincronizar
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer disclaimer */}
      <footer className="p-4 bg-slate-100 text-center text-[10px] text-slate-400 font-semibold border-t border-slate-200/50 shrink-0 leading-normal">
        Al hacer clic en "Permitir y Sincronizar", autorizas a TalentoMatch IA a utilizar modelos inteligentes de Gemini de forma segura para estructurar tu perfil profesional.
      </footer>
    </div>
  );
}
