import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { PlaylistCard } from './PlaylistCard';
import { useSettings } from './SettingsContext';
import { useState } from 'react';

interface ShowAllViewProps {
  title: string;
  playlists: Array<{
    title: string;
    artist: string;
    image: string;
  }>;
  onBack: () => void;
}

export function ShowAllView({ title, playlists, onBack }: ShowAllViewProps) {
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | null>(null);
  const { animations, compactView, t } = useSettings();

  return (
    <motion.div
      {...(animations ? {
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
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="glass px-4 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center gap-2 opacity-70 hover:opacity-100 fast-transition w-fit text-sm sm:text-base text-white"
        {...(animations ? {
          whileHover: { x: -4, scale: 1.02 },
          whileTap: { scale: 0.98 },
        } : {})}
        style={{ overflow: 'visible' }}
      >
        <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span className="leading-none">{t('back')}</span>
      </motion.button>

      {/* Header */}
      <div className="flex-shrink-0">
        <motion.h1
          {...(animations ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
          } : {
            initial: false,
            animate: false,
          })}
          className="playlist-title-spotify text-3xl sm:text-4xl md:text-5xl text-white mb-2"
        >
          {title}
        </motion.h1>
        <motion.p
          {...(animations ? {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.1 },
          } : {
            initial: false,
            animate: false,
          })}
          className="text-white opacity-70 text-sm sm:text-base"
        >
          {playlists.length} {t('playlistsCount')}
        </motion.p>
      </div>

      {/* Scrollable grid */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        <div className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5'}`}>
          {playlists.map((playlist, index) => (
            <PlaylistCard
              key={index}
              {...playlist}
              index={index}
              onHoverChange={setHoveredPlaylist}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="h-4 mt-4" />
      </div>
    </motion.div>
  );
}
