/**
 * Advanced Notification and Web Audio Sound Synthesizer System
 * Enables background desktop alerts and customizable audios even if the tab is minimized.
 */

export type SoundType = "classic" | "cyber" | "success" | "gentle" | "none";

export interface NotificationConfig {
  soundType: SoundType;
  volume: number; // range 0 to 1
  desktopEnabled: boolean;
}

const DEFAULT_CONFIG: NotificationConfig = {
  soundType: "classic",
  volume: 0.5,
  desktopEnabled: false,
};

// Safe localStorage helper
export const loadNotificationConfig = (): NotificationConfig => {
  try {
    const saved = localStorage.getItem("talentomatch_notification_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        soundType: parsed.soundType || DEFAULT_CONFIG.soundType,
        volume: typeof parsed.volume === "number" ? parsed.volume : DEFAULT_CONFIG.volume,
        desktopEnabled: typeof parsed.desktopEnabled === "boolean" ? parsed.desktopEnabled : DEFAULT_CONFIG.desktopEnabled,
      };
    }
  } catch (e) {
    console.error("Failed to load notification config", e);
  }
  return DEFAULT_CONFIG;
};

export const saveNotificationConfig = (config: NotificationConfig): void => {
  try {
    localStorage.setItem("talentomatch_notification_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save notification config", e);
  }
};

/**
 * Request permission for browser system notifications
 */
export const requestDesktopPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

/**
 * Returns the current permission state of browser notifications
 */
export const getDesktopPermissionState = (): NotificationPermission => {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
};

/**
 * Dispatches a native desktop notification if allowed
 */
export const sendDesktopNotification = (
  title: string,
  body: string,
  onClick?: () => void
): void => {
  const config = loadNotificationConfig();
  
  // Only proceed if enabled in config and granted in browser
  if (!config.desktopEnabled || getDesktopPermissionState() !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico", // Attempt to use app icon
      tag: "talentomatch-match",
      requireInteraction: false,
    });

    if (onClick) {
      notification.onclick = (e) => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (e) {
    console.error("Failed to trigger desktop notification", e);
  }
};

/**
 * Synthesizes a robust audio signal using the Web Audio API
 */
export const playSynthesizedNotification = (
  type: SoundType,
  customVolume?: number
): void => {
  const config = loadNotificationConfig();
  const activeType = type;
  const activeVolume = typeof customVolume === "number" ? customVolume : config.volume;

  if (activeType === "none" || activeVolume <= 0) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Resume context if suspended (browser security block)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const playClassic = () => {
      const duration = 0.5;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.type = "sine";
      osc2.type = "triangle";

      const now = audioCtx.currentTime;

      // Classic chime chord: C6 (1046.50Hz) and G6 (1567.98Hz)
      osc1.frequency.setValueAtTime(1046.50, now);
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // Slide to E6
      
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // Slide to C6

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(activeVolume * 0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    };

    const playCyber = () => {
      const now = audioCtx.currentTime;
      // Quick sequence of digital blips
      const notes = [1200, 1600, 2000, 2400];
      const step = 0.06;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * step);
        
        gain.gain.setValueAtTime(0, now + idx * step);
        gain.gain.linearRampToValueAtTime(activeVolume * 0.12, now + idx * step + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * step + step - 0.005);
        
        osc.start(now + idx * step);
        osc.stop(now + idx * step + step);
      });
    };

    const playSuccess = () => {
      // Ascending triumphant major scale fanfare
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const durations = [0.08, 0.08, 0.08, 0.4];
      let timeAccumulator = 0;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const subOsc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = "triangle";
        subOsc.type = "sine";

        const noteStart = now + timeAccumulator;
        const noteDuration = durations[idx];

        osc.frequency.setValueAtTime(freq, noteStart);
        subOsc.frequency.setValueAtTime(freq / 2, noteStart); // Bass subharmonic

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(activeVolume * 0.15, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

        osc.start(noteStart);
        subOsc.start(noteStart);
        osc.stop(noteStart + noteDuration);
        subOsc.stop(noteStart + noteDuration);

        timeAccumulator += noteDuration * 0.8;
      });
    };

    const playGentle = () => {
      // Soft, lingering crystal bowl bowl/bell chime
      const duration = 1.2;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = "sine";
      const now = audioCtx.currentTime;

      // Pure A4 (440Hz) with a sweet minor-third overtone simulated via frequency slide
      osc.frequency.setValueAtTime(880.00, now); // A5
      osc.frequency.linearRampToValueAtTime(523.25, now + 0.4); // Slide down to C5 (soft)

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(activeVolume * 0.15, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    };

    // Execute corresponding synthesizer
    switch (activeType) {
      case "classic":
        playClassic();
        break;
      case "cyber":
        playCyber();
        break;
      case "success":
        playSuccess();
        break;
      case "gentle":
        playGentle();
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Web Audio API notification synthesis failed:", error);
  }
};
