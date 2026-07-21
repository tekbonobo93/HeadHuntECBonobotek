import React from "react";
import { Filter, DollarSign, Globe, Briefcase, Award, MapPin } from "lucide-react";
import { SearchPreferences } from "../types";

interface PreferencesFormProps {
  preferences: SearchPreferences;
  onChange: (updatedPrefs: SearchPreferences) => void;
}

export default function PreferencesForm({ preferences, onChange }: PreferencesFormProps) {
  const handleChange = (key: keyof SearchPreferences, value: any) => {
    onChange({
      ...preferences,
      [key]: value,
    });
  };

  const handleSalaryChange = (subKey: 'min' | 'max' | 'currency', value: any) => {
    onChange({
      ...preferences,
      desiredSalaryRange: {
        ...preferences.desiredSalaryRange,
        [subKey]: value,
      },
    });
  };

  return (
    <div id="preferences-form" className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm">
      <h2 className="text-lg font-medium text-neutral-900 flex items-center gap-2 mb-1">
        <Filter className="w-5 h-5 text-indigo-500" />
        Preferencias de Búsqueda
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Establece tus criterios de filtrado inteligente. La IA priorizará las vacantes que encajen con estos datos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Entorno de Trabajo */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            Entorno de Trabajo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['remoto', 'hibrido', 'presencial', 'cualquiera'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleChange("locationType", type)}
                className={`py-2 px-3 text-sm capitalize rounded-lg border font-medium transition-all ${
                  preferences.locationType === type
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo de Jornada */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
            Tipo de Jornada
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['completa', 'parcial', 'cualquiera'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleChange("jobType", type)}
                className={`py-2 px-1 text-xs capitalize rounded-lg border font-medium transition-all ${
                  preferences.jobType === type
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {type === "completa" ? "Completa" : type === "parcial" ? "Parcial" : "Cualquiera"}
              </button>
            ))}
          </div>
        </div>

        {/* Nivel de Experiencia / Seniority */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-neutral-400" />
            Nivel de Seniority
          </label>
          <select
            value={preferences.seniorityLevel}
            onChange={(e) => handleChange("seniorityLevel", e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-lg p-2 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-neutral-800"
          >
            <option value="cualquiera">Cualquiera / Todos</option>
            <option value="trainee">Trainee / Prácticas</option>
            <option value="junior">Junior</option>
            <option value="semi-senior">Semi-Senior</option>
            <option value="senior">Senior / Lead</option>
          </select>
        </div>

        {/* Alcance Geográfico */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            Alcance Geográfico
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['pais', 'latam', 'global'] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => handleChange("geographicScope", scope)}
                className={`py-2 px-1 text-xs uppercase rounded-lg border font-medium transition-all ${
                  preferences.geographicScope === scope
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {scope === "pais" ? "Mi País" : scope === "latam" ? "LatAm" : "Global"}
              </button>
            ))}
          </div>
        </div>

        {/* País de Residencia */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            País de Residencia
          </label>
          <input
            type="text"
            value={preferences.residentCountry}
            onChange={(e) => handleChange("residentCountry", e.target.value)}
            placeholder="Ej. Perú, España, México"
            className="w-full text-sm border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-neutral-800"
          />
        </div>

        {/* Rango Salarial Deseado */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
            Rango Salarial Mensual
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={preferences.desiredSalaryRange.min || ""}
              onChange={(e) => handleSalaryChange("min", Number(e.target.value))}
              placeholder="Min"
              min="0"
              className="w-full text-sm border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-neutral-800"
            />
            <span className="text-neutral-400 text-xs">—</span>
            <input
              type="number"
              value={preferences.desiredSalaryRange.max || ""}
              onChange={(e) => handleSalaryChange("max", Number(e.target.value))}
              placeholder="Max"
              min="0"
              className="w-full text-sm border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-neutral-800"
            />
            <select
              value={preferences.desiredSalaryRange.currency}
              onChange={(e) => handleSalaryChange("currency", e.target.value)}
              className="text-xs border border-neutral-200 rounded-lg p-2 bg-neutral-50 text-neutral-600 font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="PEN">PEN</option>
              <option value="MXN">MXN</option>
              <option value="COP">COP</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
