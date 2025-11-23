import { motion } from 'motion/react';
import { ArrowLeft, Plus, Music, Image as ImageIcon, Search, X, Play } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { useState } from 'react';
import { playlistsData, Track } from './PlayerContext';
import { ImageWithFallback } from '@/components/timurgenii/ImageWithFallback';

interface CreatePlaylistViewProps {
  onBack: () => void;
}

export function CreatePlaylistView({ onBack }: CreatePlaylistViewProps) {
  const { animations, t } = useSettings();
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedTracks, setAddedTracks] = useState<Track[]>([]);

  const getMotionProps = (delay: number = 0) => {
    if (!animations) {
      return { initial: false, animate: false };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] },
    };
  };

  // Get all available tracks
  const getAllTracks = (): Track[] => {
    const allTracks: Track[] = [];
    Object.values(playlistsData).forEach(tracks => {
      allTracks.push(...tracks);
    });
    // Remove duplicates based on title and artist
    const uniqueTracks = allTracks.filter((track, index, self) =>
      index === self.findIndex((t) => t.title === track.title && t.artist === track.artist)
    );
    return uniqueTracks;
  };

  const allAvailableTracks = getAllTracks();

  // Filter tracks based on search query
  const filteredTracks = allAvailableTracks.filter(track => {
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query)
    );
  });

  const handleCreate = () => {
    // Here you would create the playlist
    console.log('Creating playlist:', { 
      playlistName, 
      playlistDescription,
      tracks: addedTracks 
    });
    onBack();
  };

  const handleAddTrack = (track: Track) => {
    // Check if track is already added
    const isAlreadyAdded = addedTracks.some(
      t => t.title === track.title && t.artist === track.artist
    );
    if (!isAlreadyAdded) {
      setAddedTracks([...addedTracks, track]);
    }
  };

  const handleRemoveTrack = (index: number) => {
    setAddedTracks(addedTracks.filter((_, i) => i !== index));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      >
        <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span className="leading-none">{t('back')}</span>
      </motion.button>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 space-y-6 sm:space-y-8 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div {...getMotionProps(0)} className="mb-8">
            <h1 className="playlist-title-spotify text-4xl sm:text-5xl md:text-6xl text-white mb-2">
              {t('createPlaylist')}
            </h1>
            <p className="text-white opacity-70 text-sm sm:text-base">
              {t('createPlaylistDescription')}
            </p>
          </motion.div>

          {/* Form */}
          <div className="space-y-6">
            {/* Cover Image */}
            <motion.div {...getMotionProps(0.1)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistCover')}
              </label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 fast-transition group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1ED760]/20 to-transparent opacity-0 group-hover:opacity-100 fast-transition" />
                  <ImageIcon className="w-12 h-12 text-white/40 relative z-10" />
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm mb-2">
                    {t('chooseCoverImage')}
                  </p>
                  <button className="glass px-4 py-2 rounded-lg text-sm text-white hover:bg-white/10 fast-transition">
                    {t('uploadImage')}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Playlist Name */}
            <motion.div {...getMotionProps(0.15)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistName')}
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder={t('myPlaylist')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                autoFocus
              />
            </motion.div>

            {/* Playlist Description */}
            <motion.div {...getMotionProps(0.2)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistDescription')}
              </label>
              <textarea
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder={t('addDescription')}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none resize-none fast-transition"
              />
            </motion.div>

            {/* Add Tracks Section */}
            <motion.div {...getMotionProps(0.25)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-4">
                {t('addTracks')}
              </label>
              
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchTracks')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white fast-transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Added tracks list */}
              {addedTracks.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/60 text-sm mb-3">
                    {addedTracks.length} {addedTracks.length === 1 ? t('track') : t('tracks')} {t('added')}
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}>
                    {addedTracks.map((track, index) => (
                      <div
                        key={`${track.title}-${index}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 fast-transition group"
                      >
                        <ImageWithFallback
                          src={track.image}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{track.title}</p>
                          <p className="text-white/60 text-xs truncate">{track.artist}</p>
                        </div>
                        <span className="text-white/40 text-xs">{formatDuration(track.duration)}</span>
                        <button
                          onClick={() => handleRemoveTrack(index)}
                          className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white fast-transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchQuery && (
                <div className="space-y-2 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}>
                  {filteredTracks.length > 0 ? (
                    filteredTracks.map((track, index) => {
                      const isAdded = addedTracks.some(
                        t => t.title === track.title && t.artist === track.artist
                      );
                      return (
                        <motion.div
                          key={`${track.title}-${index}`}
                          {...(animations ? {
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            transition: { delay: index * 0.03 }
                          } : {})}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isAdded ? 'bg-[#1ED760]/20 border border-[#1ED760]/40' : 'bg-white/5 hover:bg-white/10'
                          } fast-transition group cursor-pointer`}
                          onClick={() => !isAdded && handleAddTrack(track)}
                        >
                          <ImageWithFallback
                            src={track.image}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{track.title}</p>
                            <p className="text-white/60 text-xs truncate">{track.artist}</p>
                          </div>
                          <span className="text-white/40 text-xs">{formatDuration(track.duration)}</span>
                          {isAdded ? (
                            <div className="w-8 h-8 rounded-full bg-[#1ED760] flex items-center justify-center flex-shrink-0">
                              <Music className="w-4 h-4 text-black" />
                            </div>
                          ) : (
                            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 fast-transition flex-shrink-0 hover:bg-[#1ED760] hover:scale-110">
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">{t('noResults')}</p>
                    </div>
                  )}
                </div>
              )}

              {!searchQuery && addedTracks.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('searchToAddTracks')}</p>
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div {...getMotionProps(0.3)} className="flex gap-3 pt-4">
              <button
                onClick={handleCreate}
                disabled={!playlistName.trim()}
                className="flex-1 sm:flex-none px-8 py-3 rounded-full flex items-center justify-center gap-2 fast-transition disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 gpu-accelerated"
                style={{
                  background: playlistName.trim() ? '#1ED760' : '#282828',
                  color: playlistName.trim() ? '#000' : '#fff',
                }}
              >
                <Plus className="w-5 h-5" />
                <span>{t('createPlaylist')}</span>
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-full glass text-white hover:bg-white/10 fast-transition"
              >
                {t('cancel')}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
