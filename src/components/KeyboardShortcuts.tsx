import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from './SettingsContext';

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useSettings();

  const shortcuts = [
    { key: 'Space / K / Л', action: t('spaceToPlayPause') },
    { key: '→', action: t('nextTrack') },
    { key: '←', action: t('previousTrack') },
    { key: '↑', action: t('volumeUp') },
    { key: '↓', action: t('volumeDown') },
    { key: 'F / А', action: t('toggleFullscreen') },
    { key: 'L / Д', action: t('toggleLike') },
    { key: 'M / Ь', action: t('toggleMute') },
    { key: 'S / Ы', action: t('toggleShuffle') },
    { key: 'R / К', action: t('toggleRepeat') },
  ];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass px-2.5 sm:px-3 py-2 rounded-lg hover:scale-105 fast-transition gpu-accelerated flex items-center gap-2"
        style={{
          color: '#b3b3b3',
        }}
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Shortcuts modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md mx-4"
            >
              <div className="glass-strong rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl" style={{ color: '#ffffff' }}>
                    {t('keyboardShortcuts')}
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-white/10 fast-transition flex items-center justify-center"
                    style={{ color: '#b3b3b3' }}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 fast-transition"
                    >
                      <span style={{ color: '#e6e6e6', fontSize: '14px' }}>
                        {shortcut.action}
                      </span>
                      <kbd
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-4 pt-4 border-t text-xs text-center"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#b3b3b3',
                  }}
                >
                  {t('language') === 'Язык' 
                    ? 'Горячие клавиши работают на английской и русской раскладке'
                    : 'Shortcuts work on both English and Russian keyboard layouts'
                  }
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
