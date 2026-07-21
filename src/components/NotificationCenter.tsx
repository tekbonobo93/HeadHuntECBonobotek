import React, { useState, useRef, useEffect } from "react";
import { Bell, BellRing, Sparkles, X, Check, Eye, Bookmark, Trash2, Calendar, ShieldCheck, MapPin, DollarSign, Activity, Settings, Volume2, VolumeX, Music, BellOff, Info, Play, Laptop, ShieldAlert } from "lucide-react";
import { JobNotification, JobOffer } from "../types";
import {
  loadNotificationConfig,
  saveNotificationConfig,
  requestDesktopPermission,
  getDesktopPermissionState,
  playSynthesizedNotification,
  SoundType
} from "../utils/notificationSystem";

interface NotificationCenterProps {
  notifications: JobNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSaveJob: (job: JobOffer, status: 'guardado' | 'postulado') => void;
  onTriggerManualSimulation: () => void;
  savedJobIds: string[];
  appliedJobIds: string[];
}

export default function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSaveJob,
  onTriggerManualSimulation,
  savedJobIds,
  appliedJobIds
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundType, setSoundType] = useState<SoundType>("classic");
  const [volume, setVolume] = useState<number>(0.5);
  const [desktopEnabled, setDesktopEnabled] = useState<boolean>(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>("default");

  // Load configuration on mount
  useEffect(() => {
    const config = loadNotificationConfig();
    setSoundType(config.soundType);
    setVolume(config.volume);
    setDesktopEnabled(config.desktopEnabled);
    setDesktopPermission(getDesktopPermissionState());
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update configuration when state changes
  const updateConfig = (newSoundType: SoundType, newVolume: number, newDesktopEnabled: boolean) => {
    setSoundType(newSoundType);
    setVolume(newVolume);
    setDesktopEnabled(newDesktopEnabled);
    saveNotificationConfig({
      soundType: newSoundType,
      volume: newVolume,
      desktopEnabled: newDesktopEnabled
    });
  };

  const handleToggleDesktop = async () => {
    if (desktopPermission !== "granted") {
      const granted = await requestDesktopPermission();
      const newState = getDesktopPermissionState();
      setDesktopPermission(newState);
      if (granted) {
        updateConfig(soundType, volume, true);
      } else {
        updateConfig(soundType, volume, false);
      }
    } else {
      updateConfig(soundType, volume, !desktopEnabled);
    }
  };

  const handleTestNotification = () => {
    // Play sound using the Web Audio synthesizer
    playSynthesizedNotification(soundType, volume);
    
    // Trigger desktop test notification if permitted and enabled
    if (desktopEnabled && desktopPermission === "granted") {
      if ("Notification" in window) {
        try {
          new Notification("🔊 Prueba de Alerta de Empleo", {
            body: `¡Excelente! Escuchas el tono "${soundType}" y las alertas flotantes del sistema están configuradas correctamente.`,
            tag: "talentomatch-test"
          });
        } catch (e) {
          console.error("Browser desktop notification test failed", e);
        }
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 70) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isOpen
            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        }`}
        title="Alertas de Empleo"
        id="notification-bell-btn"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 animate-swing text-indigo-600" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div 
          id="notifications-dropdown-menu"
          className="absolute right-0 mt-3 w-[360px] sm:w-[420px] bg-white rounded-2xl border border-slate-200/95 shadow-2xl z-50 overflow-hidden transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Alertas de Match IA</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  onMarkAllAsRead();
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3 text-indigo-400" />
                Marcar leídos
              </button>
            )}
          </div>

          {/* Quick Simulation Trigger Section */}
          <div className="bg-gradient-to-r from-indigo-50/70 to-indigo-50/20 px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-wide block">Simulación de Alertas</span>
              <span className="text-[10px] text-slate-500 font-medium">Fuerza el escáner de IA para simular una vacante.</span>
            </div>
            <button
              onClick={() => {
                onTriggerManualSimulation();
              }}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              <Activity className="w-3 h-3 text-indigo-200 animate-pulse" />
              Simular Ahora
            </button>
          </div>

          {/* Collapsible Alerts Configuration Panel */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full px-5 py-2.5 bg-slate-50 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-950 transition-colors flex items-center justify-between text-xs font-bold cursor-pointer border-none outline-none"
            >
              <div className="flex items-center gap-2">
                <Settings className={`w-3.5 h-3.5 ${isSettingsOpen ? 'rotate-45 text-indigo-600' : 'text-slate-400'} transition-transform duration-300`} />
                <span>Configurar Alertas en Segundo Plano</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                {isSettingsOpen ? "Ocultar" : "Personalizar"}
              </span>
            </button>

            {isSettingsOpen && (
              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                {/* Desktop Background Alerts Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                        Notificaciones de Escritorio (Push)
                      </label>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Entérate al instante con alertas flotantes de sistema si la pestaña está oculta.
                      </p>
                    </div>
                    <button
                      onClick={handleToggleDesktop}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        desktopEnabled && desktopPermission === "granted" ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          desktopEnabled && desktopPermission === "granted" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Permission warning states */}
                  {desktopPermission === "denied" && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[9px] text-amber-800 flex items-start gap-1.5">
                      <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Permiso bloqueado en el navegador. Activa las notificaciones en el candado de la barra de direcciones para habilitarlas.
                      </span>
                    </div>
                  )}
                  {desktopPermission === "default" && (
                    <p className="text-[9px] text-indigo-600 font-semibold bg-indigo-50/50 px-2 py-1 rounded">
                      💡 Requiere que aceptes la solicitud de permiso del navegador al activar.
                    </p>
                  )}
                </div>

                {/* Ringtone / Synthesizer Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                      <Music className="w-3 h-3 text-indigo-500" />
                      Tono de Alerta
                    </label>
                    <select
                      value={soundType}
                      onChange={(e) => updateConfig(e.target.value as SoundType, volume, desktopEnabled)}
                      className="w-full text-[10px] bg-white border border-slate-200 rounded-lg p-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="classic">🔔 Campana Clásica</option>
                      <option value="cyber">🚀 Telemetría Digital</option>
                      <option value="success">🎉 Fanfarria Triunfal</option>
                      <option value="gentle">🧘 Tazón de Cristal</option>
                      <option value="none">🔇 Silenciar Sonido</option>
                    </select>
                  </div>

                  {/* Volume Slider & Testing */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {volume === 0 || soundType === "none" ? (
                          <VolumeX className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-indigo-500" />
                        )}
                        Volumen
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">{Math.round(volume * 100)}%</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        disabled={soundType === "none"}
                        onChange={(e) => updateConfig(soundType, parseFloat(e.target.value), desktopEnabled)}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={handleTestNotification}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer shrink-0 border-none flex items-center justify-center"
                        title="Probar sonido y notificación"
                      >
                        <Play className="w-2.5 h-2.5 fill-white text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Sin alertas pendientes</p>
                  <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                    Las alertas automáticas aparecerán cuando detectemos nuevas ofertas web compatibles con tus filtros de ubicación, cargo y sueldo.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const isSaved = savedJobIds.includes(notif.job.id);
                const isApplied = appliedJobIds.includes(notif.job.id);
                const isManaged = isSaved || isApplied;

                return (
                  <div 
                    key={notif.id} 
                    className={`p-4 transition-all duration-200 flex flex-col gap-2 relative ${
                      notif.isRead ? "bg-white" : "bg-indigo-50/15"
                    }`}
                  >
                    {/* Unread Indicator Dot */}
                    {!notif.isRead && (
                      <span className="absolute top-4 left-3 w-2 h-2 bg-indigo-500 rounded-full"></span>
                    )}

                    <div className="pl-3.5 space-y-1">
                      {/* Timestamp & Platform */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          {notif.timestamp}
                        </span>
                        <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                          {notif.job.sourcePlatform}
                        </span>
                      </div>

                      {/* Job Title & Company */}
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 leading-tight">
                          {notif.job.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{notif.job.company}</p>
                      </div>

                      {/* Location & Salary Info */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-slate-400">
                        <span className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-slate-600">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {notif.job.location} ({notif.job.locationType})
                        </span>
                        <span className="flex items-center gap-0.5 bg-emerald-50/60 border border-emerald-100/50 px-1 py-0.5 rounded text-emerald-700">
                          <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                          {notif.job.salary}
                        </span>
                      </div>

                      {/* Trigger Message / Matching Detail */}
                      <p className="text-[10px] text-indigo-700/80 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/30 font-medium mt-1 leading-normal">
                        {notif.message}
                      </p>

                      {/* Actions footer */}
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100/50">
                        {/* Compatibility score badge */}
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider ${getScoreColor(notif.job.compatibilityScore)}`}>
                          {notif.job.compatibilityScore}% MATCH
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Mark individual as read */}
                          {!notif.isRead && (
                            <button
                              onClick={() => onMarkAsRead(notif.id)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Marcar como leído"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick track/save trigger */}
                          {isManaged ? (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              Registrado
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSaveJob(notif.job, 'guardado');
                                onMarkAsRead(notif.id);
                              }}
                              className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Bookmark className="w-3 h-3 text-indigo-400" />
                              Guardar vacante
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer action */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-medium">Total: {notifications.length} alertas</span>
              <button
                onClick={() => {
                  onClearAll();
                }}
                className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Borrar historial
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
