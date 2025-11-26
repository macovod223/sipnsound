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
  type?: 'liked' | 'playlist' | 'album' | 'single';
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
  const { t } = useSettings();
  const { isAuthenticated } = useAuth();
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVolumeToastRef = useRef<number>(60);
  const lyricsCacheRef = useRef<Map<string, LyricLine[]>>(new Map());

  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const nextTrackRef = useRef<() => void>(() => {});
  const shouldAutoPlayRef = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (!Number.isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (repeatRef.current && audioRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      } else {
        nextTrackRef.current();
      }
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, []);

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
      if (response && response.tracks && response.tracks.length > 0) {
        const formattedTracks: Track[] = response.tracks.map((apiTrack: any) => ({
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
      }
    } catch (error) {
      console.error('Error loading tracks from API:', error);
      toast.error('Ошибка загрузки треков');
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (currentTrack?.audioUrl) {
      // Проверяем, изменился ли трек (новый URL)
      const isNewTrack = audio.src !== currentTrack.audioUrl;
      
      if (isNewTrack) {
      audio.src = currentTrack.audioUrl;
      audio.volume = volume / 100;
        
        // Сбрасываем время только если установлен флаг автоматического включения (стрелка вправо)
        if (shouldAutoPlayRef.current) {
          shouldAutoPlayRef.current = false;
      audio.currentTime = 0;
          // Устанавливаем флаг для автоматического включения
          setIsPlaying(true);
      }
        // Play/pause обрабатывается отдельным useEffect
      }
      // Volume обрабатывается отдельным useEffect, не обновляем здесь
    } else {
      audio.pause();
      audio.src = '';
      setCurrentTime(0);
      if (currentTrack?.duration) {
        setDuration(currentTrack.duration);
      }
    }
  }, [currentTrack?.audioUrl]); 

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) {
      return;
    }
    if (isPlaying) {
      audio
        .play()
        .then(() => {
          if (audio.duration && !Number.isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        })
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack?.audioUrl]);

  useEffect(() => {
    if (audioRef.current && currentTrack?.audioUrl) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume, currentTrack?.audioUrl]);

  const setCurrentTrack = (track: Track, playlistName?: string) => {
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
    
    setCurrentTime(0);
    setDuration(trackWithLyrics.duration || 225);
    setIsPlaying(true);

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

  const extractColorFromImage = (_imageUrl: string) => {
    // Simplified - always use default Spotify colors
    setDominantColor('#121212');
    setColorPalette([]);
    setTextColor('#FFFFFF');
    setTextShadow('none');
  };

  const nextTrack = useCallback(() => {
    // Сначала проверяем очередь
    if (queue.length > 0) {
      const nextQueuedTrack = queue[0];
      setQueue(prev => prev.slice(1));
      setCurrentTrack(nextQueuedTrack, nextQueuedTrack.playlistTitle || currentPlaylistName);
      // Запускаем воспроизведение
      setTimeout(() => {
        setIsPlaying(true);
      }, 100);
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
  }, [currentPlaylistName, shuffle, apiTracks, shuffledPlaylist, shuffledPlaylistIndex, queue, currentTrack, currentPlaylistTracks, currentTrackIndex, likedTracksList]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const previousTrack = useCallback(() => {
      let currentPlaylistTracks: Track[] = [];
      
    if (currentPlaylistName === 'API Tracks' || currentPlaylistName === 'Liked Songs') {
        currentPlaylistTracks = apiTracks;
      } else {
      currentPlaylistTracks = [];
    }
    
    // Если трек играет больше 3 секунд - начинаем сначала
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      return;
    }
    
    // Если треков нет или только один - начинаем сначала
    if (currentPlaylistTracks.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      return;
    }
    
    // Переключаем на предыдущий трек
      const prevIndex = currentTrackIndex === 0 
        ? currentPlaylistTracks.length - 1 
        : currentTrackIndex - 1;
      const prevTrack = currentPlaylistTracks[prevIndex];
      setCurrentTrack(prevTrack, currentPlaylistName);
  }, [currentTime, currentTrackIndex, currentPlaylistName, apiTracks]);

  useEffect(() => {
    // Always use default Spotify colors
    setDominantColor('#121212');
    setColorPalette([]);
    setTextColor('#FFFFFF');
    setTextShadow('none');
  }, [currentTrack]);

  // Auto-play next track when current ends
  useEffect(() => {
    if (currentTime >= duration && isPlaying && !repeat) {
      // Track ended, play next
      nextTrack();
    }
  }, [currentTime, duration, isPlaying, repeat]);

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
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    if (audioRef.current && currentTrack?.audioUrl) {
      audioRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  }, [duration, currentTrack?.audioUrl]);

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
        // Устанавливаем флаг для автоматического включения
        shouldAutoPlayRef.current = true;
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
            setVolume(newVolumeUp);
            if (Math.abs(newVolumeUp - lastVolumeToastRef.current) >= 10 || newVolumeUp === 100) {
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
            setVolume(newVolumeDown);
            if (Math.abs(newVolumeDown - lastVolumeToastRef.current) >= 10 || newVolumeDown === 0) {
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
  };

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
