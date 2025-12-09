import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';
import { resolveMediaUrl as resolveMediaPath } from '@/utils/media';

const FALLBACK_TRACK_IMAGE = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';

export interface LyricLine {
  time: number;
  text: string;
}

export interface Track {
  id?: string;
  title: string;
  artist: string;
  image: string;
  genre: string;
  duration?: number;
  lyrics?: LyricLine[];
  playlistTitle?: string;
  audioUrl?: string;
  lyricsUrl?: string;
  playsCount?: number;
}

export interface Playlist {
  id?: string;
  title: string;
  artist: string;
  image: string;
  type?: 'liked' | 'playlist' | 'album' | 'single' | 'dj';
  albumId?: string;
  albumType?: 'album' | 'single';
  returnTo?: 'playlists' | 'albums' | 'browse';
  returnToArtistTab?: 'tracks' | 'albums' | 'singles';
}

interface SelectedArtist {
  id?: string;
  name: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isFullscreen: boolean;
  dominantColor: string;
  colorPalette: string[];
  textColor: string;
  textShadow: string;
  currentTime: number;
  duration: number;
  selectedPlaylist: Playlist | null;
  likedTracks: Set<string>;
  likedTracksList: Track[];
  selectedArtist: SelectedArtist | null;
  libraryReturnCategory: 'browse' | 'playlists' | 'albums' | null;
  artistReturnTab: 'tracks' | 'albums' | 'singles' | null;
  setCurrentTrack: (track: Track, playlistName?: string) => void;
  togglePlay: () => void;
  toggleFullscreen: () => void;
  extractColorFromImage: (imageUrl: string) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  openPlaylist: (playlist: Playlist) => void;
  closePlaylist: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleLike: (trackTitle: string) => void;
  isLiked: (trackTitle: string) => boolean;
  openArtistView: (artist: string | SelectedArtist) => void;
  closeArtistView: () => void;
  apiTracks: Track[];
  isLoadingTracks: boolean;
  loadTracksFromAPI: () => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  currentPlaylistTracks: Track[];
  setCurrentPlaylistTracks: (tracks: Track[]) => void;
  getNextTrackFromPlaylist: () => Track | null;
  // Playback engine state
  forcePlayNext: (track?: Track | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const coerceNumber = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toLyricLine = (line: any): LyricLine => ({
  time: coerceNumber(line?.time),
  text: typeof line?.text === 'string' ? line.text : '',
});

const normalizeLyricsInput = (raw: any): LyricLine[] => {
  if (!raw) {
    return [];
  }

  let source = raw;

  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (Array.isArray(source)) {
    const normalizedLines = (source as any[]).map(toLyricLine);
    return normalizedLines
      .filter((line) => line.text.trim().length > 0)
      .sort((a, b) => a.time - b.time);
  }

  if (typeof source === 'object' && Array.isArray(source.lines)) {
    const normalizedLines = (source.lines as any[]).map(toLyricLine);
    return normalizedLines
      .filter((line) => line.text.trim().length > 0)
      .sort((a, b) => a.time - b.time);
  }

  return [];
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { t, crossfade: crossfadeEnabled, crossfadeDuration, gapless } = useSettings();
  const { isAuthenticated } = useAuth();
  
  // Обёртка для записи истории прослушиваний
  const recordPlayHistory = useCallback(async (trackId: string) => {
    if (!isAuthenticated || !trackId) return;
    try {
      await apiClient.recordPlayHistory(trackId);
    } catch (error) {
      // Ошибки логируются в apiClient
    }
  }, [isAuthenticated]);
  
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dominantColor, setDominantColor] = useState('#000000');
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textShadow, setTextShadow] = useState('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 default
  const [volume, setVolume] = useState(100);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [likedTracksList, setLikedTracksList] = useState<Track[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<SelectedArtist | null>(null);
  const [libraryReturnCategory, setLibraryReturnCategory] = useState<'browse' | 'playlists' | 'albums' | null>(null);
  const [artistReturnTab, setArtistReturnTab] = useState<'tracks' | 'albums' | 'singles' | null>(null);
  const [apiTracks, setApiTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);
  const [shuffledPlaylistIndex, setShuffledPlaylistIndex] = useState(0); // Индекс текущей позиции в перемешанном плейлисте
  const [currentPlaylistTracks, setCurrentPlaylistTracks] = useState<Track[]>([]);
  
  const timeIntervalRef = useRef<number | null>(null);
  
  // Два аудио-плеера для crossfade
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef2 = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<'audio1' | 'audio2'>('audio1');
  const isCrossfading = useRef(false);
  const crossfadeAnimationRef = useRef<number | null>(null);
  // Ref для хранения fromAudio во время кроссфейда, чтобы защитить его от изменений
  const fromAudioRef = useRef<HTMLAudioElement | null>(null);
  const fromAudioSrcRef = useRef<string>('');
  
  // Инициализируем audio элементы сразу при монтировании
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef2.current = new Audio();
  }
  
  const lastVolumeToastRef = useRef<number>(60);
  const volumeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lyricsCacheRef = useRef<Map<string, LyricLine[]>>(new Map());

  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const nextTrackRef = useRef<() => void>(() => {});
  const shouldAutoPlayRef = useRef(false);
  const skipAudioLoadRef = useRef(false);
  const gaplessNextTrackRef = useRef<Track | null>(null);
  const gaplessEnabledRef = useRef(gapless);
  const gaplessPreparedTrackIdRef = useRef<string | null>(null);
  // Ref для хранения последнего значения currentTime (для синхронизации при play)
  const lastSeekedTimeRef = useRef<number>(0);
  const crossfadeDurationRef = useRef<number>(crossfadeDuration);
  useEffect(() => {
    gaplessEnabledRef.current = gapless;
    if (!gapless) {
      gaplessNextTrackRef.current = null;
      gaplessPreparedTrackIdRef.current = null;
    }
  }, [gapless]);
  useEffect(() => {
    crossfadeDurationRef.current = crossfadeDuration;
  }, [crossfadeDuration]);

  // Получаем активный аудио-элемент
  const getActiveAudio = useCallback(() => {
    return activeAudioRef.current === 'audio1' ? audioRef.current : audioRef2.current;
  }, []);

  const getInactiveAudio = useCallback(() => {
    return activeAudioRef.current === 'audio1' ? audioRef2.current : audioRef.current;
  }, []);

  const cancelCrossfade = useCallback(() => {
    if (crossfadeAnimationRef.current) {
      // Может быть как requestAnimationFrame, так и setInterval
      if (typeof crossfadeAnimationRef.current === 'number') {
        // Это setInterval ID
        clearInterval(crossfadeAnimationRef.current);
      } else {
        // Это requestAnimationFrame ID (на случай, если где-то еще используется)
      cancelAnimationFrame(crossfadeAnimationRef.current);
      }
      crossfadeAnimationRef.current = null;
    }
    isCrossfading.current = false;

    const targetVolume = volume / 100;
    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();

    if (inactiveAudio) {
      inactiveAudio.pause();
      inactiveAudio.src = '';
      inactiveAudio.currentTime = 0;
      inactiveAudio.volume = targetVolume;
    }

    if (activeAudio) {
      activeAudio.volume = targetVolume;
    }
  }, [getActiveAudio, getInactiveAudio, volume]);

  const prepareInactiveForTrack = useCallback((track: Track) => {
    const inactiveAudio = getInactiveAudio();
    if (!inactiveAudio || !track.audioUrl) return false;
    inactiveAudio.src = track.audioUrl;
    inactiveAudio.currentTime = 0;
    inactiveAudio.volume = 0;
    inactiveAudio.preload = 'auto';
    gaplessPreparedTrackIdRef.current = track.id || `${track.title}-${track.artist}`;
    try {
      inactiveAudio.load();
    } catch {
      // ignore
    }
    return true;
  }, [getInactiveAudio]);

  // Функция для плавного crossfade между треками
  const performCrossfade = useCallback((fromAudio: HTMLAudioElement, toAudio: HTMLAudioElement, duration: number, onDone: () => void) => {
    cancelCrossfade();
    
    const targetVolume = volume / 100;
    const safeDuration = Math.max(0, Number(duration) || 0);


    // Если duration == 0, просто моментально переключаемся
    if (safeDuration === 0) {
      fromAudio.pause();
      toAudio.volume = targetVolume;
      activeAudioRef.current = activeAudioRef.current === 'audio1' ? 'audio2' : 'audio1';
      onDone();
      return;
    }

    isCrossfading.current = true;
    const startFromVolume = fromAudio.volume;
    // Сохраняем оригинальный src для восстановления
    const originalFromAudioSrc = fromAudio.src || fromAudioSrcRef.current;
    // Убеждаемся, что toAudio начинается с 0
    toAudio.volume = 0;
    
    let lastUpdateTime = 0;
    
    // Используем setInterval вместо requestAnimationFrame для более простого управления
    const updateInterval = 50; // 50ms = 20 раз в секунду
    const startInterval = Date.now();
    
    const intervalId = setInterval(() => {
      if (!isCrossfading.current) {
        clearInterval(intervalId);
        return;
      }
      
      const elapsed = (Date.now() - startInterval) / 1000;
      const progress = Math.min(elapsed / safeDuration, 1);
      
      // ВАЖНО: Проверяем и восстанавливаем fromAudio, если он потерял src или паузился
      if (progress < 0.95 && isCrossfading.current) {
        // Восстанавливаем src, если он потерялся
        if (!fromAudio.src || fromAudio.src === window.location.href || fromAudio.src.endsWith('/')) {
          if (originalFromAudioSrc && originalFromAudioSrc !== window.location.href && !originalFromAudioSrc.endsWith('/')) {
            fromAudio.src = originalFromAudioSrc;
            try {
              fromAudio.load();
              // Пытаемся возобновить воспроизведение после загрузки
              if (fromAudio.readyState >= 2) {
                fromAudio.play().catch(() => {});
              }
            } catch (e) {
              // Игнорируем ошибки загрузки
            }
          }
        }
        
        // Возобновляем воспроизведение, если fromAudio паузился
        if (fromAudio.paused && fromAudio.src && fromAudio.src !== window.location.href && !fromAudio.src.endsWith('/')) {
          if (fromAudio.readyState >= 2) {
            fromAudio.play().catch(() => {
              // Игнорируем ошибки воспроизведения
            });
          }
        }
      }
      
      // Обновляем громкость: сумма должна быть равна targetVolume (100%)
      const newFromVolume = startFromVolume * (1 - progress);
      const newToVolume = targetVolume * progress;
      fromAudio.volume = newFromVolume;
      toAudio.volume = newToVolume;
      
      
      // Обновляем UI во время кроссфейда - показываем прогресс нового трека
      // Обновляем каждые 0.05 секунды для плавности
      if (elapsed - lastUpdateTime >= 0.05) {
        lastUpdateTime = elapsed;
        const newTime = toAudio.currentTime || 0;
        setCurrentTime(newTime);
        if (toAudio.duration && !Number.isNaN(toAudio.duration) && toAudio.duration > 0) {
          setDuration(toAudio.duration);
        }
      }
      
      if (progress >= 1 || !isCrossfading.current) {
        clearInterval(intervalId);
        crossfadeAnimationRef.current = null;
        // НЕ паузим fromAudio сразу - пусть он продолжает играть до полного затухания
        // fromAudio.pause() будет вызван в onDone после обновления состояния
        fromAudio.volume = 0;
        toAudio.volume = targetVolume;
        isCrossfading.current = false;
        // activeAudioRef уже переключен до начала кроссфейда
        onDone();
      }
    }, updateInterval);
    
    crossfadeAnimationRef.current = intervalId as any;
  }, [cancelCrossfade, volume]);

  // Получение следующего трека для crossfade
  const getNextTrackForCrossfade = useCallback(() => {
    // Приоритет: очередь, затем плейлист/шафл, затем API
    if (queue.length > 0) {
      return queue[0];
    }

    const tracks = shuffle && shuffledPlaylist.length > 0 
      ? shuffledPlaylist 
      : currentPlaylistTracks.length > 0 
        ? currentPlaylistTracks 
        : apiTracks;
    
    if (tracks.length === 0) {
      return null;
    }
    
    const currentIdx = shuffle && shuffledPlaylist.length > 0
      ? shuffledPlaylistIndex
      : currentTrackIndex;
    
    const nextIdx = currentIdx + 1;
    const nextTrack = nextIdx < tracks.length ? tracks[nextIdx] : null;
    return nextTrack;
  }, [apiTracks, currentPlaylistTracks, currentTrackIndex, shuffle, shuffledPlaylist, shuffledPlaylistIndex, queue]);

  // Запуск crossfade к следующему треку
  const startCrossfadeToNextTrack = useCallback((currentAudio: HTMLAudioElement, nextTrack: Track, fadeSeconds: number) => {
    
    const inactiveAudio = getInactiveAudio();
    if (!inactiveAudio) {
      console.error('[CROSSFADE] No inactive audio');
      return;
    }
    if (!nextTrack.audioUrl) {
      console.error('[CROSSFADE] No audioUrl');
      return;
    }
    if (isCrossfading.current) {
      return;
    }
    
    cancelCrossfade();
    
    // Подготавливаем неактивный аудио для следующего трека
    if (!prepareInactiveForTrack(nextTrack)) {
      console.error('[CROSSFADE] Failed to prepare inactive audio');
      return;
    }
    
    // Устанавливаем начальную громкость для следующего трека
    inactiveAudio.volume = 0;
    
    // ВАЖНО: устанавливаем флаги кроссфейда САМЫМ ПЕРВЫМ, до любых других операций
    // Это предотвратит вмешательство useEffect в процесс кроссфейда
        skipAudioLoadRef.current = true;
    isCrossfading.current = true;
    
    // Сохраняем ссылку на fromAudio (старое активное аудио) ДО любых изменений
    // Это гарантирует, что мы сможем продолжить его воспроизведение
    const fromAudio = currentAudio;
    // Сохраняем в ref для защиты от изменений
    fromAudioRef.current = fromAudio;
    fromAudioSrcRef.current = fromAudio.src;
    
    
    // Функция для начала воспроизведения и кроссфейда
    let playbackStarted = false;
    const startPlayback = () => {
      if (playbackStarted) {
        return;
      }
      playbackStarted = true;
      
      // Проверяем настройку gapless: если она выключена, не запускаем трек автоматически при кроссфейде
      // Но если она включена, запускаем автоматически
      if (!gapless) {
        // Не запускаем трек автоматически, но все равно продолжаем кроссфейд
        // (старый трек будет затухать, новый будет на паузе)
        // Переключаем активный аудио элемент
        activeAudioRef.current = activeAudioRef.current === 'audio1' ? 'audio2' : 'audio1';
        
        // ВАЖНО: НЕ обновляем currentTrack во время кроссфейда!
        // Обновим currentTrack только ПОСЛЕ завершения кроссфейда
        
        // Запускаем кроссфейд (старый трек затухает, новый остается на паузе)
        performCrossfade(fromAudio, inactiveAudio, fadeSeconds, async () => {
          // ТЕПЕРЬ обновляем currentTrack ПОСЛЕ завершения кроссфейда
          // Сначала проверяем, загружены ли lyrics
          let normalizedLyrics = normalizeLyricsInput(nextTrack.lyrics);
          
          // Если lyrics не загружены, пытаемся загрузить их
          if (!normalizedLyrics.length && nextTrack.id) {
            // Проверяем кеш
            if (lyricsCacheRef.current.has(nextTrack.id)) {
              normalizedLyrics = lyricsCacheRef.current.get(nextTrack.id) || [];
            } else {
              // Загружаем lyrics асинхронно
              try {
                const response = await apiClient.getTrackLyrics(nextTrack.id);
                const parsed = normalizeLyricsInput(response?.lyrics);
                if (parsed.length) {
                  lyricsCacheRef.current.set(nextTrack.id, parsed);
                  normalizedLyrics = parsed;
                }
              } catch (error) {
                // Игнорируем ошибки загрузки lyrics
              }
            }
          }
          
          const coverImage = typeof nextTrack.image === 'string' && nextTrack.image.trim().length
            ? nextTrack.image
            : FALLBACK_TRACK_IMAGE;
          const trackWithLyrics = {
            ...nextTrack,
            image: coverImage,
            lyrics: normalizedLyrics,
            duration: nextTrack.duration || 225,
            playlistTitle: currentPlaylistName || nextTrack.playlistTitle,
          };
          setCurrentTrackState(trackWithLyrics);
          
          const newCurrentTime = inactiveAudio.currentTime || 0;
          const newDuration = !Number.isNaN(inactiveAudio.duration) && inactiveAudio.duration > 0 
            ? inactiveAudio.duration 
            : (nextTrack.duration || 225);
          
          // Паузим старый трек
          fromAudio.pause();
          fromAudio.volume = 0;
          
          // Новый трек остается на паузе (gapless выключен)
          setCurrentTime(newCurrentTime);
          setDuration(newDuration);
          setIsPlaying(false);
          
          // Сбрасываем флаги кроссфейда
          fromAudioRef.current = null;
          fromAudioSrcRef.current = '';
          
          setTimeout(() => {
            isCrossfading.current = false;
          }, 100);
          
          setTimeout(() => {
            skipAudioLoadRef.current = false;
          }, 500);
        });
        return;
      }
      
      // Если gapless включен, запускаем трек автоматически
      inactiveAudio.play().then(() => {
        
        // ВАЖНО: НЕ обновляем currentTrack во время кроссфейда!
        // Это предотвратит срабатывание useEffect, который может сбросить fromAudio.src
        // Обновим currentTrack только ПОСЛЕ завершения кроссфейда
        
        // Переключаем activeAudioRef для UI
        activeAudioRef.current = activeAudioRef.current === 'audio1' ? 'audio2' : 'audio1';
        // Устанавливаем isPlaying в true СРАЗУ
        setIsPlaying(true);
        
        // Запускаем кроссфейд
        performCrossfade(fromAudio, inactiveAudio, fadeSeconds, async () => {
          
          // ТЕПЕРЬ обновляем currentTrack ПОСЛЕ завершения кроссфейда
          // Сначала проверяем, загружены ли lyrics
          let normalizedLyrics = normalizeLyricsInput(nextTrack.lyrics);
          
          // Если lyrics не загружены, пытаемся загрузить их
          if (!normalizedLyrics.length && nextTrack.id) {
            // Проверяем кеш
            if (lyricsCacheRef.current.has(nextTrack.id)) {
              normalizedLyrics = lyricsCacheRef.current.get(nextTrack.id) || [];
            } else {
              // Загружаем lyrics асинхронно
              try {
                const response = await apiClient.getTrackLyrics(nextTrack.id);
                const parsed = normalizeLyricsInput(response?.lyrics);
                if (parsed.length) {
                  lyricsCacheRef.current.set(nextTrack.id, parsed);
                  normalizedLyrics = parsed;
                }
              } catch (error) {
                // Игнорируем ошибки загрузки lyrics
              }
            }
          }
          
          const coverImage = typeof nextTrack.image === 'string' && nextTrack.image.trim().length
            ? nextTrack.image
            : FALLBACK_TRACK_IMAGE;
          const trackWithLyrics = {
            ...nextTrack,
            image: coverImage,
            lyrics: normalizedLyrics,
            duration: nextTrack.duration || 225,
            playlistTitle: currentPlaylistName || nextTrack.playlistTitle,
          };
          
          // Обновляем состояние трека ПОСЛЕ завершения кроссфейда
          setCurrentTrackState(trackWithLyrics);
          
          // После завершения кроссфейда обновляем состояние
          const newCurrentTime = inactiveAudio.currentTime || 0;
          const newDuration = !Number.isNaN(inactiveAudio.duration) && inactiveAudio.duration > 0 
            ? inactiveAudio.duration 
            : (nextTrack.duration || 225);
          
          // Паузим старый трек
          fromAudio.pause();
          fromAudio.volume = 0;
          
          // Убеждаемся, что новый трек продолжает воспроизводиться
          if (inactiveAudio.paused) {
            inactiveAudio.play().catch(() => {
              // Игнорируем ошибки
            });
          }
          
          // Устанавливаем финальное время и длительность
          setCurrentTime(newCurrentTime);
          setDuration(newDuration);
          setIsPlaying(true);
          
          // Дополнительно убеждаемся, что активный аудио элемент воспроизводится
          const finalActiveAudio = getActiveAudio();
          if (finalActiveAudio && finalActiveAudio.paused) {
            finalActiveAudio.play().catch(() => {
              // Игнорируем ошибки
            });
          }
          
          // Сбрасываем флаги кроссфейда
          fromAudioRef.current = null;
          fromAudioSrcRef.current = '';
          
          setTimeout(() => {
            isCrossfading.current = false;
          }, 100);
          
          setTimeout(() => {
            skipAudioLoadRef.current = false;
          }, 500);
      });
    }).catch((error) => {
        console.error('[CROSSFADE] Playback error:', error);
      isCrossfading.current = false;
      fromAudioRef.current = null;
      fromAudioSrcRef.current = '';
        cancelCrossfade();
        // fallback: переключаемся обычным способом
      setCurrentTrack(nextTrack, currentPlaylistName);
      setIsPlaying(true);
    });
  };
    
    // Проверяем готовность трека перед воспроизведением
    if (inactiveAudio.readyState >= 2) {
      startPlayback();
    } else {
      const handleCanPlay = () => {
        startPlayback();
        inactiveAudio.removeEventListener('canplay', handleCanPlay);
        inactiveAudio.removeEventListener('loadeddata', handleLoadedData);
      };
      
      const handleLoadedData = () => {
        if (inactiveAudio.readyState >= 2) {
          startPlayback();
          inactiveAudio.removeEventListener('canplay', handleCanPlay);
          inactiveAudio.removeEventListener('loadeddata', handleLoadedData);
        }
      };
      
      inactiveAudio.addEventListener('canplay', handleCanPlay, { once: true });
      inactiveAudio.addEventListener('loadeddata', handleLoadedData, { once: true });
      
      // Фолбэк таймаут
      setTimeout(() => {
        if (inactiveAudio.readyState >= 2) {
          startPlayback();
        }
        inactiveAudio.removeEventListener('canplay', handleCanPlay);
        inactiveAudio.removeEventListener('loadeddata', handleLoadedData);
      }, 1000);
    }
  }, [getInactiveAudio, prepareInactiveForTrack, volume, cancelCrossfade, performCrossfade, currentPlaylistName, shuffle, shuffledPlaylist, apiTracks, currentPlaylistTracks, likedTracksList, gapless]);


  // Отдельный useEffect для мониторинга crossfade
  useEffect(() => {
    if (!crossfadeEnabled) {
      return;
    }
    if (!currentTrack?.audioUrl) {
      return;
    }
    if (isCrossfading.current) {
      return;
    }
    if (!isPlaying) {
      return;
    }
    
    const activeAudio = getActiveAudio();
    if (!activeAudio) {
      return;
    }
    if (activeAudio.duration <= 0 || Number.isNaN(activeAudio.duration)) {
      return;
    }
    
    const timeRemaining = activeAudio.duration - currentTime;
    
    // Получаем значение из слайдера (1-12 секунд)
    const rawFade = Math.max(0, Number(crossfadeDuration) || 0);
    
    // Адаптивный фейд: не длиннее трека и не короче 1 сек (минимум 1, максимум 12)
    const maxFade = Math.max(1, activeAudio.duration - 0.25);
    const fadeSeconds = Math.min(Math.max(1, rawFade), maxFade);
    
    // Запускаем кроссфейд когда осталось времени <= fadeSeconds
    // Добавляем небольшой буфер (0.1 сек) чтобы не пропустить момент
    // Проверяем что мы еще не запускали кроссфейд для этого трека
    if (timeRemaining > 0 && fadeSeconds > 0 && timeRemaining <= fadeSeconds + 0.1 && timeRemaining > fadeSeconds - 0.2) {
      const nextTrack = getNextTrackForCrossfade();
      if (nextTrack && nextTrack.audioUrl) {
        // Используем реальное значение из слайдера, адаптированное под длительность трека
        startCrossfadeToNextTrack(activeAudio, nextTrack, fadeSeconds);
      }
    }
  }, [currentTime, crossfadeEnabled, crossfadeDuration, currentTrack, isPlaying, getActiveAudio, getNextTrackForCrossfade, startCrossfadeToNextTrack]);

  // Gapless предзагрузка следующего трека (если crossfade выключен)
  useEffect(() => {
    if (crossfadeEnabled || !gaplessEnabledRef.current || !isPlaying) {
      gaplessNextTrackRef.current = null;
      gaplessPreparedTrackIdRef.current = null;
      return;
    }

    const activeAudio = getActiveAudio();
    if (!activeAudio || activeAudio.duration <= 0) return;

    const timeRemaining = activeAudio.duration - currentTime;
    if (timeRemaining <= 1.2) {
      const nextTrack = getNextTrackForCrossfade();
      if (nextTrack && nextTrack.audioUrl) {
        const nextId = nextTrack.id || `${nextTrack.title}-${nextTrack.artist}`;
        if (gaplessPreparedTrackIdRef.current === nextId) return;
        if (prepareInactiveForTrack(nextTrack)) {
          gaplessNextTrackRef.current = nextTrack;
          gaplessPreparedTrackIdRef.current = nextId;
        }
      }
    }
  }, [currentTime, crossfadeEnabled, isPlaying, getActiveAudio, getInactiveAudio, getNextTrackForCrossfade, prepareInactiveForTrack]);

  // Сбрасываем подготовленный gapless при смене текущего трека
  useEffect(() => {
    gaplessNextTrackRef.current = null;
  }, [currentTrack?.id]);

  // Загрузка лайкнутых треков из API
  const loadLikedTracks = useCallback(async () => {
    try {
      const response = await apiClient.getLikedTracks();
      if (response && response.tracks && response.tracks.length > 0) {
        const formattedTracks: Track[] = response.tracks.map((apiTrack: any) => ({
          id: apiTrack.id,
          title: apiTrack.title,
          artist: typeof apiTrack.artist === 'string' ? apiTrack.artist : (apiTrack.artist?.name || 'Unknown Artist'),
          image:
            resolveMediaPath(
              apiTrack.image ||
                apiTrack.coverUrl ||
                apiTrack.coverPath ||
                apiTrack.album?.coverUrl ||
                apiTrack.album?.coverPath
            ) || FALLBACK_TRACK_IMAGE,
          genre: typeof apiTrack.genre === 'string' ? apiTrack.genre : (apiTrack.genre?.name || 'Unknown'),
          duration: apiTrack.duration,
          lyrics: normalizeLyricsInput(apiTrack.lyrics),
          playlistTitle: 'Liked Songs',
          audioUrl: resolveMediaPath(apiTrack.audioUrl || apiTrack.audioPath),
          lyricsUrl: undefined,
          playsCount: apiTrack.playsCount ?? 0,
          album: typeof apiTrack.album === 'string' ? apiTrack.album : (apiTrack.album?.title || 'Unknown Album'),
        }));
        
        // Обновляем Set лайкнутых треков
        const likedIds = new Set(formattedTracks.map(t => t.id).filter((id): id is string => Boolean(id)));
        setLikedTracks(likedIds);
        
        // Обновляем список лайкнутых треков (последние первыми)
        setLikedTracksList(formattedTracks);
      } else {
        setLikedTracks(new Set());
        setLikedTracksList([]);
      }
    } catch (error) {
      console.error('Error loading liked tracks:', error);
    }
  }, []);

  // Загрузка треков из API
  const loadTracksFromAPI = useCallback(async () => {
    setIsLoadingTracks(true);
    try {
      const response = await apiClient.getTracks({ includeAll: true });
      const apiList = response?.tracks || [];
      const formattedTracks: Track[] = apiList.map((apiTrack: any) => ({
        id: apiTrack.id,
        title: apiTrack.title,
        artist: apiTrack.artist?.name || 'Unknown Artist',
        image:
          resolveMediaPath(
            apiTrack.coverUrl ||
              apiTrack.coverPath ||
              apiTrack.album?.coverUrl ||
              apiTrack.album?.coverPath
          ) || FALLBACK_TRACK_IMAGE,
        genre: apiTrack.genre?.name || 'Unknown',
        duration: apiTrack.duration,
        lyrics: normalizeLyricsInput(apiTrack.lyrics),
        playlistTitle: 'API Tracks',
        audioUrl: resolveMediaPath(apiTrack.audioUrl || apiTrack.audioPath),
        lyricsUrl: undefined,
        playsCount: apiTrack.playsCount ?? 0,
        album: apiTrack.album?.title || 'Unknown Album',
      }));
      setApiTracks(formattedTracks);
    } catch (error) {
      console.error('Error loading tracks from API:', error);
      // Не показываем тост на главной, просто оставляем пустой список
      setApiTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  }, []);

  const patchCurrentTrack = useCallback((trackId: string, patch: Partial<Track>) => {
    setCurrentTrackState((prev) => {
      if (!prev || prev.id !== trackId) {
        return prev;
      }
      return { ...prev, ...patch };
    });
  }, []);

  const fetchLyricsForTrack = useCallback(async (trackId: string) => {
    if (lyricsCacheRef.current.has(trackId)) {
      patchCurrentTrack(trackId, { lyrics: lyricsCacheRef.current.get(trackId) });
      return;
    }
    try {
      const response = await apiClient.getTrackLyrics(trackId);
      const parsed = normalizeLyricsInput(response?.lyrics);
      lyricsCacheRef.current.set(trackId, parsed);
      patchCurrentTrack(trackId, { lyrics: parsed });
    } catch (error) {
    }
  }, [patchCurrentTrack]);

const resolveTrackImage = (payload: any, fallback?: string) => {
  const source =
    payload?.coverUrl ||
    payload?.coverPath ||
    payload?.album?.coverUrl ||
    payload?.album?.coverPath ||
    payload?.artist?.imageUrl ||
    payload?.artist?.imagePath;
  return resolveMediaPath(source) || fallback || FALLBACK_TRACK_IMAGE;
};

const ensureAudioSource = useCallback(async (track: Track) => {
  if (track.audioUrl || !track.id) {
    return;
  }
  try {
    const stream = await apiClient.getTrackStreamUrl(track.id);
    const resolved = apiClient.getFileUrl(stream.url);
    patchCurrentTrack(track.id, { audioUrl: resolved });
  } catch (error) {
    toast.error('Не удалось загрузить аудио трека');
    patchCurrentTrack(track.id, { audioUrl: track.audioUrl });
  }
}, [patchCurrentTrack]);

const hydrateTrackDetails = useCallback(
  async (trackId: string, fallback?: Track) => {
    try {
      const response = await apiClient.getTrackById(trackId);
      const apiTrack = response.track as any;

      const normalizedImage = resolveTrackImage(apiTrack, fallback?.image);
      const normalizedAudio =
        resolveMediaPath(apiTrack.audioUrl || apiTrack.audioPath) || fallback?.audioUrl;
      const normalizedLyrics = normalizeLyricsInput(apiTrack.lyrics);

      patchCurrentTrack(trackId, {
        title: apiTrack.title || fallback?.title,
        artist: apiTrack.artist?.name || fallback?.artist || 'Unknown Artist',
        genre: apiTrack.genre?.name || fallback?.genre || 'Music',
        duration: apiTrack.duration ?? fallback?.duration,
        image: normalizedImage,
        audioUrl: normalizedAudio,
        lyrics: normalizedLyrics.length ? normalizedLyrics : fallback?.lyrics,
        lyricsUrl: fallback?.lyricsUrl,
        playsCount: apiTrack.playsCount ?? fallback?.playsCount,
      });

      if (normalizedLyrics.length) {
        lyricsCacheRef.current.set(trackId, normalizedLyrics);
      } else {
        fetchLyricsForTrack(trackId);
      }
    } catch (error) {
    }
  },
  [patchCurrentTrack, fetchLyricsForTrack]
);

    // Управление активным аудио: загрузка src
  useEffect(() => {
      // ВАЖНО: проверяем флаги кроссфейда САМЫМ ПЕРВЫМ, до любых других проверок
      if (skipAudioLoadRef.current || isCrossfading.current) {
        // Пропускаем загрузку при кроссфейде/gapless - флаг будет сброшен после завершения
      return;
    }
    
    // ВАЖНО: во время кроссфейда не меняем src у fromAudio (старого активного аудио)
    // fromAudio должен продолжать играть со своим старым src
    const activeAudio = getActiveAudio();
    if (!activeAudio) {
        // Если аудио еще не инициализировано, ждем
        return;
      }
    
    // ВАЖНО: Если activeAudio является fromAudio во время кроссфейда, не трогаем его
    // Проверяем напрямую по ссылке на элемент
    if (fromAudioRef.current && (activeAudio === fromAudioRef.current || 
        (fromAudioRef.current === audioRef.current && activeAudio === audioRef.current) ||
        (fromAudioRef.current === audioRef2.current && activeAudio === audioRef2.current))) {
      return;
    }

    if (currentTrack?.audioUrl) {
        // Проверяем, нужно ли обновить src
        const currentSrc = activeAudio.src || '';
        const newSrc = currentTrack.audioUrl;
        
        // Сравниваем URL без протокола для надежности
        const normalizeUrl = (url: string) => url.replace(/^https?:\/\//, '').split('?')[0];
        const isNewTrack = normalizeUrl(currentSrc) !== normalizeUrl(newSrc);
        
        if (isNewTrack || !currentSrc) {
          // Останавливаем текущее воспроизведение перед сменой трека
          // (isCrossfading уже проверен в начале useEffect)
          activeAudio.pause();
        activeAudio.src = newSrc;
        // Устанавливаем громкость сразу, но не меняем volume в этом useEffect
        // volume обрабатывается отдельным useEffect
        activeAudio.volume = volume / 100;
        setCurrentTime(0);
        
        // Загружаем новый трек
        activeAudio.load();
        
        // Если нужно автоплеить, обрабатываем сразу после load()
        // Проверяем только флаг автоплея - он устанавливается в setCurrentTrack синхронно
        if (shouldAutoPlayRef.current) {
          let playbackStarted = false;
          
          // Нормализуем URL для сравнения (убираем протокол и домен)
          const normalizeUrlForCompare = (url: string) => {
            if (!url) return '';
            // Убираем протокол и домен, оставляем только путь
            return url.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
          };
          
          const startAutoplay = () => {
            // Проверяем что флаг еще актуален, src правильный и воспроизведение еще не начато
            if (playbackStarted) {
              return;
            }
            if (!shouldAutoPlayRef.current) {
              return;
            }
            // Сравниваем нормализованные URL (activeAudio.src может быть полным URL, newSrc - относительным)
            const normalizedSrc = normalizeUrlForCompare(activeAudio.src);
            const normalizedNewSrc = normalizeUrlForCompare(newSrc);
            if (normalizedSrc !== normalizedNewSrc) {
              return;
            }
            
            playbackStarted = true;
          // НЕ сбрасываем currentTime - он уже установлен правильно (либо из seek, либо из предыдущего воспроизведения)
          // activeAudio.currentTime = 0; // Убрано - не сбрасываем при автоплее
            activeAudio.play()
              .then(() => {
          setIsPlaying(true);
                shouldAutoPlayRef.current = false;
                if (activeAudio.duration && !Number.isNaN(activeAudio.duration)) {
                  setDuration(activeAudio.duration);
                }
              })
              .catch((error) => {
                console.error('[AUTOPLAY] Playback error:', error);
                setIsPlaying(false);
                shouldAutoPlayRef.current = false;
                playbackStarted = false; // Разрешаем повторную попытку
              });
          };
          
          // После load() readyState всегда сбрасывается в 0, поэтому всегда ждем события
          // Но также пробуем запустить сразу если уже готово (на случай если событие уже сработало)
          if (activeAudio.readyState >= 2) {
            startAutoplay();
          } else {
            // Ждем готовности - используем canplay для быстрого старта
            const handleCanPlay = () => {
              startAutoplay();
              activeAudio.removeEventListener('canplay', handleCanPlay);
              activeAudio.removeEventListener('loadeddata', handleLoadedData);
            };
            
            const handleLoadedData = () => {
              // Проверяем что src совпадает перед запуском
              const normalizedSrc = normalizeUrlForCompare(activeAudio.src);
              const normalizedNewSrc = normalizeUrlForCompare(newSrc);
              if (activeAudio.readyState >= 2 && normalizedSrc === normalizedNewSrc) {
                startAutoplay();
                activeAudio.removeEventListener('canplay', handleCanPlay);
                activeAudio.removeEventListener('loadeddata', handleLoadedData);
              }
            };
            
            activeAudio.addEventListener('canplay', handleCanPlay, { once: true });
            activeAudio.addEventListener('loadeddata', handleLoadedData, { once: true });
            
            // Фолбэк таймаут
            const fallbackTimeout = setTimeout(() => {
              const normalizedSrc = normalizeUrlForCompare(activeAudio.src);
              const normalizedNewSrc = normalizeUrlForCompare(newSrc);
              const srcMatch = normalizedSrc === normalizedNewSrc;
              if (!playbackStarted && shouldAutoPlayRef.current && activeAudio.readyState >= 2 && srcMatch) {
                startAutoplay();
              }
              activeAudio.removeEventListener('canplay', handleCanPlay);
              activeAudio.removeEventListener('loadeddata', handleLoadedData);
            }, 500);
            
            // Очистка при размонтировании
            return () => {
              clearTimeout(fallbackTimeout);
              activeAudio.removeEventListener('canplay', handleCanPlay);
              activeAudio.removeEventListener('loadeddata', handleLoadedData);
            };
          }
        }
      } else {
        // Тот же трек, только обновляем громкость
        // Не вызываем load() или pause() - просто меняем volume
        activeAudio.volume = volume / 100;
      }
    } else {
      activeAudio.pause();
      activeAudio.src = '';
      setCurrentTime(0);
      if (currentTrack?.duration) setDuration(currentTrack.duration);
    }
  }, [currentTrack?.audioUrl, getActiveAudio, volume]);

  // Отдельный useEffect для автоплея - гарантирует запуск при переключении треков
  useEffect(() => {
    if (!shouldAutoPlayRef.current) return;
    
    const activeAudio = getActiveAudio();
    if (!activeAudio || !currentTrack?.audioUrl) return;
    
    // Пропускаем если идет кроссфейд или пропуск загрузки
    if (isCrossfading.current || skipAudioLoadRef.current) return;
    
    const startAutoplay = () => {
      if (!shouldAutoPlayRef.current) return; // Проверяем что флаг еще актуален
      
      if (activeAudio.readyState >= 2) {
        // Аудио готово - запускаем сразу
        // НЕ сбрасываем currentTime - он уже установлен правильно (либо из seek, либо из предыдущего воспроизведения)
        // activeAudio.currentTime = 0; // Убрано - не сбрасываем при автоплее
        activeAudio.play()
          .then(() => {
            setIsPlaying(true);
            shouldAutoPlayRef.current = false;
            if (activeAudio.duration && !Number.isNaN(activeAudio.duration)) {
              setDuration(activeAudio.duration);
            }
            // Записываем в историю прослушиваний при начале воспроизведения
            if (currentTrack?.id && activeAudio.currentTime < 1 && isAuthenticated) {
              recordPlayHistory(currentTrack.id).catch((err: unknown) => {
                console.error('[PLAY_HISTORY] Failed to record:', err);
              });
            }
          })
          .catch((error) => {
            console.error('Autoplay error:', error);
            setIsPlaying(false);
            shouldAutoPlayRef.current = false;
          });
      } else {
        // Ждем готовности
        const handleCanPlay = () => {
          if (!shouldAutoPlayRef.current) return;
          // НЕ сбрасываем currentTime - он уже установлен правильно (либо из seek, либо из предыдущего воспроизведения)
          // activeAudio.currentTime = 0; // Убрано - не сбрасываем при автоплее
          activeAudio.play()
            .then(() => {
              setIsPlaying(true);
              shouldAutoPlayRef.current = false;
              if (activeAudio.duration && !Number.isNaN(activeAudio.duration)) {
                setDuration(activeAudio.duration);
              }
              // Записываем в историю прослушиваний при начале воспроизведения
              if (currentTrack?.id && activeAudio.currentTime < 1 && isAuthenticated) {
                recordPlayHistory(currentTrack.id).catch(err => {
                  console.error('[PLAY_HISTORY] Failed to record:', err);
                });
              }
            })
            .catch((error) => {
              console.error('Autoplay error:', error);
              setIsPlaying(false);
              shouldAutoPlayRef.current = false;
            });
          activeAudio.removeEventListener('canplay', handleCanPlay);
          activeAudio.removeEventListener('loadeddata', handleLoadedData);
        };
        
        const handleLoadedData = () => {
          if (activeAudio.readyState >= 2 && shouldAutoPlayRef.current) {
            handleCanPlay();
          }
        };
        
        activeAudio.addEventListener('canplay', handleCanPlay, { once: true });
        activeAudio.addEventListener('loadeddata', handleLoadedData, { once: true });
        
        // Фолбэк таймаут
        const fallbackTimeout = setTimeout(() => {
          if (shouldAutoPlayRef.current && activeAudio.readyState >= 2 && activeAudio.src === currentTrack.audioUrl) {
            // НЕ сбрасываем currentTime - он уже установлен правильно (либо из seek, либо из предыдущего воспроизведения)
            // activeAudio.currentTime = 0; // Убрано - не сбрасываем при автоплее
            activeAudio.play()
              .then(() => {
                setIsPlaying(true);
                shouldAutoPlayRef.current = false;
                // Записываем в историю прослушиваний при начале воспроизведения
                if (currentTrack?.id && activeAudio.currentTime < 1 && isAuthenticated) {
                  recordPlayHistory(currentTrack.id).catch(err => {
                    console.error('[PLAY_HISTORY] Failed to record:', err);
                  });
                }
              })
              .catch(() => {
                setIsPlaying(false);
                shouldAutoPlayRef.current = false;
              });
          }
          activeAudio.removeEventListener('canplay', handleCanPlay);
          activeAudio.removeEventListener('loadeddata', handleLoadedData);
        }, 500);
        
        return () => {
          clearTimeout(fallbackTimeout);
          activeAudio.removeEventListener('canplay', handleCanPlay);
          activeAudio.removeEventListener('loadeddata', handleLoadedData);
        };
      }
    };
    
    // Проверяем, что src уже установлен (useEffect для загрузки уже отработал)
    // Используем несколько попыток для надежности
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryStartAutoplay = () => {
      attempts++;
      if (!shouldAutoPlayRef.current) return;
      
      // Проверяем что src установлен
      if (activeAudio.src === currentTrack.audioUrl) {
        // src установлен - запускаем автоплей
        startAutoplay();
      } else if (attempts < maxAttempts) {
        // src еще не установлен - пробуем еще раз
        setTimeout(tryStartAutoplay, 100);
      } else {
        // Если после всех попыток src не установлен, сбрасываем флаг
        shouldAutoPlayRef.current = false;
      }
    };
    
    // Первая попытка через небольшую задержку
    const timeout = setTimeout(tryStartAutoplay, 100);
    
    return () => clearTimeout(timeout);
  }, [currentTrack?.audioUrl, isPlaying]);
  
  // Управление play/pause (только для ручного управления)
  useEffect(() => {
    const activeAudio = getActiveAudio();
    if (!activeAudio || !currentTrack?.audioUrl) {
      return;
    }
    
    // Пропускаем play/pause если идет кроссфейд или пропуск загрузки
    // НО: если трек уже играет и мы только что завершили кроссфейд, не сбрасываем isPlaying
    if (isCrossfading.current || skipAudioLoadRef.current) {
      return;
    }
    
    // ВАЖНО: Если activeAudio является fromAudio во время кроссфейда, не трогаем его
    if (fromAudioRef.current && activeAudio === fromAudioRef.current) {
      return;
    }
    
    // ВАЖНО: если трек играет (isPlaying = true), но activeAudio.paused = false,
    // это может быть сразу после кроссфейда - не сбрасываем isPlaying
    if (isPlaying && !activeAudio.paused && activeAudio.currentTime > 0) {
      return;
    }
    
    // Если это автоплей, даем ему приоритет, но не блокируем полностью
    // Автоплей обрабатывается отдельным useEffect, но если он не сработал,
    // обычное воспроизведение все равно должно работать
    const isAutoplay = shouldAutoPlayRef.current;
    
    if (isPlaying) {
      // Проверяем, не играет ли уже трек (может быть после кроссфейда)
      if (!activeAudio.paused && activeAudio.currentTime > 0) {
        return;
      }
      
      // Проверяем готовность аудио
      const tryPlay = () => {
        // ВАЖНО: синхронизируем currentTime из ref (последнее значение из seek или паузы) перед play()
        // Это гарантирует, что трек начнется с правильной позиции после seek() или паузы
        // Приоритет: lastSeekedTimeRef > currentTime state > activeAudio.currentTime
        let targetTime = activeAudio.currentTime;
        if (lastSeekedTimeRef.current > 0) {
          // Используем значение из ref, если оно было установлено
          targetTime = lastSeekedTimeRef.current;
        } else if (currentTime > 0) {
          // Используем значение из состояния, если ref не установлен
          targetTime = currentTime;
        }
        // Всегда синхронизируем перед play(), чтобы гарантировать правильную позицию
        if (Math.abs(activeAudio.currentTime - targetTime) > 0.05) {
          activeAudio.currentTime = targetTime;
        }
        // Если это автоплей, сбрасываем флаг после успешного запуска
        if (isAutoplay) {
          shouldAutoPlayRef.current = false;
        }
        activeAudio.play()
        .then(() => {
          if (activeAudio.duration && !Number.isNaN(activeAudio.duration)) {
            setDuration(activeAudio.duration);
          }
          // Записываем в историю прослушиваний при начале воспроизведения
          if (currentTrack?.id && activeAudio.currentTime < 1 && isAuthenticated) {
            recordPlayHistory(currentTrack.id).catch((err: unknown) => {
              console.error('[PLAY_HISTORY] Failed to record:', err);
            });
          }
        })
          .catch((error) => {
            console.error('[PLAY_PAUSE] Play error:', error);
            setIsPlaying(false);
            if (isAutoplay) {
              shouldAutoPlayRef.current = false;
            }
          });
      };
      
      // Воспроизведение (автоплей или ручное)
      if (activeAudio.readyState >= 2) {
        // Аудио уже загружено, можно играть
        tryPlay();
    } else {
        // Ждем готовности
        const handleCanPlay = () => {
          tryPlay();
          activeAudio.removeEventListener('canplay', handleCanPlay);
        };
        activeAudio.addEventListener('canplay', handleCanPlay, { once: true });
        return () => activeAudio.removeEventListener('canplay', handleCanPlay);
      }
    } else {
      // ВАЖНО: сохраняем currentTime в ref при паузе, чтобы восстановить его при play()
      // Используем activeAudio.currentTime в приоритете, но если он 0, используем значение из состояния или ref
      const timeToSave = activeAudio.currentTime > 0 
        ? activeAudio.currentTime 
        : (currentTime > 0 ? currentTime : lastSeekedTimeRef.current);
      if (timeToSave > 0) {
        lastSeekedTimeRef.current = timeToSave;
        // ВАЖНО: обновляем currentTime state, чтобы UI показывал правильное время при паузе
        // Это гарантирует, что таймер не покажет 0:00 при паузе
        if (currentTime !== timeToSave) {
          setCurrentTime(timeToSave);
        }
      }
      // Вызываем pause() только если аудио действительно играет
      // pause() возвращает void, не Promise, поэтому не используем .catch()
      if (!activeAudio.paused) {
        try {
          activeAudio.pause();
        } catch (error) {
          // Игнорируем ошибки при паузе
          console.error('[PLAY_PAUSE] Pause error:', error);
        }
      }
    }
  }, [isPlaying, currentTrack?.audioUrl, getActiveAudio, currentTime, isAuthenticated, recordPlayHistory]);

  useEffect(() => {
    const activeAudio = getActiveAudio();
    if (activeAudio && currentTrack?.audioUrl) {
      // Обновляем громкость без перезагрузки трека
      // Не вызываем load() или pause() - просто меняем volume
      activeAudio.volume = volume / 100;
    }
  }, [volume]);

  const setCurrentTrack = (track: Track, playlistName?: string, options?: { keepAudio?: boolean }) => {
    const parsedLyrics = normalizeLyricsInput(track.lyrics);
    const normalizedLyrics = parsedLyrics.length ? parsedLyrics : [];

    const coverImage =
      typeof track.image === 'string' && track.image.trim().length
        ? track.image
        : FALLBACK_TRACK_IMAGE;

    const trackWithLyrics = {
      ...track,
      image: coverImage,
      lyrics: normalizedLyrics,
      duration: track.duration || 225,
      playlistTitle: playlistName || track.playlistTitle,
    };

    // Сбрасываем gapless только если это не кроссфейд
    if (!options?.keepAudio) {
    gaplessNextTrackRef.current = null;
    gaplessPreparedTrackIdRef.current = null;
    }
    
    // Устанавливаем флаг автоплея ПЕРЕД обновлением состояния трека
    // Это гарантирует, что useEffect для загрузки увидит флаг
    // НО только если включена настройка "воспроизведение без пауз" (gapless)
    if (!options?.keepAudio) {
      if (gapless) {
        shouldAutoPlayRef.current = true;
        setIsPlaying(true);
      } else {
        shouldAutoPlayRef.current = false;
        setIsPlaying(false);
      }
      setCurrentTime(0);
      lastSeekedTimeRef.current = 0; // Сбрасываем ref при установке нового трека
      setDuration(trackWithLyrics.duration || 225);
    }
    
    setCurrentTrackState(trackWithLyrics);
    
    if (playlistName === 'API Tracks') {
      setCurrentPlaylistName('API Tracks');
      const tracksToSearch = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : apiTracks;
      const index = tracksToSearch.findIndex(t => t.title === track.title && t.artist === track.artist);
      if (index !== -1) {
        setCurrentTrackIndex(index);
        // Если shuffle включен, обновляем индекс в перемешанном плейлисте
        if (shuffle && shuffledPlaylist.length > 0) {
          setShuffledPlaylistIndex(index);
        }
      }
    } else if (playlistName === 'Liked Songs') {
      setCurrentPlaylistName('Liked Songs');
      // Для Liked Songs используем likedTracksList
      const tracksToSearch = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : (likedTracksList.length > 0 ? likedTracksList : apiTracks);
      const index = tracksToSearch.findIndex(t => t.title === track.title && t.artist === track.artist);
      if (index !== -1) {
        setCurrentTrackIndex(index);
        // Если shuffle включен, обновляем индекс в перемешанном плейлисте
        if (shuffle && shuffledPlaylist.length > 0) {
          setShuffledPlaylistIndex(index);
        }
      }
    } else if (playlistName) {
      setCurrentPlaylistName(playlistName);
      // Обновляем индекс для текущего плейлиста
      if (currentPlaylistTracks.length > 0) {
        const tracksToSearch = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : currentPlaylistTracks;
        const index = tracksToSearch.findIndex(t => t.title === track.title && t.artist === track.artist);
        if (index !== -1) {
          setCurrentTrackIndex(index);
          // Если shuffle включен, обновляем индекс в перемешанном плейлисте
          if (shuffle && shuffledPlaylist.length > 0) {
            setShuffledPlaylistIndex(index);
          }
        } else {
          setCurrentTrackIndex(0);
          if (shuffle && shuffledPlaylist.length > 0) {
            setShuffledPlaylistIndex(0);
          }
        }
      } else {
        setCurrentTrackIndex(0);
        if (shuffle && shuffledPlaylist.length > 0) {
          setShuffledPlaylistIndex(0);
        }
      }
    }
    
    // ВАЖНО: setCurrentTime и setDuration уже установлены выше (строки 1187-1188)
    // Флаг автоплея тоже уже установлен выше (строки 1177-1189) с проверкой gapless
    // Этот блок удален, чтобы избежать дублирования и конфликтов

    if (trackWithLyrics.id) {
      hydrateTrackDetails(trackWithLyrics.id, trackWithLyrics);
      if (!trackWithLyrics.audioUrl) {
        ensureAudioSource(trackWithLyrics);
      }
      if (!normalizedLyrics.length) {
        fetchLyricsForTrack(trackWithLyrics.id);
      }
    }
  };

  // Настройка обработчиков для audio элементов
  useEffect(() => {
    // Используем уже созданные audio элементы
    const audio1 = audioRef.current;
    const audio2 = audioRef2.current;
    
    if (!audio1 || !audio2) {
      return;
    }

    const handleTimeUpdate = (audio: HTMLAudioElement) => () => {
      const activeAudio = getActiveAudio();
      if (audio === activeAudio) {
        const newTime = audio.currentTime;
        // ВАЖНО: не обновляем currentTime state в 0, если трек на паузе или если newTime стал 0 из-за ошибки
        // Это предотвращает сброс таймера в 0:00 при паузе
        if (newTime > 0 || !audio.paused) {
          setCurrentTime(newTime);
          // Обновляем ref только если трек играет (не на паузе), чтобы сохранить актуальное значение
          if (!audio.paused && newTime > 0) {
            lastSeekedTimeRef.current = newTime;
          }
        }
      }
    };

    const handleLoadedMetadata = (audio: HTMLAudioElement) => () => {
      const activeAudio = getActiveAudio();
      if (audio === activeAudio && !Number.isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

  const handleEnded = (audio: HTMLAudioElement) => () => {
      const activeAudio = getActiveAudio();
      if (audio !== activeAudio) return;

      // Если идет кроссфейд, не обрабатываем ended (кроссфейд сам переключит трек)
      if (isCrossfading.current) return;

      // Gapless: если подготовлен следующий трек — мгновенно переключаемся
      if (gaplessEnabledRef.current && gaplessNextTrackRef.current && gaplessNextTrackRef.current.audioUrl) {
        const preparedNext = gaplessNextTrackRef.current;
        const inactiveAudio = getInactiveAudio();
        
        if (inactiveAudio && inactiveAudio.src === preparedNext.audioUrl) {
          // Отменяем любой активный кроссфейд
          cancelCrossfade();
          
          // Переключаемся на подготовленный трек
          inactiveAudio.volume = volume / 100;
          inactiveAudio.currentTime = 0;
          
          inactiveAudio.play().then(() => {
            // Переключаем активный аудио
          activeAudioRef.current = activeAudioRef.current === 'audio1' ? 'audio2' : 'audio1';
            
            // Обновляем состояние без сброса воспроизведения
          skipAudioLoadRef.current = true;
            
            // Используем setCurrentTrack для обновления состояния и загрузки деталей
          setCurrentTrack(preparedNext, currentPlaylistName, { keepAudio: true });
          setCurrentTime(inactiveAudio.currentTime || 0);
            setDuration(!Number.isNaN(inactiveAudio.duration) && inactiveAudio.duration > 0 ? inactiveAudio.duration : (preparedNext.duration || 225));
          setIsPlaying(true);
            
            // Очищаем подготовленный трек
            gaplessNextTrackRef.current = null;
            gaplessPreparedTrackIdRef.current = null;
            skipAudioLoadRef.current = false;
          }).catch((error) => {
            console.error('Gapless playback error:', error);
            // Fallback: обычное переключение
            gaplessNextTrackRef.current = null;
            gaplessPreparedTrackIdRef.current = null;
            nextTrackRef.current();
          });
          
          return;
        }
      }

      // Обычная обработка окончания трека
      if (repeatRef.current) {
        audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
      } else {
        // Если gapless выключен или не подготовлен, запускаем следующий трек
      nextTrackRef.current();
      }
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    const handleTimeUpdate1 = handleTimeUpdate(audio1);
    const handleTimeUpdate2 = handleTimeUpdate(audio2);
    const handleLoadedMetadata1 = handleLoadedMetadata(audio1);
    const handleLoadedMetadata2 = handleLoadedMetadata(audio2);
    const handleEnded1 = handleEnded(audio1);
    const handleEnded2 = handleEnded(audio2);

    audio1.addEventListener('timeupdate', handleTimeUpdate1);
    audio1.addEventListener('loadedmetadata', handleLoadedMetadata1);
    audio1.addEventListener('ended', handleEnded1);
    audio1.addEventListener('error', handleError);

    audio2.addEventListener('timeupdate', handleTimeUpdate2);
    audio2.addEventListener('loadedmetadata', handleLoadedMetadata2);
    audio2.addEventListener('ended', handleEnded2);
    audio2.addEventListener('error', handleError);

    return () => {
      audio1.pause();
      audio1.src = '';
      audio1.removeEventListener('timeupdate', handleTimeUpdate1);
      audio1.removeEventListener('loadedmetadata', handleLoadedMetadata1);
      audio1.removeEventListener('ended', handleEnded1);
      audio1.removeEventListener('error', handleError);

      audio2.pause();
      audio2.src = '';
      audio2.removeEventListener('timeupdate', handleTimeUpdate2);
      audio2.removeEventListener('loadedmetadata', handleLoadedMetadata2);
      audio2.removeEventListener('ended', handleEnded2);
      audio2.removeEventListener('error', handleError);
      
      // Не удаляем audio элементы, только очищаем обработчики
    };
  }, []);

  const extractColorFromImage = (_imageUrl: string) => {
    // Simplified - always use default Spotify colors
    setDominantColor('#121212');
    setColorPalette([]);
    setTextColor('#FFFFFF');
    setTextShadow('none');
  };

  const nextTrack = useCallback(() => {
    cancelCrossfade();
      // Сначала проверяем очередь
      if (queue.length > 0) {
        const nextQueuedTrack = queue[0];
        setQueue(prev => prev.slice(1));
        // setCurrentTrack уже проверяет настройку gapless и устанавливает isPlaying соответственно
        setCurrentTrack(nextQueuedTrack, nextQueuedTrack.playlistTitle || currentPlaylistName);
        return;
      }
    
    // Определяем текущий плейлист треков
    let tracksToUse: Track[] = [];
    
    if (currentPlaylistName === 'API Tracks') {
      // Для API Tracks используем shuffle только если включен
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : apiTracks;
    } else if (currentPlaylistName === 'Liked Songs') {
      // Для Liked Songs используем shuffle если включен, иначе likedTracksList
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : (likedTracksList.length > 0 ? likedTracksList : apiTracks);
    } else if (currentPlaylistTracks.length > 0) {
      // Для обычных плейлистов используем shuffle если включен
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : currentPlaylistTracks;
    } else {
      return; // Нет треков для воспроизведения
    }
    
    if (tracksToUse.length === 0) return;
    
    // Находим текущий трек в плейлисте
    let currentIndex: number;
    
    if (shuffle && shuffledPlaylist.length > 0) {
      // Если shuffle включен, ищем в перемешанном плейлисте
      currentIndex = shuffledPlaylist.findIndex(t => 
        t.title === currentTrack?.title && t.artist === currentTrack?.artist
      );
    } else {
      // Без shuffle используем индекс из состояния или ищем в оригинальном плейлисте
      if (currentPlaylistName === 'API Tracks') {
        currentIndex = currentTrackIndex >= 0 && currentTrackIndex < apiTracks.length 
          ? currentTrackIndex 
          : apiTracks.findIndex(t => 
              t.title === currentTrack?.title && t.artist === currentTrack?.artist
            );
      } else if (currentPlaylistName === 'Liked Songs') {
        const listToSearch = likedTracksList.length > 0 ? likedTracksList : apiTracks;
        currentIndex = currentTrackIndex >= 0 && currentTrackIndex < listToSearch.length 
          ? currentTrackIndex 
          : listToSearch.findIndex(t => 
              t.title === currentTrack?.title && t.artist === currentTrack?.artist
            );
      } else {
        currentIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylistTracks.length 
          ? currentTrackIndex 
          : currentPlaylistTracks.findIndex(t => 
              t.title === currentTrack?.title && t.artist === currentTrack?.artist
            );
      }
    }
    
    if (currentIndex === -1) {
      // Если трек не найден, начинаем с начала
      currentIndex = 0;
    }
    
    // Вычисляем следующий трек
    let nextTrackToPlay: Track;
    let nextIndex: number;
    
    if (shuffle && shuffledPlaylist.length > 0) {
      // Если shuffle включен, используем перемешанный плейлист
      // Увеличиваем индекс в перемешанном плейлисте
      const newShuffledIndex = (shuffledPlaylistIndex + 1) % shuffledPlaylist.length;
      setShuffledPlaylistIndex(newShuffledIndex);
      nextTrackToPlay = shuffledPlaylist[newShuffledIndex];
      
      // Обновляем currentTrackIndex для совместимости
      const originalIndex = tracksToUse.findIndex(t => 
        t.title === nextTrackToPlay.title && t.artist === nextTrackToPlay.artist
      );
      nextIndex = originalIndex >= 0 ? originalIndex : 0;
    } else {
      // Идем строго по порядку: следующий трек в плейлисте
      nextIndex = (currentIndex + 1) % tracksToUse.length;
      nextTrackToPlay = tracksToUse[nextIndex];
    }
    
    // Обновляем индекс для следующего трека
    setCurrentTrackIndex(nextIndex);
    setCurrentTrack(nextTrackToPlay, currentPlaylistName);
  }, [cancelCrossfade, currentPlaylistName, shuffle, apiTracks, shuffledPlaylist, shuffledPlaylistIndex, queue, currentTrack, currentPlaylistTracks, currentTrackIndex, likedTracksList]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const previousTrack = useCallback(() => {
    cancelCrossfade();
      let tracksToUse: Track[] = [];
    
    if (currentPlaylistName === 'API Tracks') {
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : apiTracks;
    } else if (currentPlaylistName === 'Liked Songs') {
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : (likedTracksList.length > 0 ? likedTracksList : apiTracks);
    } else if (currentPlaylistTracks.length > 0) {
      tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : currentPlaylistTracks;
    } else {
      return;
    }
    
    const activeAudio = getActiveAudio();
    
    // Если трек играет больше 3 секунд, перезапускаем его с начала
    // Если трек в самом начале (<= 0.1 сек), переключаемся на предыдущий трек
    if (currentTime <= 0.1 && activeAudio && tracksToUse.length > 1) {
      // В самом начале - переключаемся на предыдущий трек
      const currentIndex = Math.max(0, Math.min(currentTrackIndex, tracksToUse.length - 1));
      const prevIndex = currentIndex === 0 ? tracksToUse.length - 1 : currentIndex - 1;
      const prevTrack = tracksToUse[prevIndex];
      
      if (prevTrack) {
        setCurrentTrackIndex(prevIndex);
        setCurrentTrack(prevTrack, currentPlaylistName);
      }
      return;
    }
    
    if (currentTime > 3 && activeAudio) {
      activeAudio.currentTime = 0;
      setCurrentTime(0);
      lastSeekedTimeRef.current = 0;
      // Автозапуск при перезапуске трека - только если включена настройка gapless
      if (gapless) {
        shouldAutoPlayRef.current = true;
        setIsPlaying(true);
        // Запускаем воспроизведение если аудио готово
        if (activeAudio.readyState >= 2) {
          activeAudio.play()
            .then(() => {
              setIsPlaying(true);
              shouldAutoPlayRef.current = false;
            })
            .catch((error) => {
              console.error('[PREV_TRACK] Play error:', error);
              setIsPlaying(false);
              shouldAutoPlayRef.current = false;
            });
        } else {
          const handleCanPlay = () => {
            activeAudio.play()
              .then(() => {
                setIsPlaying(true);
                shouldAutoPlayRef.current = false;
              })
              .catch((error) => {
                console.error('[PREV_TRACK] Play error:', error);
                setIsPlaying(false);
                shouldAutoPlayRef.current = false;
              });
            activeAudio.removeEventListener('canplay', handleCanPlay);
            activeAudio.removeEventListener('loadeddata', handleLoadedData);
          };
          
          const handleLoadedData = () => {
            if (activeAudio.readyState >= 2 && shouldAutoPlayRef.current) {
              handleCanPlay();
            }
          };
          
          activeAudio.addEventListener('canplay', handleCanPlay, { once: true });
          activeAudio.addEventListener('loadeddata', handleLoadedData, { once: true });
        }
      } else {
        shouldAutoPlayRef.current = false;
        setIsPlaying(false);
        if (activeAudio && !activeAudio.paused) {
          try {
            activeAudio.pause();
          } catch (error) {
            console.error('[PREV_TRACK] Pause error:', error);
          }
        }
      }
      return;
    }
    
    // Если трек играет меньше 3 секунд или трек один, переключаемся на предыдущий
    if (tracksToUse.length <= 1) {
      if (activeAudio) {
        activeAudio.currentTime = 0;
        setCurrentTime(0);
        if (gapless) {
          shouldAutoPlayRef.current = true;
          setIsPlaying(true);
          if (activeAudio.readyState >= 2) {
            activeAudio.play()
              .then(() => {
                setIsPlaying(true);
                shouldAutoPlayRef.current = false;
              })
              .catch((error) => {
                console.error('[PREV_TRACK] Play error:', error);
                setIsPlaying(false);
                shouldAutoPlayRef.current = false;
              });
          }
        } else {
          shouldAutoPlayRef.current = false;
          setIsPlaying(false);
          if (!activeAudio.paused) {
            try {
              activeAudio.pause();
            } catch (error) {
              console.error('[PREV_TRACK] Pause error:', error);
            }
          }
        }
      }
      return;
    }
    
    // Переключаемся на предыдущий трек
    const currentIndex = Math.max(0, Math.min(currentTrackIndex, tracksToUse.length - 1));
    const prevIndex = currentIndex === 0 ? tracksToUse.length - 1 : currentIndex - 1;
    const prevTrack = tracksToUse[prevIndex];
    
    if (prevTrack) {
      setCurrentTrackIndex(prevIndex);
      setCurrentTrack(prevTrack, currentPlaylistName);
    }
  }, [cancelCrossfade, currentTime, currentTrackIndex, currentPlaylistName, apiTracks, likedTracksList, currentPlaylistTracks, shuffle, shuffledPlaylist, shuffledPlaylistIndex, getActiveAudio, gapless]);

  // Цвета всегда используют дефолтные значения Spotify (убрано из useEffect для оптимизации)

  // Auto-play next track when current ends (обрабатывается в handleEnded, этот useEffect удален для оптимизации)

  // Simulate time progression
  useEffect(() => {
    if (currentTrack?.audioUrl) {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
      return;
    }

    if (isPlaying) {
      timeIntervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            if (repeat) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 0.1;
        });
      }, 100);
    } else if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, [isPlaying, duration, repeat, currentTrack?.audioUrl]);

  const togglePlay = useCallback(() => {
    const activeAudio = getActiveAudio();
    if (!activeAudio || !currentTrack?.audioUrl) {
      // Если нет трека, ничего не делаем
      return;
    }
    
    // Если идет кроссфейд, не переключаем
    if (isCrossfading.current) {
      return;
    }
    
    // Если аудио еще не загружено, загружаем его
    // Используем нормализацию URL для правильного сравнения
    const normalizeUrl = (url: string) => url.replace(/^https?:\/\//, '').split('?')[0];
    const currentSrc = activeAudio.src || '';
    const newSrc = currentTrack.audioUrl || '';
    const isNewTrack = normalizeUrl(currentSrc) !== normalizeUrl(newSrc);
    
    if (!activeAudio.src || isNewTrack) {
      // Только если это действительно новый трек, загружаем его
      // Это сбросит currentTime в 0, что правильно для нового трека
      activeAudio.src = currentTrack.audioUrl;
      activeAudio.load();
    }
    // Если это тот же трек, не вызываем load() - currentTime сохранится
    
    // Переключаем состояние воспроизведения
    setIsPlaying(prev => !prev);
  }, [getActiveAudio, currentTrack?.audioUrl]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    const activeAudio = getActiveAudio();
    if (activeAudio && currentTrack?.audioUrl) {
      activeAudio.currentTime = clamped;
      // Сохраняем последнее значение для синхронизации при play()
      lastSeekedTimeRef.current = clamped;
    }
    setCurrentTime(clamped);
  }, [duration, currentTrack?.audioUrl, getActiveAudio]);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const newShuffle = !prev;
      // При включении shuffle создаем перемешанную версию плейлиста
      if (newShuffle) {
        let tracksToShuffle: Track[] = [];
        if (currentPlaylistName === 'API Tracks') {
          tracksToShuffle = [...apiTracks];
        } else if (currentPlaylistName === 'Liked Songs') {
          tracksToShuffle = likedTracksList.length > 0 ? [...likedTracksList] : [...apiTracks];
        } else if (currentPlaylistTracks.length > 0) {
          tracksToShuffle = [...currentPlaylistTracks];
        }
        if (tracksToShuffle.length > 0) {
          // Исключаем текущий трек из перемешивания
          const currentTrackIndex = tracksToShuffle.findIndex(t => 
            t.title === currentTrack?.title && t.artist === currentTrack?.artist
          );
          const otherTracks = currentTrackIndex >= 0 
            ? [...tracksToShuffle.slice(0, currentTrackIndex), ...tracksToShuffle.slice(currentTrackIndex + 1)]
            : [...tracksToShuffle];
          
          // Fisher-Yates shuffle для остальных треков с использованием crypto для лучшей случайности
          for (let i = otherTracks.length - 1; i > 0; i--) {
            // Используем crypto.getRandomValues для более случайного выбора
            const randomArray = new Uint32Array(1);
            crypto.getRandomValues(randomArray);
            const j = Math.floor((randomArray[0] / (0xFFFFFFFF + 1)) * (i + 1));
            [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
          }
          
          // Вставляем текущий трек в начало, затем остальные
          const shuffled = currentTrackIndex >= 0 
            ? [tracksToShuffle[currentTrackIndex], ...otherTracks]
            : otherTracks;
          
          setShuffledPlaylist(shuffled);
          setShuffledPlaylistIndex(0); // Начинаем с текущего трека
        }
      } else {
        // При выключении shuffle очищаем перемешанный плейлист
        setShuffledPlaylist([]);
        setShuffledPlaylistIndex(0);
      }
      return newShuffle;
    });
  }, [apiTracks, currentPlaylistName, currentPlaylistTracks, likedTracksList, currentTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => !prev);
  }, []);

