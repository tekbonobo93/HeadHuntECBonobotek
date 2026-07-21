import React, { useState } from "react";
import { User, Mail, Phone, Code, Briefcase, Plus, X, Save, Edit3, Trash, Settings, Sun, Moon, Linkedin, RefreshCw, Download, GraduationCap, Tag, Sparkles, Check, Layers, HelpCircle } from "lucide-react";
import { UserProfile, ExperienceItem } from "../types";
import { exportUserProfileToPDF } from "../utils/pdfGenerator";
import EmailAlertsWidget from "./EmailAlertsWidget";

const SKILL_CATEGORIES = [
  { id: "Frontend", label: "Frontend" },
  { id: "Backend", label: "Backend" },
  { id: "Data Science", label: "Data Science" },
  { id: "Idiomas", label: "Idiomas" },
  { id: "Diseño / UX", label: "Diseño / UX" },
  { id: "DevOps / Cloud", label: "DevOps / Cloud" },
  { id: "Metodologías / Gestión", label: "Metodologías / Gestión" },
  { id: "Otras", label: "Otras / General" }
];

function getCategoryColor(categoryId: string) {
  switch (categoryId) {
    case "Frontend":
      return {
        bg: "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900/30",
        dot: "#0284c7" // sky-600
      };
    case "Backend":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30",
        dot: "#9333ea" // purple-600
      };
    case "Data Science":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30",
        dot: "#059669" // emerald-600
      };
    case "Idiomas":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30",
        dot: "#d97706" // amber-600
      };
    case "Diseño / UX":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30",
        dot: "#e11d48" // rose-600
      };
    case "DevOps / Cloud":
      return {
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30",
        dot: "#4f46e5" // indigo-600
      };
    case "Metodologías / Gestión":
      return {
        bg: "bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-900/30",
        dot: "#0d9488" // teal-600
      };
    default:
      return {
        bg: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
        dot: "#64748b" // slate-500
      };
  }
}

