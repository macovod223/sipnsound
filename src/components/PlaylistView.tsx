import { motion } from 'motion/react';
import { ArrowLeft, Play, Clock, Heart, Shuffle } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { MusicVisualizer } from './UI';
import { useSettings } from './SettingsContext';
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { resolveAudioUrl, resolveImageUrl } from '@/utils/media';
import { TrackMenu } from './TrackMenu';
import { formatDuration } from '../utils/time';
import { pluralize, pluralizeEn } from './translations';

export function PlaylistView() {
  const { selectedPlaylist, closePlaylist, setCurrentTrack, currentTrack, isPlaying, togglePlay, openArtistView, openPlaylist, likedTracksList, seek, shuffle, toggleShuffle, setCurrentPlaylistTracks } = usePlayer();
  const { t, animations, language } = useSettings();
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [playlistCoverUrl, setPlaylistCoverUrl] = useState<string | null>(null);
  
  const getAlbumMeta = (raw: string) => {
    const cleaned = (raw || '').replace(/•/g, ' ').replace(/\s+/g, ' ').trim();
    let year = '';
    let artist = '';
    const match = cleaned.match(/^(\d{4})(.+)$/);
    if (match) {
      year = match[1];
      artist = match[2].trim();
    } else {
      const parts = cleaned.split(' ');
      if (parts.length > 1 && /^\d{4}$/.test(parts[0])) {
        year = parts[0];
        artist = parts.slice(1).join(' ').trim();
      } else {
        artist = cleaned;
      }
    }
    if (!artist) artist = 'Unknown Artist';
    return { year, artist };
  };
  
  // Обновляем обложку при изменении selectedPlaylist
  useEffect(() => {
    if (selectedPlaylist?.image) {
      setPlaylistCoverUrl(resolveImageUrl(selectedPlaylist.image) || null);
    } else {
      setPlaylistCoverUrl(null);
    }
  }, [selectedPlaylist?.image]);

  // Load tracks for the selected playlist
  useEffect(() => {
    if (!selectedPlaylist) return;

    const loadPlaylistTracks = async () => {
      try {
        // Если это альбом, загружаем треки по albumId
        if (selectedPlaylist.albumId) {
          const response = await apiClient.getTracks({ albumId: selectedPlaylist.albumId });
          if (response && response.tracks && response.tracks.length > 0) {
            // Используем обложку альбома из selectedPlaylist для всех треков
            const albumCover = selectedPlaylist.image || response.tracks[0]?.album?.coverUrl || '';
            const formattedTracks = response.tracks.map((track: any) => ({
              id: track.id,
              title: track.title,
              artist: track.artist?.name || 'Unknown Artist',
              image: albumCover || track.coverUrl || track.coverPath || (track.album as any)?.coverUrl || '',
              genre: track.genre?.name || 'Unknown',
              duration: track.duration || 0,
              audioUrl: resolveAudioUrl(track.audioUrl || track.audioPath),
              lyricsUrl: track.lyricsPath,
              playsCount: track.playsCount || 0,
              album: track.album?.title || 'Unknown Album',
            }));
            setPlaylistTracks(formattedTracks);
            // Сохраняем треки в контекст для nextTrack
            setCurrentPlaylistTracks(formattedTracks.map((track: any) => ({
              id: track.id,
              title: track.title,
              artist: track.artist,
              image: track.image,
              genre: track.genre || 'Unknown',
              duration: track.duration || 0,
              audioUrl: track.audioUrl,
              playlistTitle: selectedPlaylist.title,
            })));
            return;
          }
        }
        
        // Если это "Liked Songs", загружаем лайкнутые треки из API
        if (selectedPlaylist.type === 'liked') {
          try {
            const response = await apiClient.getLikedTracks();
            if (response && response.tracks && response.tracks.length > 0) {
              const formattedTracks = response.tracks.map((track: any) => ({
                id: track.id,
                title: track.title,
                artist: typeof track.artist === 'string' ? track.artist : (track.artist?.name || 'Unknown Artist'),
                artistId: typeof track.artist === 'object' ? track.artist?.id : undefined,
                image: track.image || track.coverUrl || track.coverPath || '',
                genre: typeof track.genre === 'string' ? track.genre : (track.genre?.name || 'Unknown'),
                duration: track.duration || 0,
                audioUrl: resolveAudioUrl(track.audioUrl || track.audioPath),
                lyricsUrl: track.lyricsUrl || track.lyricsPath,
                playsCount: track.playsCount || 0,
                album: typeof track.album === 'string' ? track.album : (track.album?.title || 'Unknown Album'),
                albumId: typeof track.album === 'object' ? track.album?.id : undefined,
                albumType: typeof track.album === 'object' ? track.album?.type : undefined,
              }));
              setPlaylistTracks(formattedTracks);
              // Сохраняем треки в контекст для nextTrack
              setCurrentPlaylistTracks(formattedTracks.map((track: any) => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                image: track.image,
                genre: track.genre || 'Unknown',
                duration: track.duration || 0,
                audioUrl: track.audioUrl,
                playlistTitle: selectedPlaylist.title,
              })));
              return;
            }
          } catch (error) {
            // Если не удалось загрузить, используем треки из контекста
          }
          // Fallback: используем треки из контекста
          if (likedTracksList && likedTracksList.length > 0) {
            setPlaylistTracks(likedTracksList);
            setCurrentPlaylistTracks(likedTracksList);
            return;
          }
          // Если лайкнутых треков нет, показываем пустой список
          setPlaylistTracks([]);
          return;
        }
        
        // Иначе пытаемся загрузить как плейлист
        // Если есть ID плейлиста, используем его, иначе пытаемся найти по title
        if (selectedPlaylist.id) {
          try {
            const playlistResponse = await apiClient.getPlaylistById(selectedPlaylist.id);
            if (playlistResponse) {
              // API возвращает PlaylistDetails напрямую (getPlaylistById уже извлекает playlist из ответа)
              const playlist = playlistResponse;
              // Обновляем обложку плейлиста из БД
              if (playlist.coverUrl) {
                setPlaylistCoverUrl(resolveImageUrl(playlist.coverUrl) || null);
              }
              
              const tracks = playlist.tracks || [];
              if (tracks.length > 0) {
                const formattedTracks = tracks.map((pt: any) => {
                  const track = pt.track || pt;
                  // Обрабатываем разные форматы данных из API
                  const artistName = track.artist?.name || (typeof track.artist === 'string' ? track.artist : 'Unknown Artist');
                  const albumTitle = track.album?.title || (typeof track.album === 'string' ? track.album : 'Unknown Album');
                  return {
                    id: track.id,
                    title: track.title,
                    artist: artistName,
                    image: resolveImageUrl(track.coverUrl || track.coverPath) || selectedPlaylist.image || '',
                    genre: track.genre?.name || 'Unknown',
                    duration: track.duration || 0,
                    audioUrl: resolveAudioUrl(track.audioUrl || track.audioPath),
                    lyricsUrl: track.lyricsPath,
                    playsCount: track.playsCount || 0,
                    album: albumTitle,
                  };
                });
                setPlaylistTracks(formattedTracks);
                // Сохраняем треки в контекст для nextTrack
                setCurrentPlaylistTracks(formattedTracks.map((track: any) => ({
                  id: track.id,
                  title: track.title,
                  artist: track.artist,
                  image: track.image,
                  genre: track.genre || 'Unknown',
                  duration: track.duration || 0,
                  audioUrl: track.audioUrl,
                  playlistTitle: selectedPlaylist.title,
                })));
                return;
              }
            }
          } catch (error) {
            // Если не удалось загрузить по ID, пробуем по title
          }
        }
        
        // Fallback: пытаемся найти плейлист по title
        try {
          const playlists = await apiClient.getPlaylists();
          const playlist = playlists.find((p: any) => p.title === selectedPlaylist.title);
          if (playlist && playlist.id) {
            const playlistResponse = await apiClient.getPlaylistById(playlist.id);
            if (playlistResponse) {
              // API возвращает PlaylistDetails напрямую (getPlaylistById уже извлекает playlist из ответа)
              const playlistData = playlistResponse;
              // Обновляем обложку плейлиста из БД
              if (playlistData.coverUrl) {
                setPlaylistCoverUrl(resolveImageUrl(playlistData.coverUrl) || null);
              }
              
              const tracks = playlistData.tracks || [];
              if (tracks.length > 0) {
                const formattedTracks = tracks.map((pt: any) => {
                  const track = pt.track || pt;
                  // Обрабатываем разные форматы данных из API
                  const artistName = track.artist?.name || (typeof track.artist === 'string' ? track.artist : 'Unknown Artist');
                  const albumTitle = track.album?.title || (typeof track.album === 'string' ? track.album : 'Unknown Album');
                  return {
                    id: track.id,
                    title: track.title,
                    artist: artistName,
                    image: resolveImageUrl(track.coverUrl || track.coverPath) || selectedPlaylist.image || '',
                    genre: track.genre?.name || 'Unknown',
                    duration: track.duration || 0,
                    audioUrl: resolveAudioUrl(track.audioUrl || track.audioPath),
                    lyricsUrl: track.lyricsPath,
                    playsCount: track.playsCount || 0,
                    album: albumTitle,
                  };
                });
                setPlaylistTracks(formattedTracks);
                // Сохраняем треки в контекст для nextTrack
                setCurrentPlaylistTracks(formattedTracks.map((track: any) => ({
                  id: track.id,
                  title: track.title,
                  artist: track.artist,
                  image: track.image,
                  genre: track.genre || 'Unknown',
                  duration: track.duration || 0,
                  audioUrl: track.audioUrl,
                  playlistTitle: selectedPlaylist.title,
                })));
                return;
              }
            }
          }
        } catch (error) {
          // Игнорируем ошибки
        }
        
        // Если ничего не найдено, возвращаем пустой массив
        setPlaylistTracks([]);
        setCurrentPlaylistTracks([]);
      } catch (error) {
        setPlaylistTracks([]);
      }
    };

    // Сбрасываем обложку при смене плейлиста
    setPlaylistCoverUrl(null);
    loadPlaylistTracks();
  }, [selectedPlaylist, likedTracksList]);

  if (!selectedPlaylist) return null;

  const songs = playlistTracks;

  const handlePlaySong = (song: typeof songs[0]) => {
    // Всегда начинаем трек заново
    const isCurrentSong = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
    
    if (isCurrentSong && isPlaying) {
      // Если трек уже играет, перезапускаем с начала
      seek(0);
      setTimeout(() => {
        if (!isPlaying) {
      togglePlay();
        }
      }, 50);
    } else {
      // Устанавливаем новый трек или переключаемся на него
      setCurrentTrack({
        id: song.id,
        title: song.title,
        artist: song.artist,
        image: song.image,
        genre: song.genre || 'Music',
        duration: typeof song.duration === 'number' ? song.duration : (typeof song.duration === 'string' ? parseInt(song.duration) : 0),
        audioUrl: song.audioUrl ? resolveAudioUrl(song.audioUrl) : undefined,
        lyricsUrl: song.lyricsUrl,
        playlistTitle: selectedPlaylist.title,
      }, selectedPlaylist.title);
    }
  };

  const handleSongClick = (song: typeof songs[0]) => {
    // Одинарный клик - только выделяем трек
    const isCurrentSong = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
    if (!isCurrentSong) {
      setCurrentTrack({
        id: song.id,
        title: song.title,
        artist: song.artist,
        image: song.image,
        genre: song.genre || 'Music',
        duration: typeof song.duration === 'number' ? song.duration : (typeof song.duration === 'string' ? parseInt(song.duration) : 0),
        audioUrl: song.audioUrl ? resolveAudioUrl(song.audioUrl) : undefined,
        lyricsUrl: song.lyricsUrl,
        playlistTitle: selectedPlaylist.title,
      }, selectedPlaylist.title);
    }
  };

  const handleSongDoubleClick = (song: typeof songs[0]) => {
    // Двойной клик - запускаем трек
    handlePlaySong(song);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      const firstSong = songs[0];
      setCurrentTrack({
        id: firstSong.id,
        title: firstSong.title,
        artist: firstSong.artist,
        image: firstSong.image,
        genre: firstSong.genre || 'Music',
        duration: typeof firstSong.duration === 'number' ? firstSong.duration : (typeof firstSong.duration === 'string' ? parseInt(firstSong.duration) : 0),
        audioUrl: firstSong.audioUrl,
        lyricsUrl: firstSong.lyricsUrl,
        playlistTitle: selectedPlaylist.title,
      }, selectedPlaylist.title);
    }
  };

  return (
    <motion.div
      initial={animations ? { opacity: 0, x: 50 } : false}
      animate={animations ? { opacity: 1, x: 0 } : false}
      exit={animations ? { opacity: 0, x: 50 } : false}
      transition={animations ? { duration: 0.4, ease: 'easeOut' } : { duration: 0 }}
      className="flex-1 flex flex-col gap-3 sm:gap-4 md:gap-6 min-w-0 h-full overflow-hidden"
    >
      {/* Back button */}
      <motion.button
        onClick={closePlaylist}
        className="glass px-4 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center gap-2 opacity-70 hover:opacity-100 fast-transition w-fit text-sm sm:text-base text-white"
        whileHover={animations ? { scale: 1.02 } : {}}
        whileTap={animations ? { scale: 0.98 } : {}}
        style={{ overflow: 'visible' }}
      >
        <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span className="leading-none">{t('back')}</span>
      </motion.button>

      {/* Scrollable content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 space-y-4 sm:space-y-5 md:space-y-6 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        {/* Playlist header */}
        <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 md:gap-6 items-center sm:items-end">
            {/* Cover */}
            <motion.div 
              className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 flex-shrink-0 relative"
              initial={animations ? { scale: 0.8, opacity: 0 } : false}
              animate={animations ? { scale: 1, opacity: 1 } : false}
              transition={animations ? { duration: 0.5 } : { duration: 0 }}
            >
              <div className="glass rounded-lg sm:rounded-xl p-1.5 h-full">
                <div className="rounded-md sm:rounded-lg overflow-hidden h-full relative">
                  {selectedPlaylist.type === 'liked' ? (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 50%, #00F5FF 100%)'
                      }}
                    >
                      <Heart className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white fill-white" />
                    </div>
                  ) : (
                    <img 
                      src={playlistCoverUrl || resolveImageUrl(selectedPlaylist.image) || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'} 
                      alt={selectedPlaylist.title} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 space-y-2 pb-2 text-center sm:text-left min-w-0 pr-4">
              <motion.div
                initial={animations ? { opacity: 0, y: 20 } : false}
                animate={animations ? { opacity: 1, y: 0 } : false}
                transition={animations ? { delay: 0.1 } : { duration: 0 }}
                className="min-w-0"
              >
                <p className="text-[10px] sm:text-xs text-white opacity-60 mb-1 sm:mb-2 uppercase tracking-wider">
                  {selectedPlaylist.type === 'album' || selectedPlaylist.albumType === 'album' 
                    ? t('albumType').toUpperCase()
                    : selectedPlaylist.type === 'single' || selectedPlaylist.albumType === 'single'
                    ? t('singleType').toUpperCase()
                    : t('playlist').toUpperCase()}
                </p>
                <h1 className="playlist-title-spotify text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-1 sm:mb-2 break-words overflow-wrap-anywhere">
                  {selectedPlaylist.type === 'liked' || selectedPlaylist.title === 'Liked Songs' ? t('likedSongs') : selectedPlaylist.title}
                </h1>
                {(selectedPlaylist.type === 'album' || selectedPlaylist.albumType === 'album' || selectedPlaylist.type === 'single' || selectedPlaylist.albumType === 'single') ? (
                  <div className="text-white opacity-70 text-xs sm:text-sm break-words">
                    {(() => {
                      const { year, artist } = getAlbumMeta(selectedPlaylist.artist || '');
                      const formatted = artist ? `${year ? `${year} • ` : ''}${artist}` : '';
                      if (!artist) return null;
                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            openArtistView(artist);
                            closePlaylist();
                          }}
                          className="hover:opacity-100 hover:underline whitespace-nowrap"
                        >
                          {formatted}
                        </button>
                      );
                    })()}
                  </div>
                ) : (
                <p className="text-white opacity-70 text-xs sm:text-sm break-words">
                  {selectedPlaylist.artist}
                </p>
                )}
                <p className="text-white text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-2">
                  {language === 'Русский' 
                    ? `${songs.length} ${pluralize(songs.length, 'трек', 'трека', 'треков')}`
                    : `${songs.length} ${pluralizeEn(songs.length, 'song')}`}
                </p>
              </motion.div>

              {/* Play and Shuffle buttons */}
              <motion.div
                className="pt-2 sm:pt-3 flex items-center gap-3"
                initial={animations ? { opacity: 0, y: 10 } : false}
                animate={animations ? { opacity: 1, y: 0 } : false}
                transition={animations ? { delay: 0.2 } : { duration: 0 }}
              >
                <button
                  onClick={handlePlayAll}
                  className="px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-full flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 shadow-xl text-sm sm:text-base"
                  style={{
                    background: '#1ED760',
                    color: '#000',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" style={{ fill: '#000', color: '#000' }} />
                  <span className="font-semibold">{t('play')}</span>
                </button>
                <button
                  onClick={toggleShuffle}
                  className={`px-4 py-2.5 sm:py-3 rounded-full border flex items-center gap-2 text-sm transition-all duration-300 hover:scale-105 ${
                    shuffle 
                      ? 'border-[#1ED760] bg-[#1ED760]/10 text-[#1ED760]' 
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  <span className="font-semibold">{t('shuffle')}</span>
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Songs list */}
        <div className="glass-strong rounded-xl sm:rounded-2xl overflow-hidden">
          {/* Table header - Hidden on mobile */}
          <div className={`hidden sm:grid gap-3 sm:gap-4 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 border-b border-white/10 text-[10px] sm:text-xs text-white opacity-50 uppercase tracking-wider ${
            selectedPlaylist.type === 'album' || selectedPlaylist.albumType === 'album' || selectedPlaylist.type === 'single' || selectedPlaylist.albumType === 'single'
              ? 'grid-cols-[1fr_80px]'
              : 'grid-cols-[50px_1fr_160px_80px] md:grid-cols-[50px_minmax(200px,1fr)_180px_80px]'
          }`}>
            {(selectedPlaylist.type !== 'album' && selectedPlaylist.albumType !== 'album' && selectedPlaylist.type !== 'single' && selectedPlaylist.albumType !== 'single') && (
            <div className="text-center">#</div>
            )}
            <div className="truncate">{t('title')}</div>
            {(selectedPlaylist.type !== 'album' && selectedPlaylist.albumType !== 'album' && selectedPlaylist.type !== 'single' && selectedPlaylist.albumType !== 'single') && (
            <div className="hidden md:block truncate">{t('album')}</div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>

          {/* Songs */}
          <div>
            {songs.map((song, index) => {
              const isCurrentSong = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
              const isSongPlaying = isCurrentSong && isPlaying;

              return (
                <motion.div
                  key={song.id}
                  initial={animations ? { opacity: 0, y: 10 } : false}
                  animate={animations ? { opacity: 1, y: 0 } : false}
                  transition={animations ? { delay: index * 0.03 } : { duration: 0 }}
                  onClick={() => handleSongClick(song)}
                  onDoubleClick={() => handleSongDoubleClick(song)}
                  className={`grid gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 hover:bg-white/5 transition-all duration-200 cursor-pointer group border-b border-white/5 last:border-0 ${
                    selectedPlaylist.type === 'album' || selectedPlaylist.albumType === 'album' || selectedPlaylist.type === 'single' || selectedPlaylist.albumType === 'single'
                      ? 'grid-cols-[40px_1fr_60px] sm:grid-cols-[50px_1fr_80px]'
                      : 'grid-cols-[40px_1fr_60px] sm:grid-cols-[50px_1fr_80px] md:grid-cols-[50px_minmax(200px,1fr)_180px_80px]'
                  }`}
                  style={isCurrentSong ? {
                    backgroundColor: 'rgba(30, 215, 96, 0.1)',
                  } : {}}
                >
                  {/* Index / Play button */}
                  <div className="flex items-center justify-center">
                    {isSongPlaying ? (
                      <MusicVisualizer color="#1ED760" />
                    ) : (
                      <>
                        <span className="group-hover:hidden text-xs sm:text-sm text-white opacity-50">
                          {index + 1}
                        </span>
                        <Play 
                          className="hidden group-hover:block w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current opacity-70"
                          style={{ color: isCurrentSong ? '#1ED760' : 'white' }}
                        />
                      </>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Показываем картинку только если это не альбом/сингл */}
                    {!(selectedPlaylist.type === 'album' || selectedPlaylist.albumType === 'album' || selectedPlaylist.type === 'single' || selectedPlaylist.albumType === 'single') && (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex-shrink-0 rounded-md sm:rounded-lg overflow-hidden glass p-0.5">
                      <img src={song.image} alt={song.title} className="w-full h-full object-cover rounded-sm sm:rounded-md" />
                    </div>
                    )}
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                      <p 
                            className="text-sm sm:text-base truncate mb-0 sm:mb-0.5 transition-colors duration-300 flex-1"
                        style={{ 
                          color: isCurrentSong ? '#1ED760' : 'white',
                          fontWeight: isCurrentSong ? '600' : '500',
                        }}
                      >
                        {song.title}
                      </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                              e.preventDefault();
                          openArtistView(song.artist);
                          closePlaylist();
                        }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="text-xs sm:text-sm text-white opacity-50 hover:opacity-100 hover:underline truncate text-left"
                      >
                        {song.artist}
                      </button>
                          {song.playsCount !== undefined && song.playsCount > 0 && (
                            <span className="text-xs sm:text-sm text-white opacity-60 leading-none ml-4 tabular-nums">
                                {song.playsCount.toLocaleString('en-US')}
                              </span>
                          )}
                        </div>
                      </div>
                      <TrackMenu
                        track={{
                          id: song.id,
                          title: song.title,
                          artist: song.artist,
                          image: song.image,
                          album: song.album,
                          albumId: song.albumId,
                          audioUrl: song.audioUrl,
                          duration: typeof song.duration === 'number' ? song.duration : (typeof song.duration === 'string' ? parseInt(song.duration) : 0),
                          genre: song.genre || 'Unknown',
                          playlistTitle: selectedPlaylist.title,
                        }}
                      />
                    </div>
                  </div>

                  {/* Album - Hidden on mobile and when viewing album/single */}
                  {(selectedPlaylist.type !== 'album' && selectedPlaylist.albumType !== 'album' && selectedPlaylist.type !== 'single' && selectedPlaylist.albumType !== 'single') && (
                  <div 
                    className="hidden md:flex items-center min-w-0 relative z-10" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    {song.albumId ? (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          try {
                            // Загружаем данные альбома для получения правильного типа
                            const albums = await apiClient.getAlbums({ limit: 1000 });
                            const album = albums.find((a: any) => a.id === song.albumId);
                            if (album) {
                              const albumType = album.type === 'album' ? 'album' : 'single';
                              openPlaylist({
                                title: album.title,
                                artist: `${album.year ? `${album.year} • ` : ''}${album.artist?.name || song.artist}`,
                                image: album.coverUrl || album.coverPath || '',
                                type: albumType,
                                albumId: album.id,
                                albumType: albumType,
                              });
                              closePlaylist();
                            }
                          } catch (error) {
                            console.error('Error loading album:', error);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="text-sm text-white opacity-50 hover:opacity-100 hover:underline truncate text-left cursor-pointer"
                      >
                        {song.album}
                      </button>
                    ) : (
                    <p className="text-sm text-white opacity-50 truncate">
                      {song.album}
                    </p>
                    )}
                  </div>
                  )}

                  {/* Duration */}
                  <div className="flex items-center justify-end">
                    <span className="text-xs sm:text-sm text-white opacity-50 tabular-nums">
                      {formatDuration(song.duration || 0)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
