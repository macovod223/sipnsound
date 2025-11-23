import { motion } from 'motion/react';
import { Globe, Monitor, Music2, Coffee } from 'lucide-react';
import { Switch } from './ui/switch';
import { useSettings } from './SettingsContext';
import { toast } from 'sonner';
import { Language } from './translations';
import { useState } from 'react';

export function SettingsView() {
  const settings = useSettings();
  const { t } = settings;
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  const languageOptions: Language[] = ['English', 'Русский'];

  // Helper to show toast on setting change
  const handleSettingChange = (settingName: string, value: boolean | string) => {
    const status = typeof value === 'boolean' ? (value ? t('enabled' as any) || 'enabled' : t('disabled' as any) || 'disabled') : value;
    toast.success(`${settingName} ${typeof value === 'boolean' ? status : ''}${typeof value === 'string' ? `: ${status}` : ''}`, {
      duration: 2000,
      style: {
        background: 'rgba(24, 24, 24, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
      },
    });
  };

  // Motion props based on animation settings
  const getMotionProps = (delay = 0) => {
    if (!settings.animations) {
      return {
        initial: false,
        animate: false,
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay },
    };
  };
  return (
    <motion.div
      {...(settings.animations ? {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 },
        transition: { duration: 0.4, ease: 'easeOut' },
      } : {
        initial: false,
        animate: false,
      })}
      className="flex-1 flex flex-col gap-4 sm:gap-5 md:gap-6 min-w-0 h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <motion.h1
          {...getMotionProps(0)}
          className="playlist-title-spotify text-3xl sm:text-4xl md:text-5xl text-white mb-2"
        >
          {t('settingsTitle')}
        </motion.h1>
        <motion.p
          {...getMotionProps(0.1)}
          className="text-white opacity-70 text-sm sm:text-base"
        >
          {t('settingsSubtitle')}
        </motion.p>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 space-y-4 sm:space-y-5 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        {/* Playback */}
        <motion.section
          {...getMotionProps(0)}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6"
          style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1ED760 0%, #1DB954 100%)',
                boxShadow: '0 4px 12px rgba(30, 215, 96, 0.3)',
              }}
            >
              <Music2 className="w-5 h-5 text-black" />
            </div>
            <h2 className="section-heading-spotify text-lg sm:text-xl text-white">{t('playback')}</h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-4 py-2">
              <label htmlFor="crossfade" className="text-white text-sm sm:text-base cursor-pointer">
                {t('crossfadeSongs')}
              </label>
              <Switch
                id="crossfade"
                checked={settings.crossfade}
                onCheckedChange={(checked) => {
                  settings.setCrossfade(checked);
                  handleSettingChange(t('crossfadeSongs'), checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <label htmlFor="gapless" className="text-white text-sm sm:text-base cursor-pointer">
                {t('gaplessPlayback')}
              </label>
              <Switch
                id="gapless"
                checked={settings.gapless}
                onCheckedChange={(checked) => {
                  settings.setGapless(checked);
                  handleSettingChange(t('gaplessPlayback'), checked);
                }}
              />
            </div>
          </div>
        </motion.section>

        {/* Display */}
        <motion.section
          {...getMotionProps(0.05)}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6"
          style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1ED760 0%, #1DB954 100%)',
                boxShadow: '0 4px 12px rgba(30, 215, 96, 0.3)',
              }}
            >
              <Monitor className="w-5 h-5 text-black" />
            </div>
            <h2 className="section-heading-spotify text-lg sm:text-xl text-white">{t('display')}</h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-4 py-2">
              <label htmlFor="animations" className="text-white text-sm sm:text-base cursor-pointer">
                {t('enableAnimations')}
              </label>
              <Switch
                id="animations"
                checked={settings.animations}
                onCheckedChange={(checked) => {
                  settings.setAnimations(checked);
                  handleSettingChange(t('enableAnimations'), checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <label htmlFor="high-contrast" className="text-white text-sm sm:text-base cursor-pointer">
                {t('highContrastMode')}
              </label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => {
                  settings.setHighContrast(checked);
                  handleSettingChange(t('highContrastMode'), checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <label htmlFor="compact-view" className="text-white text-sm sm:text-base cursor-pointer">
                {t('compactView')}
              </label>
              <Switch
                id="compact-view"
                checked={settings.compactView}
                onCheckedChange={(checked) => {
                  settings.setCompactView(checked);
                  handleSettingChange(t('compactView'), checked);
                }}
              />
            </div>
          </div>
        </motion.section>

        {/* Language */}
        <motion.section
          {...getMotionProps(0.1)}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6"
          style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1ED760 0%, #1DB954 100%)',
                boxShadow: '0 4px 12px rgba(30, 215, 96, 0.3)',
              }}
            >
              <Globe className="w-5 h-5 text-black" />
            </div>
            <h2 className="section-heading-spotify text-lg sm:text-xl text-white">{t('language')}</h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-4 py-2">
              <label className="text-white text-sm sm:text-base">{t('language')}</label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLanguageMenu(!showLanguageMenu);
                  }}
                  className="glass rounded-lg px-3 sm:px-4 py-2 text-white text-sm sm:text-base opacity-70 hover:opacity-100 fast-transition"
                >
                  {settings.language}
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 glass-strong rounded-lg overflow-hidden min-w-[140px] z-[9999]">
                    {languageOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          settings.setLanguage(option);
                          handleSettingChange(t('language'), option);
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 fast-transition ${
                          settings.language === option ? 'text-[#1ED760]' : 'text-white opacity-70'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* About section */}
        <motion.section
          {...getMotionProps(0.15)}
          className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Coffee cup icon */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <Coffee 
              className="w-16 h-16 sm:w-20 sm:h-20" 
              strokeWidth={2.5}
              style={{
                color: '#1ED760',
                filter: 'drop-shadow(0 4px 12px rgba(30, 215, 96, 0.3))',
              }}
            />
          </div>

          <h3 className="playlist-title-spotify text-2xl sm:text-3xl text-white mb-2">Sip&Sound</h3>
          <p className="text-white opacity-60 text-sm sm:text-base mb-1">
            Version 1.0.0 • Made with 💚
          </p>
          <p className="text-white opacity-40 text-xs sm:text-sm mt-3">
            © 2025 Sip&Sound. All rights reserved.
          </p>
        </motion.section>

        {/* Spacer */}
        <div className="h-4" />
      </div>
    </motion.div>
  );
}
