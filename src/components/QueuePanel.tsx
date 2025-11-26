import { motion } from 'motion/react';
import { X, GripVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePlayer } from './PlayerContext';
import { useSettings } from './SettingsContext';
import { formatTime } from '../utils/time';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { currentTrack, setCurrentTrack, queue, removeFromQueue, getNextTrackFromPlaylist } = usePlayer();
  const { t } = useSettings();
  const [width, setWidth] = useState(360);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(360);

  if (!isOpen) return null;

  // Проверяем, что currentTrack существует перед рендерингом
  if (!currentTrack) {
    return null;
  }

  // Next track: сначала из очереди, потом из плейлиста
  const nextTrack = queue.length > 0 ? queue[0] : getNextTrackFromPlaylist();
  
  // Rest of queue (after next track)
  const upcomingTracks = queue.length > 1 ? queue.slice(1, 10) : [];

  // Resize handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      // Max 33% of viewport width like Spotify, min 300px
      const maxWidth = Math.min(500, window.innerWidth * 0.33);
      const newWidth = Math.max(300, Math.min(maxWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Prevent text selection while dragging
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <>
      {/* Resize Handle */}
      <div
        className="flex-shrink-0 relative group cursor-col-resize select-none z-10"
        style={{ width: '12px' }}
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      >
        {/* Visual separator line with glow on hover */}
        <div 
          className="absolute left-1/2 top-0 bottom-0 transition-all duration-200"
          style={{
            width: isDragging ? '2px' : '1px',
            transform: 'translateX(-50%)',
            background: isDragging 
              ? 'rgba(30, 215, 96, 0.8)'
              : 'rgba(255, 255, 255, 0.1)',
            boxShadow: isDragging 
              ? '0 0 12px rgba(30, 215, 96, 0.6), 0 0 24px rgba(30, 215, 96, 0.3)'
              : 'none',
          }}
        />
        
        {/* Grip indicator */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg p-1.5"
          style={{
            background: 'rgba(24, 24, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          }}
        >
          <GripVertical 
            size={14} 
            className="transition-colors duration-200"
            style={{ 
              color: isDragging ? '#1ED760' : '#b3b3b3',
            }} 
          />
        </div>
        
        {/* Invisible hover area expansion for easier grab */}
        <div className="absolute inset-0 -left-3 -right-3" />
      </div>

      {/* Queue Panel */}
      <div 
        className="flex-shrink-0 flex flex-col h-full overflow-hidden"
        style={{ 
          width: `${width}px`,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-3 flex items-center justify-between border-b border-white/5">
        <h2 
          className="tracking-tight" 
          style={{ 
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: '700',
          }}
        >
          {t('queue')}
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: '#b3b3b3' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5 scrollbar-hide">
        <>
            {/* Current Track Section */}
            <div>
              <h3 
                className="mb-3 tracking-tight uppercase" 
                style={{ 
                  color: '#b3b3b3',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                }}
              >
                {t('nowPlaying')} {currentTrack.playlistTitle ? `${t('playingFrom')} ${currentTrack.playlistTitle}` : ''}
              </h3>
              
              {/* Large Cover */}
              <div className="relative mb-3 rounded-lg overflow-hidden">
                <img
                  src={currentTrack.image}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover"
                  style={{
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  }}
                />
              </div>

              {/* Track Info */}
              <div className="space-y-1">
                <h4 
                  className="tracking-tight" 
                  style={{ 
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    lineHeight: '1.4',
                  }}
                >
                  {currentTrack.title}
                </h4>
                <p 
                  className="tracking-tight" 
                  style={{ 
                    color: '#b3b3b3',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: '1.4',
                  }}
                >
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Next in Queue Section */}
            {nextTrack && (
              <div>
                <h3 
                  className="mb-2 tracking-tight uppercase" 
                  style={{ 
                    color: '#b3b3b3',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                  }}
                >
                  {t('nextUp')}
                </h3>
                
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                  onClick={() => {
                    setCurrentTrack(nextTrack, nextTrack.playlistTitle || '');
                    removeFromQueue(0);
                    // setCurrentTrack автоматически запускает воспроизведение
                  }}
                >
                  {/* Small Cover */}
                  <img
                    src={nextTrack.image}
                    alt={nextTrack.title}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                    style={{
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    }}
                  />

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="tracking-tight truncate" 
                      style={{ 
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '500',
                        lineHeight: '1.4',
                      }}
                    >
                      {nextTrack.title}
                    </h4>
                    <p 
                      className="truncate" 
                      style={{ 
                        color: '#b3b3b3',
                        fontSize: '13px',
                        fontWeight: '400',
                        lineHeight: '1.4',
                        marginTop: '2px'
                      }}
                    >
                      {nextTrack.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs flex-shrink-0" style={{ color: '#7a7a7a' }}>
                    {formatTime(nextTrack.duration || 0)}
                  </span>
                </motion.div>
              </div>
            )}

            {/* Rest of Queue */}
            {upcomingTracks.length > 0 && (
              <div>
                <h3 
                  className="mb-2 tracking-tight uppercase" 
                  style={{ 
                    color: '#b3b3b3',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                  }}
                >
                  {t('nextUp')}
                </h3>
                
                <div className="space-y-1">
                  {upcomingTracks.map((track, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setCurrentTrack(track, track.playlistTitle || '');
                        removeFromQueue(idx + 1);
                        // setCurrentTrack автоматически запускает воспроизведение
                      }}
                    >
                      {/* Small Cover */}
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="tracking-tight truncate" 
                          style={{ 
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '500',
                            lineHeight: '1.4',
                          }}
                        >
                          {track.title}
                        </h4>
                        <p 
                          className="truncate" 
                          style={{ 
                            color: '#b3b3b3',
                            fontSize: '13px',
                            fontWeight: '400',
                            lineHeight: '1.4',
                            marginTop: '2px'
                          }}
                        >
                          {track.artist}
                        </p>
                      </div>

                      {/* Duration */}
                      <span className="text-xs flex-shrink-0" style={{ color: '#7a7a7a' }}>
                        {formatTime(track.duration || 0)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
        </>
      </div>
      </div>
    </>
  );
}
