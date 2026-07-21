import React, { useState } from "react";
import { 
  User, Mail, Phone, Code, Briefcase, GraduationCap, 
  Trash2, Plus, X, Check, ArrowLeft, Sparkles, AlertCircle 
} from "lucide-react";
import { motion } from "motion/react";
import { UserProfile, ExperienceItem, EducationItem } from "../types";

interface CVPreviewVerifierProps {
  initialData: Partial<UserProfile>;
  onConfirm: (verifiedData: Partial<UserProfile>) => void;
  onCancel: () => void;
}

export default function CVPreviewVerifier({ initialData, onConfirm, onCancel }: CVPreviewVerifierProps) {
  // Local editable states
  const [name, setName] = useState(initialData.name || "");
  const [email, setEmail] = useState(initialData.email || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [skills, setSkills] = useState<string[]>(initialData.skills || []);
  const [newSkill, setNewSkill] = useState("");
  
  const [experiences, setExperiences] = useState<ExperienceItem[]>(
    initialData.experience || []
  );
  
  const [educations, setEducations] = useState<EducationItem[]>(
    initialData.education || []
  );

  // Helper to add skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, trimmed]);
    }
    setNewSkill("");
  };

  // Helper to remove skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // Helper to update specific experience field
  const handleUpdateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    const updated = experiences.map((exp, idx) => {
      if (idx === index) {
        return { ...exp, [field]: value };
      }
      return exp;
    });
    setExperiences(updated);
  };

  // Helper to remove experience item
  const handleRemoveExperience = (index: number) => {
    setExperiences(experiences.filter((_, idx) => idx !== index));
  };

  // Helper to add empty experience
  const handleAddExperienceItem = () => {
    const newItem: ExperienceItem = {
      company: "",
      role: "",
      duration: "",
      description: ""
    };
    setExperiences([...experiences, newItem]);
  };

  // Helper to update specific education field
  const handleUpdateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const updated = educations.map((edu, idx) => {
      if (idx === index) {
        return { ...edu, [field]: value };
      }
      return edu;
    });
    setEducations(updated);
  };

  // Helper to remove education item
  const handleRemoveEducation = (index: number) => {
    setEducations(educations.filter((_, idx) => idx !== index));
  };

  // Helper to add empty education
  const handleAddEducationItem = () => {
    const newItem: EducationItem = {
      institution: "",
      degree: "",
      duration: ""
    };
    setEducations([...educations, newItem]);
  };

  const handleSave = () => {
    const finalData: Partial<UserProfile> = {
      ...initialData,
      name,
      email,
      phone,
      skills,
      experience: experiences,
      education: educations
    };
    onConfirm(finalData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      id="cv-preview-verifier-panel" 
      className="bg-white rounded-xl border border-neutral-200/80 shadow-md overflow-hidden"
    >
      {/* Dynamic Header */}
      <div className="bg-indigo-600 p-6 text-white relative">
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
          <Sparkles className="w-24 h-24 stroke-[1.5]" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Verificar Extracción de CV con IA</h3>
            <p className="text-xs text-indigo-100 mt-1 max-w-2xl leading-normal">
              La IA de Gemini ha analizado tu currículum. Revisa los datos extraídos a continuación y realiza ajustes rápidos si hay alguna imprecisión antes de confirmarlo.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Layout: Grid 1 Column on Mobile, 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Personal Info & Skills */}
          <div className="space-y-6">
            
            {/* Personal Details Panel */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                <User className="w-4 h-4 text-indigo-500" />
                Información de Contacto
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full text-xs border border-neutral-200 rounded-lg py-2 pl-9 pr-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ej. juan@correo.com"
                        className="w-full text-xs border border-neutral-200 rounded-lg py-2 pl-9 pr-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej. +51 987654321"
                        className="w-full text-xs border border-neutral-200 rounded-lg py-2 pl-9 pr-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Panel */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                <Code className="w-4 h-4 text-indigo-500" />
                Habilidades Técnicas ({skills.length})
              </h4>

              <form onSubmit={handleAddSkill} className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Añadir habilidad (ej: Kubernetes)..."
                  className="flex-1 text-xs border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-semibold text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </form>

              {skills.length === 0 ? (
                <div className="text-center py-4 bg-neutral-50 rounded-lg border border-neutral-200/40 text-xs text-neutral-400 italic">
                  No se extrajeron habilidades de forma automática.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-neutral-50/50 border border-neutral-100 rounded-lg">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 bg-white text-neutral-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-neutral-200/80 shadow-xs"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Education Panel */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  Educación y Certificaciones
                </h4>
                <button
                  type="button"
                  onClick={handleAddEducationItem}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>

              {educations.length === 0 ? (
                <div className="text-center py-6 bg-neutral-50 rounded-lg border border-neutral-200/40 text-xs text-neutral-400 italic">
                  No se extrajo historial educativo. Haz click en añadir para agregar uno.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {educations.map((edu, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 border border-neutral-200/80 rounded-lg bg-neutral-50/30 relative group hover:border-neutral-300 transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(idx)}
                        className="absolute right-2 top-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer opacity-80 md:opacity-0 group-hover:opacity-100"
                        title="Eliminar educación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 pr-6">
                        <div>
                          <label className="text-[9px] font-bold text-neutral-400 uppercase">Institución</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => handleUpdateEducation(idx, "institution", e.target.value)}
                            placeholder="Ej. Universidad Mayor"
                            className="w-full text-xs border border-neutral-200 rounded-md p-1.5 bg-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-neutral-400 uppercase">Título / Grado</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                            placeholder="Ej. Bachiller en Computación"
                            className="w-full text-xs border border-neutral-200 rounded-md p-1.5 bg-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase">Período / Año</label>
                        <input
                          type="text"
                          value={edu.duration || ""}
                          onChange={(e) => handleUpdateEducation(idx, "duration", e.target.value)}
                          placeholder="Ej. 2018 - 2022"
                          className="w-full sm:w-1/2 text-xs border border-neutral-200 rounded-md p-1.5 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Work Experience */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Experiencia Laboral ({experiences.length})
              </h4>
              <button
                type="button"
                onClick={handleAddExperienceItem}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Puesto
              </button>
            </div>

            {experiences.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200/40 text-xs text-neutral-400 italic">
                No se extrajeron registros de experiencia. Añade uno si deseas.
              </div>
            ) : (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
                {experiences.map((exp, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 border border-neutral-200 rounded-xl bg-neutral-50/40 relative group hover:border-neutral-300 transition-all space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="absolute right-3 top-3 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-80 md:opacity-0 group-hover:opacity-100"
                      title="Eliminar experiencia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">Empresa</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => handleUpdateExperience(idx, "company", e.target.value)}
                          placeholder="Nombre de la empresa"
                          className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">Puesto / Rol</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                          placeholder="Ej. Desarrollador React"
                          className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 font-semibold text-neutral-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">Duración</label>
                      <input
                        type="text"
                        value={exp.duration}
                        onChange={(e) => handleUpdateExperience(idx, "duration", e.target.value)}
                        placeholder="Ej. En-2020 a Mar-2023 o 2 años"
                        className="w-full sm:w-1/2 text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-0.5">Descripción y Logros</label>
                      <textarea
                        value={exp.description}
                        onChange={(e) => handleUpdateExperience(idx, "description", e.target.value)}
                        placeholder="Describe brevemente tus responsabilidades y logros clave..."
                        rows={3}
                        className="w-full text-xs border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 font-medium leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Warning Alert Banner */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2.5 text-amber-800 text-xs">
          <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="font-medium">
            <strong>Recomendación:</strong> Asegúrate de verificar los nombres de las tecnologías y los datos de contacto. Un perfil con datos correctos incrementa significativamente el índice de coincidencia y precisión del buscador inteligente de TalentoMatch.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Descartar y volver a subir
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Confirmar y Guardar Perfil
          </button>
        </div>

      </div>
    </motion.div>
  );
}
