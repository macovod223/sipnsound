import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Language, getTranslation, TranslationKey } from './translations';

interface SettingsContextType {
  // Playback
  crossfade: boolean;
  setCrossfade: (value: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (value: number) => void;
  gapless: boolean;
  setGapless: (value: boolean) => void;
  normalizeVolume: boolean;
  setNormalizeVolume: (value: boolean) => void;

  // Display
  animations: boolean;
  setAnimations: (value: boolean) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  compactView: boolean;
  setCompactView: (value: boolean) => void;

  // Audio Quality
  streamingQuality: 'Low' | 'Normal' | 'High' | 'Very High';
  setStreamingQuality: (value: 'Low' | 'Normal' | 'High' | 'Very High') => void;
  downloadQuality: 'Normal' | 'High' | 'Very High';
  setDownloadQuality: (value: 'Normal' | 'High' | 'Very High') => void;

  // Notifications
  pushNotifications: boolean;
  setPushNotifications: (value: boolean) => void;
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
  newReleaseAlerts: boolean;
  setNewReleaseAlerts: (value: boolean) => void;

  // Language & Region
  language: Language;
  setLanguage: (value: Language) => void;
  region: string;
  setRegion: (value: string) => void;
  
  // Translation helper
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Load settings from localStorage
  const loadSetting = <T,>(key: string, defaultValue: T): T => {
    try {
      const stored = localStorage.getItem(`sip-sound-${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Playback
  const [crossfade, setCrossfadeState] = useState(() => loadSetting('crossfade', true));
  const [crossfadeDuration, setCrossfadeDurationState] = useState(() => loadSetting('crossfadeDuration', 5));
  const [gapless, setGaplessState] = useState(() => loadSetting('gapless', true));
  const [normalizeVolume, setNormalizeVolumeState] = useState(() => loadSetting('normalizeVolume', false));

  // Display
  const [animations, setAnimationsState] = useState(() => loadSetting('animations', true));
  const [highContrast, setHighContrastState] = useState(() => loadSetting('highContrast', false));
  const [compactView, setCompactViewState] = useState(() => loadSetting('compactView', false));

  // Audio Quality
  const [streamingQuality, setStreamingQualityState] = useState<'Low' | 'Normal' | 'High' | 'Very High'>(() => 
    loadSetting('streamingQuality', 'High')
  );
  const [downloadQuality, setDownloadQualityState] = useState<'Normal' | 'High' | 'Very High'>(() => 
    loadSetting('downloadQuality', 'Very High')
  );

  // Notifications
  const [pushNotifications, setPushNotificationsState] = useState(() => loadSetting('pushNotifications', true));
  const [emailNotifications, setEmailNotificationsState] = useState(() => loadSetting('emailNotifications', false));
  const [newReleaseAlerts, setNewReleaseAlertsState] = useState(() => loadSetting('newReleaseAlerts', true));

  // Language & Region
  const [language, setLanguageState] = useState<Language>(() => loadSetting('language', 'English'));
  const [region, setRegionState] = useState(() => loadSetting('region', 'United States'));
  
  // Translation helper
  const t = (key: TranslationKey) => getTranslation(language, key);

  // Save to localStorage
  const createSetter = <T,>(key: string, setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      localStorage.setItem(`sip-sound-${key}`, JSON.stringify(value));
    };
  };

  const setCrossfade = createSetter('crossfade', setCrossfadeState);
  const setCrossfadeDuration = createSetter('crossfadeDuration', setCrossfadeDurationState);
  const setGapless = createSetter('gapless', setGaplessState);
  const setNormalizeVolume = createSetter('normalizeVolume', setNormalizeVolumeState);
  const setAnimations = createSetter('animations', setAnimationsState);
  const setHighContrast = createSetter('highContrast', setHighContrastState);
  const setCompactView = createSetter('compactView', setCompactViewState);
  const setStreamingQuality = createSetter('streamingQuality', setStreamingQualityState);
  const setDownloadQuality = createSetter('downloadQuality', setDownloadQualityState);
  const setPushNotifications = createSetter('pushNotifications', setPushNotificationsState);
  const setEmailNotifications = createSetter('emailNotifications', setEmailNotificationsState);
  const setNewReleaseAlerts = createSetter('newReleaseAlerts', setNewReleaseAlertsState);
  const setLanguage = createSetter('language', setLanguageState);
  const setRegion = createSetter('region', setRegionState);

  // Apply animations setting to CSS
  useEffect(() => {
    if (animations) {
      document.documentElement.style.removeProperty('--animation-duration-instant');
      document.documentElement.style.removeProperty('--animation-duration-fast');
      document.documentElement.style.removeProperty('--animation-duration-normal');
    } else {
      document.documentElement.style.setProperty('--animation-duration-instant', '0s');
      document.documentElement.style.setProperty('--animation-duration-fast', '0s');
      document.documentElement.style.setProperty('--animation-duration-normal', '0s');
    }
  }, [animations]);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const value: SettingsContextType = {
    crossfade,
    setCrossfade,
    crossfadeDuration,
    setCrossfadeDuration,
    gapless,
    setGapless,
    normalizeVolume,
    setNormalizeVolume,
    animations,
    setAnimations,
    highContrast,
    setHighContrast,
    compactView,
    setCompactView,
    streamingQuality,
    setStreamingQuality,
    downloadQuality,
    setDownloadQuality,
    pushNotifications,
    setPushNotifications,
    emailNotifications,
    setEmailNotifications,
    newReleaseAlerts,
    setNewReleaseAlerts,
    language,
    setLanguage,
    region,
    setRegion,
    t,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
