import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Heart, Plus, User, Disc } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { useSettings } from './SettingsContext';
import { motion, AnimatePresence } from 'motion/react';

interface TrackMenuProps {
  track: {
    id?: string;
    title: string;
    artist: string;
    image?: string;
    album?: string;
    albumId?: string;
    audioUrl?: string;
    duration?: number;
    genre?: string;
    playlistTitle?: string;
  };
  onClose?: () => void;
}

export function TrackMenu({ track, onClose }: TrackMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ left: string; top: string }>({ left: '0', top: '0' });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { toggleLike, isLiked, addToQueue, openArtistView, openPlaylist, closePlaylist } = usePlayer();
  const { t, animations } = useSettings();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Определяем позицию меню
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = 200; // Ширина меню
      
      // Позиционируем вплотную к кнопке справа (без отступов)
      let left = rect.right;
      
      // Если не помещается справа, открываем слева вплотную
      if (left + menuWidth > viewportWidth) {
        left = rect.left - menuWidth; // Вплотную слева от кнопки
        // Если и слева не помещается, прижимаем к правому краю экрана
        if (left < 0) {
          left = viewportWidth - menuWidth;
        }
      }
      
      // Вертикально всегда выравниваем по верхнему краю кнопки, без смещений
      const top = rect.top;
      
      setMenuStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAddToLiked = () => {
    toggleLike(track.id || track.title);
    setIsOpen(false);
    onClose?.();
  };

  const handleAddToQueue = async () => {
    // Если есть полные данные трека, используем их
    if (track.id && track.audioUrl && track.duration) {
      addToQueue({
        id: track.id,
        title: track.title,
        artist: track.artist,
        image: track.image || '',
        genre: track.genre || 'Unknown',
        duration: track.duration,
        audioUrl: track.audioUrl,
        playlistTitle: track.playlistTitle || '',
      });
    } else if (track.id) {
      // Если нет полных данных, загружаем их
      try {
        const { apiClient } = await import('../api/client');
        const { resolveAudioUrl } = await import('../utils/media');
        const response = await apiClient.getTrackById(track.id);
        const apiTrack = response.track as any;
        
        addToQueue({
          id: apiTrack.id,
          title: apiTrack.title,
          artist: apiTrack.artist?.name || track.artist,
          image: apiTrack.coverUrl || apiTrack.coverPath || track.image || '',
          genre: apiTrack.genre?.name || 'Unknown',
          duration: apiTrack.duration || 0,
          audioUrl: resolveAudioUrl(apiTrack.audioUrl || apiTrack.audioPath),
          playlistTitle: track.playlistTitle || '',
        });
      } catch (error) {
        console.error('Error loading track for queue:', error);
        // Fallback: добавляем с доступными данными
        addToQueue({
          id: track.id || '',
          title: track.title,
          artist: track.artist,
          image: track.image || '',
          genre: track.genre || 'Unknown',
          duration: track.duration || 0,
          audioUrl: track.audioUrl || '',
          playlistTitle: track.playlistTitle || '',
        });
      }
    } else {
      // Если нет ID, добавляем с доступными данными
      addToQueue({
        id: track.id || '',
        title: track.title,
        artist: track.artist,
        image: track.image || '',
        genre: track.genre || 'Unknown',
        duration: track.duration || 0,
        audioUrl: track.audioUrl || '',
        playlistTitle: track.playlistTitle || '',
      });
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleGoToArtist = () => {
    closePlaylist();
    openArtistView(track.artist);
    setIsOpen(false);
    onClose?.();
  };

  const handleGoToAlbum = async () => {
    if (track.albumId) {
      try {
        const { apiClient } = await import('../api/client');
        const albums = await apiClient.getAlbums({ limit: 1000 });
        const album = albums.find((a: any) => a.id === track.albumId);
        if (album) {
          const albumType = album.type === 'album' ? 'album' : 'single';
          closePlaylist();
          openPlaylist({
            title: album.title,
            artist: `${album.year ? `${album.year} • ` : ''}${album.artist?.name || track.artist}`,
            image: album.coverUrl || album.coverPath || '',
            type: albumType,
            albumId: album.id,
            albumType: albumType,
          });
        }
      } catch (error) {
        console.error('Error loading album:', error);
      }
    }
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/70 hover:text-white p-1"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isOpen && buttonRef.current && (
          <motion.div
            ref={menuRef}
            initial={animations ? { opacity: 0, scale: 0.95 } : false}
            animate={animations ? { opacity: 1, scale: 1 } : false}
            exit={animations ? { opacity: 0, scale: 0.95 } : false}
            transition={animations ? { duration: 0.15 } : { duration: 0 }}
            className="fixed z-[10001] min-w-[200px] rounded-lg shadow-2xl overflow-hidden border border-white/10"
            style={{
              backgroundColor: '#1f1f1f',
              opacity: 1,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
              ...menuStyle,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={handleAddToLiked}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isLiked(track.id || track.title) ? 'fill-[#1ED760] text-[#1ED760]' : ''}`} />
                <span>{isLiked(track.id || track.title) ? t('removeFromLiked') : t('addToLiked')}</span>
              </button>
              
              <button
                onClick={handleAddToQueue}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addToQueue')}</span>
              </button>
              
              <button
                onClick={handleGoToArtist}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{t('goToArtist')}</span>
              </button>
              
              {track.albumId && (
                <button
                  onClick={handleGoToAlbum}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                  <Disc className="w-4 h-4" />
                  <span>{t('goToAlbum')}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

