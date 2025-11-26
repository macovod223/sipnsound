import { Play, Heart, Pause } from 'lucide-react';
import { useState } from 'react';
import { usePlayer } from './PlayerContext';
import { useSettings } from './SettingsContext';
import { MusicVisualizer } from './UI';
import { motion } from 'motion/react';
import { apiClient } from '../api/client';

interface QuickAccessCardProps {
  title: string;
  image: string;
  index: number;
  type?: 'liked' | 'playlist' | 'artist' | 'album';
  id?: string;
  onHoverChange?: (playlistName: string | null) => void;
}

export function QuickAccessCard({ title, image, index, type = 'playlist', id, onHoverChange }: QuickAccessCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { setCurrentTrack, togglePlay, currentTrack, isPlaying: globalIsPlaying, openPlaylist, openArtistView } = usePlayer();
  const { animations } = useSettings();
  const isCurrentTrack = currentTrack?.playlistTitle === title;
  const isPlaying = isCurrentTrack && globalIsPlaying;

  const handleCardClick = async () => {
    if (type === 'artist') {
      openArtistView({ id, name: title });
    } else if (type === 'album' && id) {
      // Загружаем данные альбома для получения правильного типа
      try {
        const albums = await apiClient.getAlbums({ limit: 1000 });
        const album = albums.find(a => a.id === id);
        const albumType = album?.type === 'album' ? 'album' : 'single';
        openPlaylist({ 
          title, 
          artist: album?.artist?.name || 'Альбом', 
          image, 
          type: albumType,
          albumId: id,
          albumType: albumType,
        });
      } catch (error) {
        console.error('Error loading album:', error);
        // Fallback на 'album' если не удалось загрузить
        openPlaylist({ 
          title, 
          artist: 'Альбом', 
          image, 
          type: 'album',
          albumId: id,
          albumType: 'album',
        });
      }
    } else {
      openPlaylist({ title, artist: 'Your playlist', image, type });
    }
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Для "Liked Songs" открываем плейлист
    if (title === 'Liked Songs') {
      openPlaylist({
        title: 'Liked Songs',
        artist: 'Ваши любимые треки',
        image: '',
        type: 'liked',
      });
      return;
    }
    
    // Для артистов и альбомов из БД просто открываем их
    if (type === 'artist' && id) {
      openArtistView({ id, name: title });
      return;
    }
    
    if (type === 'album' && id) {
      // Загружаем данные альбома для получения правильного типа
      try {
        const albums = await apiClient.getAlbums({ limit: 1000 });
        const album = albums.find(a => a.id === id);
        const albumType = album?.type === 'album' ? 'album' : 'single';
        openPlaylist({ 
          title, 
          artist: album?.artist?.name || 'Альбом', 
          image, 
          type: albumType,
          albumId: id,
          albumType: albumType,
        });
      } catch (error) {
        console.error('Error loading album:', error);
        // Fallback на 'album' если не удалось загрузить
        openPlaylist({ 
          title, 
          artist: 'Альбом', 
          image, 
          type: 'album',
          albumId: id,
          albumType: 'album',
        });
      }
      return;
    }
    
    const tracks: any[] = [];
    if (!tracks || tracks.length === 0) {
      // Если треков нет, открываем плейлист/артиста
      if (type === 'artist') {
        openArtistView({ id, name: title });
      } else {
        openPlaylist({ title, artist: 'Your playlist', image, type });
      }
      return;
    }
    
    const firstTrack = tracks[0];
    const isCurrentPlaylistPlaying = currentTrack?.playlistTitle === title;
    
    if (isCurrentPlaylistPlaying && globalIsPlaying) {
      togglePlay();
    } else {
      // Play first track from this playlist/artist
      setCurrentTrack(firstTrack, title);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverChange?.(title);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange?.(null);
  };

  // Get glow color based on playlist type - Spotify-style
  const getGlowColor = () => {
    if (title === 'Liked Songs') {
      return 'linear-gradient(135deg, rgba(167, 139, 250, 0.25) 0%, rgba(236, 72, 153, 0.20) 100%)';
    }
    if (title === 'This Is Yeat') {
      return 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.20) 100%)';
    }
    if (title === 'Travis Scott') {
      return 'linear-gradient(135deg, rgba(251, 146, 60, 0.25) 0%, rgba(249, 115, 22, 0.20) 100%)';
    }
    if (title === 'Daily Mix 1') {
      return 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.20) 100%)';
    }
    if (title === 'Kendrick Lamar') {
      return 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.20) 100%)';
    }
    if (title === 'Chill Hits') {
      return 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.20) 100%)';
    }
    return 'linear-gradient(90deg, rgba(255, 255, 255, 0.10), transparent)';
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      className="group cursor-pointer"
      style={animations ? {
        opacity: 0,
        animation: `fadeInScale 0.4s ease-out ${index * 0.05}s forwards`,
      } : {
        opacity: 1,
      }}
    >
      {animations && (
        <style>{`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      )}
      <div 
        className="glass-card rounded-2xl p-3 sm:p-4 fast-transition gpu-accelerated hover:scale-[1.03] hover:-translate-y-0.5 flex items-center gap-3 sm:gap-4 relative overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Hover indicator with Spotify-style color glow */}
        <div
          className="absolute inset-0 pointer-events-none fast-transition gpu-accelerated"
          style={{ 
            background: getGlowColor(),
            opacity: isHovered ? 1 : 0
          }}
        />

        {/* Cover with modern glass frame */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 relative">
          <div className="glass rounded-xl p-0.5 sm:p-1 h-full group-hover:bg-white/10 fast-transition">
            <div className="rounded-lg overflow-hidden h-full relative">
              {type === 'liked' ? (
                <div 
                  className="w-full h-full flex items-center justify-center relative overflow-hidden fast-transition gpu-accelerated"
                  style={{ 
                    background: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 50%, #00F5FF 100%)',
                    transform: isHovered ? 'scale(1.08) translateZ(0)' : 'scale(1) translateZ(0)'
                  }}
                >
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white relative z-10" />
                </div>
              ) : (
                <img 
                  src={image} 
                  alt={title} 
                  className="w-full h-full object-cover fast-transition gpu-accelerated"
                  style={{
                    transform: isHovered ? 'scale(1.15) translateZ(0)' : 'scale(1) translateZ(0)'
                  }}
                />
              )}
              
              {/* Gradient overlay on hover */}
              {type !== 'liked' && (
                <div 
                  className="absolute inset-0 fast-transition gpu-accelerated"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    opacity: isHovered ? 0.5 : 0
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Title and visualizer */}
        <div className="flex-1 flex items-center gap-3 relative z-10 min-w-0 pr-2">
          <p 
            className="font-bold truncate transition-colors duration-300"
            style={{
              color: '#ffffff',
            }}
          >
            {title}
          </p>
          {isPlaying && (
            <div 
              className="flex-shrink-0"
              style={{ opacity: 1, transform: 'scale(1)', transition: 'all 0.2s' }}
            >
              <MusicVisualizer />
            </div>
          )}
        </div>

        {/* Play button - unified Spotify style - показываем только если есть треки или это "Liked Songs" */}
        {(title === 'Liked Songs') && (
        <motion.div
          className="flex-shrink-0 absolute right-2 z-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
              opacity: isHovered || isPlaying ? 1 : 0,
              scale: isHovered || isPlaying ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={handlePlay}
        >
              <motion.button 
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center pointer-events-auto"
                style={{
                  background: '#1ED760',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black fill-black" />
                ) : (
                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                )}
              </motion.button>
        </motion.div>
        )}
      </div>
    </div>
  );
}