function detectCategory(skillName: string): string {
  const name = skillName.toLowerCase().trim();
  
  const frontendKeywords = ["react", "vue", "angular", "svelte", "nextjs", "next.js", "css", "html", "tailwind", "typescript", "javascript", "js", "ts", "frontend", "front-end", "sass", "webpack", "vite", "jquery", "dom", "bootstrap", "web", "material-ui", "mui", "responsive"];
  if (frontendKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Frontend";
  }
  
  const backendKeywords = ["node", "express", "nestjs", "nest.js", "python", "django", "flask", "fastapi", "java", "spring", "spring boot", "php", "laravel", "go", "golang", "ruby", "rails", "c#", ".net", "asp.net", "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "graphql", "backend", "back-end", "rest api", "api", "microservicios", "microservices", "prisma", "sequelize", "mongoose"];
  if (backendKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Backend";
  }
  
  const dataScienceKeywords = ["numpy", "pandas", "scikit-learn", "sklearn", "tensorflow", "keras", "pytorch", "machine learning", "ai", "deep learning", "data science", "spark", "hadoop", "tableau", "power bi", "data analysis", "ciencia de datos", "analítica", "analytics", "r", "python for data", "nlp", "computer vision", "statistics", "data mining"];
  if (dataScienceKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Data Science";
  }
  
  const idiomasKeywords = ["inglés", "ingles", "english", "español", "spanish", "francés", "frances", "french", "alemán", "aleman", "german", "portugués", "portugues", "portuguese", "italiano", "italian", "idiomas", "languages", "toefl", "ielts", "b2", "c1", "native", "nativo", "bilingual", "bilingüe"];
  if (idiomasKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Idiomas";
  }
  
  const designKeywords = ["figma", "sketch", "adobe", "xd", "illustrator", "photoshop", "ui", "ux", "ui/ux", "diseño", "design", "wireframes", "prototyping", "figma", "canva", "zeplin", "invision"];
  if (designKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Diseño / UX";
  }
  
  const devopsKeywords = ["aws", "azure", "gcp", "docker", "kubernetes", "k8s", "devops", "ci/cd", "gitlab", "github actions", "terrafrom", "terraform", "ansible", "jenkins", "linux", "nginx", "bash", "shell", "monitoring", "prometheus", "grafana", "cloud"];
  if (devopsKeywords.some(kw => name === kw || name.includes(kw))) {
    return "DevOps / Cloud";
  }
  
  const managementKeywords = ["scrum", "agile", "kanban", "jira", "product owner", "product manager", "project manager", "pmp", "gestión", "management", "comunicación", "liderazgo", "leadership", "coaching", "team player", "jira", "confluence"];
  if (managementKeywords.some(kw => name === kw || name.includes(kw))) {
    return "Metodologías / Gestión";
  }
  
  return "Otras";
}

interface UserProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function UserProfileView({ profile, onUpdateProfile, isDarkMode, onToggleTheme }: UserProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [newSkill, setNewSkill] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("auto");
  const [skillsViewMode, setSkillsViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [activeDropdownSkill, setActiveDropdownSkill] = useState<string | null>(null);

  const [expCompany, setExpCompany] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expDuration, setExpDuration] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduDuration, setEduDuration] = useState("");

  const handleSyncLinkedIn = () => {
    const width = 580;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      "/auth/linkedin-sim",
      "linkedin_oauth_popup",
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      alert("Por favor, permite las ventanas emergentes (popups) para completar la sincronización con LinkedIn.");
    }
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name,
      email,
      phone
    });
    setIsEditing(false);
  };

  const handleAssignCategory = (skill: string, category: string) => {
    onUpdateProfile({
      ...profile,
      skillCategories: {
        ...(profile.skillCategories || {}),
        [skill]: category
      }
    });
  };

  const handleAutoClassifyAll = () => {
    const updatedCategories = { ...(profile.skillCategories || {}) };
    profile.skills.forEach(skill => {
      updatedCategories[skill] = detectCategory(skill);
    });
    onUpdateProfile({
      ...profile,
      skillCategories: updatedCategories
    });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const skillTrimmed = newSkill.trim();
    if (!skillTrimmed) return;
    if (profile.skills.includes(skillTrimmed)) {
      setNewSkill("");
      return;
    }

    const determinedCategory = selectedCategory === "auto" ? detectCategory(skillTrimmed) : selectedCategory;

    onUpdateProfile({
      ...profile,
      skills: [...profile.skills, skillTrimmed],
      skillCategories: {
        ...(profile.skillCategories || {}),
        [skillTrimmed]: determinedCategory
      }
    });
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedCategories = { ...(profile.skillCategories || {}) };
    delete updatedCategories[skillToRemove];

    onUpdateProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove),
      skillCategories: updatedCategories
    });
  };

  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany || !expRole || !expDuration) return;

    const newItem: ExperienceItem = {
      company: expCompany,
      role: expRole,
      duration: expDuration,
      description: expDesc
    };

    onUpdateProfile({
      ...profile,
      experience: [newItem, ...profile.experience]
    });

    // Reset Form
    setExpCompany("");
    setExpRole("");
    setExpDuration("");
    setExpDesc("");
  };

  const handleRemoveExperience = (indexToRemove: number) => {
    onUpdateProfile({
      ...profile,
      experience: profile.experience.filter((_, idx) => idx !== indexToRemove)
    });
  };

  const handleAddEducation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution.trim() || !eduDegree.trim()) return;

    const newItem = {
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      duration: eduDuration.trim()
    };

    onUpdateProfile({
      ...profile,
      education: [newItem, ...(profile.education || [])]
    });

    setEduInstitution("");
    setEduDegree("");
    setEduDuration("");
  };

  const handleRemoveEducation = (indexToRemove: number) => {
    onUpdateProfile({
      ...profile,
      education: (profile.education || []).filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Group skills by category
  const skillsByCategory: Record<string, string[]> = {};
  SKILL_CATEGORIES.forEach(cat => {
    skillsByCategory[cat.id] = [];
  });
  const uncategorizedSkills: string[] = [];

  profile.skills.forEach(skill => {
    const catId = profile.skillCategories?.[skill];
    if (catId && skillsByCategory[catId]) {
      skillsByCategory[catId].push(skill);
    } else {
      uncategorizedSkills.push(skill);
    }
  });

  const renderSkillBadge = (skill: string) => {
    const catId = profile.skillCategories?.[skill] || "Otras";
    const catColor = getCategoryColor(catId);
    return (
      <div key={skill} className="relative inline-block">
        <span
          onClick={() => setActiveDropdownSkill(activeDropdownSkill === skill ? null : skill)}
          className={`inline-flex items-center gap-1.5 ${catColor.bg} text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer select-none`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: catColor.dot }} />
          {skill}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSkill(skill);
            }}
            className="text-neutral-400 hover:text-red-500 transition-colors ml-0.5 shrink-0"
            title="Eliminar"
          >
            <X className="w-3 h-3" />
          </button>
        </span>

        {activeDropdownSkill === skill && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownSkill(null);
              }} 
            />
            <div className="absolute left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-1.5 min-w-[190px] space-y-1">
              <p className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase px-2 py-1 tracking-wider">
                Clasificar como:
              </p>
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignCategory(skill, cat.id);
                    setActiveDropdownSkill(null);
                  }}
                  className="w-full text-left text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat.id).dot }} />
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div id="user-profile-view-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Col 1: Contact Details & Skills */}
      <div className="lg:col-span-1 space-y-6">
        {/* Contact Info Card */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-4 h-4 text-indigo-500" />
              Datos de Candidato
            </h3>
            {!isEditing && (
              <button
                onClick={() => {
                  setName(profile.name);
                  setEmail(profile.email);
                  setPhone(profile.phone);
                  setIsEditing(true);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveContactInfo} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Email de Contacto</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-md text-xs font-semibold text-neutral-500 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold"
                >
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 font-sans">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Candidato</span>
                <span className="text-sm font-semibold text-neutral-800">{profile.name || "Sin Nombre Registrado"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>{profile.email || "Sin Email"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>{profile.phone || "Sin Teléfono"}</span>
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-100">
                Archivo de CV: <strong className="text-neutral-500">{profile.cvFileName || "Ninguno cargado"}</strong>
              </div>
              <button
                type="button"
                onClick={() => exportUserProfileToPDF(profile)}
                className="w-full mt-2.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
              >
                <Download className="w-4.5 h-4.5" />
                Descargar CV en PDF
              </button>
            </div>
          )}
        </div>

        {/* LinkedIn AI Sync Card */}
        <div id="linkedin-sync-card" className="bg-[#0a66c2]/5 rounded-xl border border-blue-200/50 p-5 shadow-xs space-y-4 relative overflow-hidden dark:bg-[#0a66c2]/10 dark:border-blue-800/40">
          {/* Subtle background icon */}
          <div className="absolute right-[-15px] top-[-15px] text-[#0a66c2]/10 pointer-events-none select-none dark:text-[#0a66c2]/20">
            <Linkedin className="w-24 h-24 stroke-[1]" />
          </div>

          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider border-b border-blue-100/40 pb-3">
            <Linkedin className="w-4 h-4 text-[#0a66c2] fill-[#0a66c2] dark:text-[#378fe9] dark:fill-[#378fe9]" />
            Sincronización LinkedIn IA
          </h3>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            Sincroniza tus datos de LinkedIn mediante una autenticación simulada. La IA de Gemini analizará, extraerá e importará tus habilidades y trayectoria laboral automáticamente.
          </p>

          {profile.cvFileName === "Importado de LinkedIn" ? (
            <div className="space-y-3 relative z-10">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-2.5 flex items-center gap-2">
                <div className="w-4.5 h-4.5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-black uppercase block tracking-wider">Perfil Sincronizado</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-300 block truncate font-bold">Candidato: {profile.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncLinkedIn}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300/40 dark:border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar Información
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSyncLinkedIn}
              className="w-full py-2.5 bg-[#0a66c2] hover:bg-[#004182] dark:bg-[#0a66c2] dark:hover:bg-[#004182] text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow-sm"
            >
              <Linkedin className="w-3.5 h-3.5 fill-white" />
              Conectar con LinkedIn
            </button>
          )}
        </div>

        {/* Skills Card */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Code className="w-4 h-4 text-indigo-500" />
              Habilidades ({profile.skills.length})
            </h3>
            {profile.skills.length > 0 && (
              <button
                type="button"
                onClick={handleAutoClassifyAll}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-all flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100/50 cursor-pointer"
                title="Clasifica de manera automática tus habilidades con heurísticas inteligentes"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Clasificar con IA
              </button>
            )}
          </div>

          {/* Add Skill form with Selector */}
          <form onSubmit={handleAddSkill} className="space-y-2 bg-neutral-50/60 dark:bg-slate-900/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Nueva habilidad (ej. React)..."
                className="w-full text-xs border border-neutral-250 dark:border-neutral-800 rounded-lg p-2 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500 font-medium text-neutral-850 dark:text-neutral-100"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer flex items-center justify-center shadow-xs"
                title="Añadir habilidad"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Tag className="w-3 h-3 text-neutral-400" />
                Categoría:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 text-[11px] border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 bg-white dark:bg-slate-950 focus:outline-none focus:border-indigo-500 font-semibold text-neutral-600 dark:text-neutral-300"
              >
                <option value="auto">✨ Auto-detectar categoría</option>
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </form>

          {/* Toggle for View Modes */}
          {profile.skills.length > 0 && (
            <div className="flex items-center justify-between gap-2 bg-neutral-50 dark:bg-slate-900/50 p-1 rounded-lg border border-neutral-150 dark:border-neutral-800/40">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1.5">Visualización:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSkillsViewMode('grouped')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    skillsViewMode === 'grouped'
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-neutral-200/50 dark:border-neutral-700/50"
                      : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-400"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Agrupado
                </button>
                <button
                  type="button"
                  onClick={() => setSkillsViewMode('flat')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    skillsViewMode === 'flat'
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-neutral-200/50 dark:border-neutral-700/50"
                      : "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-400"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  Lista Plana
                </button>
              </div>
            </div>
          )}

          {/* Skills Area */}
          {profile.skills.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/30">
              <Code className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 font-medium italic">No se han registrado habilidades. Escribe una arriba o sube tu CV.</p>
            </div>
          ) : skillsViewMode === 'grouped' ? (
            <div className="space-y-4">
              {/* List categorized groups */}
              {SKILL_CATEGORIES.map(cat => {
                const skillsInCat = skillsByCategory[cat.id] || [];
                if (skillsInCat.length === 0) return null; // Hide empty categories to keep UI clean and compact
                const catColor = getCategoryColor(cat.id);

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-neutral-100/50 pb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor.dot }} />
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        {cat.label} ({skillsInCat.length})
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-neutral-100 dark:border-neutral-800/80">
                      {skillsInCat.map(skill => renderSkillBadge(skill))}
                    </div>
                  </div>
                );
              })}

              {/* List Uncategorized */}
              {uncategorizedSkills.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 border-b border-neutral-100/50 pb-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Sin clasificar ({uncategorizedSkills.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-neutral-100 dark:border-neutral-800/80">
                    {uncategorizedSkills.map(skill => renderSkillBadge(skill))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Flat list rendering */
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map(skill => renderSkillBadge(skill))}
            </div>
          )}
        </div>

        {/* Weekly Email Alerts Subscription Card */}
        <EmailAlertsWidget
          profile={profile}
          onUpdateProfileEmail={(newEmail) => onUpdateProfile({ ...profile, email: newEmail })}
          isDarkMode={isDarkMode}
        />

        {/* App Settings Card */}
        <div id="app-settings-card" className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-neutral-100 pb-3">
            <Settings className="w-4 h-4 text-indigo-500" />
            Configuración del Sistema
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Tema de la Aplicación</span>
              <p className="text-[11px] text-neutral-500 mb-3 leading-normal">
                Alterna entre tema claro y oscuro. Se guardará de manera local en tu navegador.
              </p>
              
              <div className="bg-neutral-50 border border-neutral-200/60 p-1 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { if (isDarkMode) onToggleTheme(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !isDarkMode
                      ? "bg-white text-indigo-600 shadow-xs border border-neutral-200/40"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => { if (!isDarkMode) onToggleTheme(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isDarkMode
                      ? "bg-white text-indigo-600 shadow-xs border border-neutral-200/40"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Oscuro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Col 2 & 3: Experience List & Add Experience */}
      <div className="lg:col-span-2 space-y-6">
        {/* Experience List Card */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-neutral-100 pb-3">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            Experiencia Laboral ({profile.experience.length})
          </h3>

          {/* Form to add custom experience */}
          <form onSubmit={handleAddExperience} className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-neutral-700 uppercase">Añadir Experiencia Manualmente</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
                placeholder="Empresa (ej. Google)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                value={expRole}
                onChange={(e) => setExpRole(e.target.value)}
                placeholder="Puesto (ej. React Dev)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                value={expDuration}
                onChange={(e) => setExpDuration(e.target.value)}
                placeholder="Duración (ej. 2 años)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <textarea
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Descripción corta de logros y responsabilidades..."
              rows={2}
              className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Puesto
              </button>
            </div>
          </form>

          {/* Chronological List */}
          {profile.experience.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
              <Briefcase className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 font-medium italic">No se ha registrado experiencia laboral en el perfil.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="group relative border border-neutral-100 rounded-xl p-4 hover:bg-neutral-50/50 transition-all"
                >
                  <button
                    onClick={() => handleRemoveExperience(idx)}
                    className="absolute right-3 top-3 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Eliminar este puesto"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                      {exp.duration}
                    </span>
                    <h4 className="font-bold text-neutral-900 text-sm mt-1">{exp.role}</h4>
                    <p className="text-xs text-indigo-600 font-semibold">{exp.company}</p>
                    <p className="text-xs text-neutral-500 leading-relaxed mt-2 pl-2 border-l-2 border-neutral-200 whitespace-pre-line font-medium">
                      {exp.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education List Card */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-neutral-100 pb-3">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Educación y Certificaciones ({(profile.education || []).length})
          </h3>

          {/* Form to add custom education */}
          <form onSubmit={handleAddEducation} className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-neutral-700 uppercase">Añadir Estudios / Certificación</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={eduInstitution}
                onChange={(e) => setEduInstitution(e.target.value)}
                placeholder="Institución (ej. Universidad)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                value={eduDegree}
                onChange={(e) => setEduDegree(e.target.value)}
                placeholder="Título / Certificación (ej. CCNA / Ing.)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={eduDuration}
                onChange={(e) => setEduDuration(e.target.value)}
                placeholder="Período (ej. 2018 - 2022)"
                className="text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Registro
              </button>
            </div>
          </form>

          {/* Chronological List of Education */}
          {(!profile.education || profile.education.length === 0) ? (
            <div className="text-center py-10 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
              <GraduationCap className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 font-medium italic">No se han registrado estudios o certificaciones en el perfil.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="group relative border border-neutral-100 rounded-xl p-4 hover:bg-neutral-50/50 transition-all"
                >
                  <button
                    onClick={() => handleRemoveEducation(idx)}
                    className="absolute right-3 top-3 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1">
                    {edu.duration && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                        {edu.duration}
                      </span>
                    )}
                    <h4 className="font-bold text-neutral-900 text-sm mt-1">{edu.degree}</h4>
                    <p className="text-xs text-indigo-600 font-semibold">{edu.institution}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