  const openPlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    // Store where to return to in library
    if (playlist.returnTo) {
      setLibraryReturnCategory(playlist.returnTo);
    }
    // Store which artist tab to return to
    if (playlist.returnToArtistTab) {
      setArtistReturnTab(playlist.returnToArtistTab);
    }
  }, []);

  const closePlaylist = useCallback(() => {
    setSelectedPlaylist(null);
    // Keep libraryReturnCategory and artistReturnTab so views can use them
  }, []);

  const toggleLike = useCallback(async (trackIdOrTitle: string) => {
    // Сначала пытаемся найти трек по ID
    let trackToLike = currentTrack || 
      likedTracksList.find(t => t.id === trackIdOrTitle) ||
      apiTracks.find(t => t.id === trackIdOrTitle);

    // Если не нашли по ID, ищем по названию (для обратной совместимости)
    if (!trackToLike) {
      trackToLike = likedTracksList.find(t => t.title === trackIdOrTitle) ||
        apiTracks.find(t => t.title === trackIdOrTitle);
    }

    // Если трек не найден или нет ID, не можем лайкнуть через API
    if (!trackToLike || !trackToLike.id) {
      toast.error('ID трека не найден');
      return;
    }

    const trackId = trackToLike.id;
    const isCurrentlyLiked = likedTracks.has(trackId);

    try {
      if (isCurrentlyLiked) {
        // Удаляем лайк
        await apiClient.unlikeTrack(trackId);
    setLikedTracks((prev) => {
      const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
        setLikedTracksList((prevList) => prevList.filter(t => t.id !== trackId));
        toast.success(t('trackRemoved') || 'Removed from Liked Songs');
      } else {
        // Добавляем лайк
        await apiClient.likeTrack(trackId);
        setLikedTracks((prev) => {
          const newSet = new Set(prev);
          newSet.add(trackId);
      return newSet;
    });
        setLikedTracksList((prevList) => {
          const existingIndex = prevList.findIndex(t => t.id === trackId);
          if (existingIndex !== -1) {
            const newList = [...prevList];
            const [existingTrack] = newList.splice(existingIndex, 1);
            return [existingTrack, ...newList];
          }
          return [{ ...trackToLike }, ...prevList];
        });
        toast.success(t('trackAdded') || 'Added to Liked Songs');
      }
    } catch (error) {
      toast.error('Не удалось обновить статус лайка');
    }
  }, [currentTrack, likedTracks, likedTracksList, apiTracks, t, loadLikedTracks]);

  const isLiked = useCallback((trackIdOrTitle: string) => {
    // Сначала проверяем по ID
    if (likedTracks.has(trackIdOrTitle)) {
      return true;
    }
    // Если не нашли по ID, проверяем по названию (для обратной совместимости)
    const track = likedTracksList.find(t => t.id === trackIdOrTitle || t.title === trackIdOrTitle);
    return track && track.id ? likedTracks.has(track.id) : false;
  }, [likedTracks, likedTracksList]);

  const openArtistView = useCallback((artist: string | SelectedArtist) => {
    if (typeof artist === 'string') {
      setSelectedArtist({ name: artist });
    } else {
      setSelectedArtist(artist);
    }
  }, []);

  const closeArtistView = useCallback(() => {
    setSelectedArtist(null);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle arrow keys separately (they don't work with toLowerCase)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Устанавливаем флаг для автоматического включения только если включена настройка gapless
        // nextTrack() уже проверяет gapless в setCurrentTrack, но здесь устанавливаем флаг явно
        if (gapless) {
          shouldAutoPlayRef.current = true;
        } else {
          shouldAutoPlayRef.current = false;
        }
        // Переключаем трек
        nextTrack();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousTrack();
        return;
      }
      if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (volume < 100) {
            const newVolumeUp = Math.min(100, volume + 5);
            // Очищаем предыдущий таймаут для debounce
            if (volumeUpdateTimeoutRef.current) {
              clearTimeout(volumeUpdateTimeoutRef.current);
            }
            // Обновляем громкость с небольшой задержкой для уменьшения частоты обновлений
            volumeUpdateTimeoutRef.current = setTimeout(() => {
            setVolume(newVolumeUp);
            }, 0);
            // Обновляем громкость аудио сразу для плавности
            const activeAudio = getActiveAudio();
            if (activeAudio) {
              activeAudio.volume = newVolumeUp / 100;
            }
            // Показываем уведомление только если громкость кратна 10
            if (newVolumeUp % 10 === 0) {
              toast.success(`Volume: ${newVolumeUp}%`, { duration: 800 });
              lastVolumeToastRef.current = newVolumeUp;
            }
          }
        return;
      }
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (volume > 0) {
            const newVolumeDown = Math.max(0, volume - 5);
            // Очищаем предыдущий таймаут для debounce
            if (volumeUpdateTimeoutRef.current) {
              clearTimeout(volumeUpdateTimeoutRef.current);
            }
            // Обновляем громкость с небольшой задержкой для уменьшения частоты обновлений
            volumeUpdateTimeoutRef.current = setTimeout(() => {
            setVolume(newVolumeDown);
            }, 0);
            // Обновляем громкость аудио сразу для плавности
            const activeAudio = getActiveAudio();
            if (activeAudio) {
              activeAudio.volume = newVolumeDown / 100;
            }
            // Показываем уведомление только если громкость кратна 10
            if (newVolumeDown % 10 === 0) {
              toast.success(`Volume: ${newVolumeDown}%`, { duration: 800 });
              lastVolumeToastRef.current = newVolumeDown;
            }
          }
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
        case 'л': // Russian layout: К -> Л
          // Space or K - Play/Pause
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'а': // Russian layout: F -> А
          // F - Toggle fullscreen
          if (currentTrack) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'ь': // Russian layout: M -> Ь
          // M - Mute/Unmute
          e.preventDefault();
          const isMuted = volume > 0;
          setVolume(isMuted ? 0 : 50);
          toast.success(isMuted ? 'Muted' : 'Unmuted', { duration: 1000 });
          break;
        case 'l':
        case 'д': // Russian layout: L -> Д
          // L - Like current track
          if (currentTrack && currentTrack.id) {
            e.preventDefault();
            toggleLike(currentTrack.id);
            // Toast уже показывается внутри toggleLike, не нужно дублировать
          }
          break;
        case 's':
        case 'ы': // Russian layout: S -> Ы
          // S - Toggle shuffle
          e.preventDefault();
          setShuffle((prev) => {
            const newShuffle = !prev;
            toast.success(newShuffle ? 'Shuffle on' : 'Shuffle off', { duration: 1000 });
            return newShuffle;
          });
          break;
        case 'r':
        case 'к': // Russian layout: R -> К
          // R - Toggle repeat
          e.preventDefault();
          setRepeat((prev) => {
            const newRepeat = !prev;
            toast.success(newRepeat ? 'Repeat on' : 'Repeat off', { duration: 1000 });
            return newRepeat;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTrack, volume, nextTrack, previousTrack, togglePlay, toggleFullscreen, toggleLike, isLiked]);

  // Меморизация контекста для оптимизации производительности
  const contextValue = {
    currentTrack,
    isPlaying,
    isFullscreen,
    dominantColor,
    colorPalette,
    textColor,
    textShadow,
    currentTime,
    duration,
    selectedPlaylist,
    likedTracks,
    likedTracksList,
    selectedArtist,
    libraryReturnCategory,
    artistReturnTab,
    setCurrentTrack,
    togglePlay,
    toggleFullscreen,
    extractColorFromImage,
    seek,
    setVolume,
    volume,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    openPlaylist,
    closePlaylist,
    nextTrack,
    previousTrack,
    toggleLike,
    isLiked,
    openArtistView,
    closeArtistView,
    apiTracks,
    isLoadingTracks,
    loadTracksFromAPI,
    queue,
    addToQueue: (track: Track) => {
      setQueue(prev => [...prev, track]);
    },
    removeFromQueue: (index: number) => {
      setQueue(prev => prev.filter((_, i) => i !== index));
    },
    clearQueue: () => {
      setQueue([]);
    },
    currentPlaylistTracks,
    setCurrentPlaylistTracks,
    getNextTrackFromPlaylist: () => {
      // Сначала проверяем очередь
      if (queue.length > 0) {
        return queue[0];
      }
      
      // Определяем текущий плейлист треков
      let tracksToUse: Track[] = [];
      
      if (currentPlaylistName === 'API Tracks') {
        tracksToUse = shuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : apiTracks;
      } else if (currentPlaylistName === 'Liked Songs') {
        tracksToUse = likedTracksList.length > 0 ? likedTracksList : apiTracks;
      } else if (currentPlaylistTracks.length > 0) {
        tracksToUse = currentPlaylistTracks;
      } else {
        return null;
      }
      
      if (tracksToUse.length === 0) return null;
      
      if (shuffle && shuffledPlaylist.length > 0) {
        // Если shuffle включен, используем индекс в перемешанном плейлисте
        const nextShuffledIndex = (shuffledPlaylistIndex + 1) % shuffledPlaylist.length;
        return shuffledPlaylist[nextShuffledIndex] || null;
      } else {
        // Без shuffle используем индекс из состояния или ищем в оригинальном плейлисте
        let currentIndex: number;
        if (currentPlaylistName === 'API Tracks') {
          currentIndex = currentTrackIndex >= 0 && currentTrackIndex < apiTracks.length 
            ? currentTrackIndex 
            : apiTracks.findIndex(t => 
                t.title === currentTrack?.title && t.artist === currentTrack?.artist
              );
        } else if (currentPlaylistName === 'Liked Songs') {
          const listToSearch = likedTracksList.length > 0 ? likedTracksList : apiTracks;
          currentIndex = currentTrackIndex >= 0 && currentTrackIndex < listToSearch.length 
            ? currentTrackIndex 
            : listToSearch.findIndex(t => 
                t.title === currentTrack?.title && t.artist === currentTrack?.artist
              );
        } else {
          currentIndex = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylistTracks.length 
            ? currentTrackIndex 
            : currentPlaylistTracks.findIndex(t => 
                t.title === currentTrack?.title && t.artist === currentTrack?.artist
              );
        }
        
        if (currentIndex === -1) return null;
        
        // Идем строго по порядку
        const nextIndex = (currentIndex + 1) % tracksToUse.length;
        return tracksToUse[nextIndex] || null;
      }
    },
    forcePlayNext: () => {
      nextTrack();
    },
  };

  // MediaSession API для поддержки физических кнопок (наушники, клавиатура)
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    const mediaSession = navigator.mediaSession;
    
    // Обновляем метаданные трека
    const updateMetadata = () => {
      if (!currentTrack) {
        mediaSession.metadata = null;
        return;
      }

      
      mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: (currentTrack as any).album || '',
        artwork: currentTrack.image ? [
          { src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });
    };

    // Обработчики действий MediaSession
    mediaSession.setActionHandler('play', () => {
      if (!isPlaying) {
        togglePlay();
      }
    });

    mediaSession.setActionHandler('pause', () => {
      if (isPlaying) {
        togglePlay();
      }
    });

    mediaSession.setActionHandler('previoustrack', () => {
      previousTrack();
    });

    mediaSession.setActionHandler('nexttrack', () => {
      nextTrack();
    });

    // Обновляем состояние воспроизведения
    const updatePlaybackState = () => {
      if (isPlaying) {
        mediaSession.playbackState = 'playing';
      } else {
        mediaSession.playbackState = 'paused';
      }
    };

    // Обновляем метаданные при смене трека (только при изменении currentTrack)
    updateMetadata();
    updatePlaybackState();

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack, isPlaying, togglePlay, nextTrack, previousTrack]);

  // Загружаем треки из API при инициализации
  useEffect(() => {
    loadTracksFromAPI();
    loadLikedTracks();
  }, [loadTracksFromAPI, loadLikedTracks]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
