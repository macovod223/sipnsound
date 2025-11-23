import { Play, Pause } from 'lucide-react';
import { useState } from 'react';
import { usePlayer, playlistsData } from './PlayerContext';
import { useSettings } from './SettingsContext';
import { MusicVisualizer } from './UI';
import { motion } from 'motion/react';

interface PlaylistCardProps {
  title: string;
  artist: string;
  image: string;
  index: number;
  size?: 'normal' | 'large';
  onHoverChange?: (playlistName: string | null) => void;
}

export function PlaylistCard({ title, artist, image, index, size = 'normal', onHoverChange }: PlaylistCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { setCurrentTrack, togglePlay, currentTrack, isPlaying: globalIsPlaying, openPlaylist } = usePlayer();
  const { animations } = useSettings();
  const isCurrentTrack = currentTrack?.playlistTitle === title;
  const isPlaying = isCurrentTrack && globalIsPlaying;

  const handleCardClick = () => {
    openPlaylist({ title, artist, image });
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get first track from this playlist
    const tracks = playlistsData[title];
    if (!tracks || tracks.length === 0) return;
    
    const firstTrack = tracks[0];
    const isCurrentPlaylistPlaying = currentTrack?.playlistTitle === title;
    
    if (isCurrentPlaylistPlaying && globalIsPlaying) {
      togglePlay();
    } else {
      // Play first track from this playlist
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

  // Get glow color based on index for variety
  const getGlowColor = () => {
    const colors = [
      'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(79, 70, 229, 0.18) 100%)', // Indigo
      'linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(219, 39, 119, 0.18) 100%)', // Pink
      'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.18) 100%)', // Emerald
      'linear-gradient(135deg, rgba(251, 146, 60, 0.22) 0%, rgba(249, 115, 22, 0.18) 100%)', // Orange
      'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(124, 58, 237, 0.18) 100%)', // Purple
      'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(37, 99, 235, 0.18) 100%)', // Blue
      'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(220, 38, 38, 0.18) 100%)', // Red
      'linear-gradient(135deg, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.18) 100%)', // Amber
      'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(13, 148, 136, 0.18) 100%)', // Teal
      'linear-gradient(135deg, rgba(217, 70, 239, 0.22) 0%, rgba(192, 38, 211, 0.18) 100%)', // Fuchsia
      'linear-gradient(135deg, rgba(132, 204, 22, 0.22) 0%, rgba(101, 163, 13, 0.18) 100%)', // Lime
    ];
    return colors[index % colors.length];
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      className="group relative cursor-pointer"
      style={animations ? {
        opacity: 0,
        animation: `fadeInUp 0.5s ease-out ${index * 0.05}s forwards`,
      } : {
        opacity: 1,
      }}
    >
      {animations && (
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      )}
      <div 
        className={`glass-card rounded-3xl p-4 sm:p-5 gpu-accelerated fast-transition hover:scale-[1.03] hover:-translate-y-1 relative overflow-hidden ${
          size === 'large' ? 'h-[240px]' : ''
        }`}
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
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

        <div className="relative mb-4">
          {/* Cover image with modern glass frame */}
          <div className={`relative ${size === 'large' ? 'h-40' : 'aspect-square'}`}>
            <div className="glass rounded-2xl p-1 sm:p-1.5 h-full group-hover:bg-white/10 fast-transition">
              <div className="relative rounded-xl overflow-hidden h-full">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover gpu-accelerated fast-transition"
                  style={{
                    transform: isHovered ? 'scale(1.08) translateZ(0)' : 'scale(1) translateZ(0)'
                  }}
                />
                
                {/* Gradient overlay on hover */}
                <div 
                  className="absolute inset-0 fast-transition gpu-accelerated"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)',
                    opacity: isHovered ? 0.6 : 0
                  }}
                />
              </div>
            </div>

            {/* Play button - unified Spotify style */}
            <motion.div
              className="absolute bottom-2 right-2"
              initial={{ opacity: 0, scale: 0, y: 8 }}
              animate={{
                opacity: isHovered || isPlaying ? 1 : 0,
                scale: isHovered || isPlaying ? 1 : 0,
                y: isHovered || isPlaying ? 0 : 8,
              }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.button 
                onClick={handlePlay}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: '#1ED760',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
                ) : (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-0.5" />
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
        
        {/* Card content */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <h3 
              className="font-bold truncate transition-colors duration-300 flex-1"
              style={{
                color: '#ffffff',
              }}
            >
              {title}
            </h3>
            {isPlaying && (
              <div style={{ opacity: 1, transform: 'scale(1)', transition: 'all 0.2s' }}>
                <MusicVisualizer />
              </div>
            )}
          </div>
          <p 
            className="text-sm truncate line-clamp-2 leading-relaxed"
            style={{ 
              color: '#b3b3b3',
            }}
          >
            {artist}
          </p>
        </div>
      </div>
    </div>
  );
}
