import { Play, Pause, SkipForward, SkipBack, Volume2, Maximize2, Heart, Repeat, Shuffle } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { formatTime } from '../utils/time';

interface NowPlayingProps {
  onQueueToggle: () => void;
  isQueueOpen: boolean;
}

// Spotify Queue icon - вертикальный планшет с play
const QueueIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Прямоугольник (вертикальный планшет) */}
    <rect 
      x="3" 
      y="1" 
      width="10" 
      height="14" 
      rx="1.2" 
      stroke="currentColor" 
      strokeWidth="1.5"
    />
    {/* Play треугольник */}
    <path 
      d="M6.5 5.5L10.5 8L6.5 10.5V5.5Z" 
      fill="currentColor"
    />
  </svg>
);

export function NowPlaying({ onQueueToggle, isQueueOpen }: NowPlayingProps) {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    toggleFullscreen, 
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    previousTrack,
    toggleLike,
    isLiked,
    openArtistView,
    closePlaylist,
  } = usePlayer();

  if (!currentTrack) return null;

  const progress = (currentTime / duration) * 100;

  return (
    <div
      className="glass-card rounded-2xl sm:rounded-3xl px-3 sm:px-4 py-3 relative overflow-hidden"
      style={{
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        background: 'rgba(24, 24, 24, 0.9)',
      }}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4 relative z-10">
        {/* Left: Track info */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 max-w-[30%]">
          {/* Album art */}
          <div className="flex-shrink-0">
            <img 
              src={currentTrack.image} 
              alt="Now playing"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover"
            />
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm truncate mb-1"
              style={{ 
                color: '#ffffff',
              }}
            >
              {currentTrack.title}
            </p>
            <button
              onClick={() => {
                if (currentTrack?.artist) {
                  openArtistView(currentTrack.artist);
                  closePlaylist();
                }
              }}
              className="text-xs truncate hover:underline text-left block w-full"
              style={{ color: '#b3b3b3' }}
            >
              {currentTrack.artist}
            </button>
          </div>

          {/* Like button - hidden on mobile */}
          <button 
            onClick={() => currentTrack && toggleLike(currentTrack.title)}
            className="hidden md:flex w-8 h-8 items-center justify-center instant-transition gpu-accelerated hover:scale-110" 
            style={{ color: currentTrack && isLiked(currentTrack.title) ? '#1ED760' : '#b3b3b3' }} 
            title="Like"
          >
            <Heart 
              className="w-5 h-5" 
              fill={currentTrack && isLiked(currentTrack.title) ? '#1ED760' : 'none'}
            />
          </button>
        </div>

        {/* Center: Player controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%]">
          {/* Control buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Shuffle - hidden on mobile */}
            <button 
              onClick={toggleShuffle}
              className={`hidden sm:flex w-8 h-8 items-center justify-center instant-transition gpu-accelerated hover:scale-110 ${
                shuffle ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
              style={shuffle ? { color: '#1ED760' } : { color: '#b3b3b3' }}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button 
              onClick={previousTrack}
              className="w-8 h-8 flex items-center justify-center instant-transition gpu-accelerated hover:scale-110 hover:opacity-100" 
              style={{ color: '#b3b3b3', opacity: 0.8 }}
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={togglePlay}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center instant-transition gpu-accelerated hover:scale-105"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-black fill-black" />
              ) : (
                <Play className="w-5 h-5 text-black fill-black ml-0.5" style={{ fill: '#000', color: '#000' }} />
              )}
            </button>

            {/* Next */}
            <button 
              onClick={nextTrack}
              className="w-8 h-8 flex items-center justify-center instant-transition gpu-accelerated hover:scale-110 hover:opacity-100" 
              style={{ color: '#b3b3b3', opacity: 0.8 }}
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Repeat - hidden on mobile */}
            <button 
              onClick={toggleRepeat}
              className={`hidden sm:flex w-8 h-8 items-center justify-center instant-transition gpu-accelerated hover:scale-110 ${
                repeat ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
              style={repeat ? { color: '#1ED760' } : { color: '#b3b3b3' }}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[10px] sm:text-xs tabular-nums" style={{ color: '#b3b3b3' }}>
              {formatTime(currentTime)}
            </span>
            <div 
              className="flex-1 rounded-full h-1 overflow-hidden cursor-pointer group relative"
              style={{ background: '#4d4d4d' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(percentage * duration);
              }}
            >
              <div 
                className="h-full rounded-full relative" 
                style={{ 
                  width: `${progress}%`,
                  background: '#ffffff',
                }}
              >
                {/* Thumb that appears on hover - скрыт */}
                <div 
                  className="hidden"
                  style={{ transform: 'translate(50%, -50%)' }}
                />
              </div>
            </div>
            <span className="text-[10px] sm:text-xs tabular-nums" style={{ color: '#b3b3b3' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Additional controls */}
        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-[30%] justify-end">
          {/* Queue button - Spotify style */}
          <button 
            onClick={onQueueToggle}
            className="w-8 h-8 flex items-center justify-center instant-transition gpu-accelerated hover:scale-110"
            style={isQueueOpen ? { 
              color: '#1ED760'
            } : { 
              color: '#b3b3b3'
            }}
            title="Queue"
          >
            <QueueIcon className="w-4 h-4" />
          </button>

          {/* Volume - Spotify style slider */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" style={{ color: volume > 0 ? '#ffffff' : '#b3b3b3', transition: 'color 0.2s' }} />
            <div 
              className="w-24 rounded-full h-1 overflow-hidden cursor-pointer group relative"
              style={{ background: '#4d4d4d' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const updateVolume = (clientX: number) => {
                  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                  const percentage = (x / rect.width) * 100;
                  setVolume(Math.max(0, Math.min(100, percentage)));
                };
                
                updateVolume(e.clientX);
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  updateVolume(moveEvent.clientX);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = (x / rect.width) * 100;
                setVolume(Math.max(0, Math.min(100, percentage)));
              }}
            >
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${volume}%`,
                  background: '#ffffff',
                  }}
                />
            </div>
          </div>

          {/* Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center instant-transition gpu-accelerated hover:scale-110"
            style={{ color: '#b3b3b3' }}
            title="Полноэкранный режим"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
