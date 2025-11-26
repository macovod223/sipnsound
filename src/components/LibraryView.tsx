import { motion } from 'motion/react';
import { Music, Clock, Heart, ListMusic, TrendingUp, Play, ArrowLeft, Pause } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { useSettings } from './SettingsContext';
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { resolveImageUrl } from '../utils/media';

type CategoryView = 'browse' | 'liked-songs' | 'playlists' | 'albums' | 'artists' | 'recently-played';

export function LibraryView() {
  const { setCurrentTrack, currentTrack, isPlaying, togglePlay, openArtistView, closePlaylist, openPlaylist, libraryReturnCategory, likedTracksList } = usePlayer();
  const settings = useSettings();
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryView>('browse');

  // When returning from playlist/album, set the correct category
  useEffect(() => {
    if (libraryReturnCategory && libraryReturnCategory !== 'browse') {
      setActiveCategory(libraryReturnCategory as CategoryView);
    }
  }, [libraryReturnCategory]);

  // State for liked tracks
  const [allTracks, setAllTracks] = useState<any[]>([]);
  
  // Load liked tracks
  useEffect(() => {
    const loadLikedTracks = async () => {
      try {
        const response = await apiClient.getLikedTracks();
        if (response && response.tracks) {
          const formattedTracks = response.tracks.map((track: any) => ({
            id: track.id,
            title: track.title,
            artist: typeof track.artist === 'string' ? track.artist : (track.artist?.name || 'Unknown Artist'),
            image: track.image || track.coverUrl || track.coverPath || '',
            genre: typeof track.genre === 'string' ? track.genre : (track.genre?.name || 'Unknown'),
            duration: track.duration || 0,
            audioUrl: track.audioUrl || track.audioPath,
            playsCount: track.playsCount || 0,
            album: typeof track.album === 'string' ? track.album : (track.album?.title || 'Unknown Album'),
          }));
          setAllTracks(formattedTracks);
        } else {
          setAllTracks([]);
        }
      } catch (error) {
        setAllTracks([]);
      }
    };
    loadLikedTracks();
  }, [likedTracksList]);
  
  // State for playlists from database
  const [playlistsData, setPlaylistsData] = useState<Array<{ id: string; title: string; count: number; image: string }>>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // State for albums and artists from database
  const [albumsData, setAlbumsData] = useState<Array<{ title: string; artist: string; year?: number; image: string; id: string; type: 'album' | 'single' }>>([]);
  const [artistsData, setArtistsData] = useState<Array<{ name: string; image: string; id: string }>>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);

  // Load albums and artists in parallel for better performance
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingAlbums(true);
      setIsLoadingArtists(true);
      try {
        // Загружаем альбомы и артистов параллельно
        const [albums, artists] = await Promise.all([
          apiClient.getAlbums({ limit: 100 }),
          apiClient.getFollowingArtists(),
        ]);

        const formattedAlbums = albums.map((album) => ({
          id: album.id,
          title: album.title,
          artist: album.artist.name,
          year: album.year,
          image: album.coverUrl || album.coverPath || '',
          type: album.type,
        }));

        const formattedArtists = artists.map((artist) => ({
          id: artist.id,
          name: artist.name,
          image: artist.imageUrl || artist.imagePath || '',
        }));

        setAlbumsData(formattedAlbums);
        setArtistsData(formattedArtists);
      } catch (error) {
        // Ошибки уже обрабатываются toast в apiClient
        setAlbumsData([]);
        setArtistsData([]);
      } finally {
        setIsLoadingAlbums(false);
        setIsLoadingArtists(false);
      }
    };
    loadData();
    
    // Слушаем событие обновления артистов
    const handleRefresh = () => {
      loadArtists();
    };
    window.addEventListener('artists:refresh', handleRefresh);
    return () => {
      window.removeEventListener('artists:refresh', handleRefresh);
    };
  }, []);

  // State for liked tracks count
  const [likedTracksCount, setLikedTracksCount] = useState(0);
  
  // Load liked tracks count
  useEffect(() => {
    const loadLikedCount = async () => {
      try {
        const response = await apiClient.getLikedTracks();
        setLikedTracksCount(response?.tracks?.length || 0);
      } catch (error) {
        setLikedTracksCount(0);
      }
    };
    loadLikedCount();
  }, []);

  const libraryCategories = [
    {
      icon: Heart,
      title: settings.t('likedSongs'),
      count: likedTracksCount,
      color: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 50%, #00F5FF 100%)',
      subtitle: `${likedTracksCount} ${settings.t('items')}`,
    },
    {
      icon: ListMusic,
      title: settings.t('playlists'),
      count: playlistsData.length,
      color: 'linear-gradient(135deg, #1ED760 0%, #1DB954 100%)',
      subtitle: `${playlistsData.length} ${settings.t('items')}`,
    },
    {
      icon: Music,
      title: settings.t('albums'),
      count: albumsData.length,
      color: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      subtitle: `${albumsData.length} ${settings.t('items')}`,
    },
    {
      icon: TrendingUp,
      title: settings.t('artists'),
      count: artistsData.length,
      color: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      subtitle: `${artistsData.length} ${settings.t('items')}`,
    },
    {
      icon: Clock,
      title: settings.t('recentlyPlayed'),
      count: allTracks.slice(0, 20).length,
      color: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      subtitle: `${allTracks.slice(0, 20).length} ${settings.t('items')}`,
    },
  ];

  // Use real tracks for recently played
  const recentlyPlayed = allTracks.slice(0, 5).map((track, index) => ({
    ...track,
    time: index === 0 ? '2 hours ago' : index === 1 ? '5 hours ago' : index === 2 ? 'Yesterday' : index === 3 ? 'Yesterday' : '2 days ago',
  }));

  const handleTrackPlay = (track: any) => {
    const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === track.artist;
    
    if (isCurrentTrack && isPlaying) {
      togglePlay();
    } else {
      setCurrentTrack(track, track.playlistTitle || 'Library');
    }
  };

  const handleCategoryClick = (categoryTitle: string) => {
    // Map category titles to view types
    const { t } = settings;
    switch (categoryTitle) {
      case t('likedSongs'):
        setActiveCategory('liked-songs');
        break;
      case t('playlists'):
        setActiveCategory('playlists');
        break;
      case t('albums'):
        setActiveCategory('albums');
        break;
      case t('artists'):
        setActiveCategory('artists');
        break;
      case t('recentlyPlayed'):
        setActiveCategory('recently-played');
        break;
      default:
        setActiveCategory('browse');
    }
  };

  // Motion props based on animation settings
  const getMotionProps = (delay = 0) => {
    if (!settings.animations) {
      return {
        initial: false,
        animate: false,
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay },
    };
  };

  // Render different views based on active category
  const renderCategoryView = () => {
    switch (activeCategory) {
      case 'liked-songs':
        return renderLikedSongs();
      case 'playlists':
        return renderPlaylists();
      case 'albums':
        return renderAlbums();
      case 'artists':
        return renderArtists();
      case 'recently-played':
        return renderRecentlyPlayed();
      default:
        return renderBrowse();
    }
  };

  const renderBrowse = () => (
    <section>
      <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
        {settings.t('browse')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {libraryCategories.map((category, index) => (
          <motion.button
            key={category.title}
            {...getMotionProps(index * 0.05)}
            onClick={() => handleCategoryClick(category.title)}
            className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 text-left fast-transition hover:scale-105 gpu-accelerated relative overflow-hidden group cursor-pointer"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Gradient background on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-20 fast-transition"
              style={{ background: category.color }}
            />

            <div className="relative z-10 flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: category.color,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                <category.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-white text-base sm:text-lg mb-1">
                  {category.title}
                </h3>
                <p className="text-white opacity-60 text-sm">
                  {category.subtitle}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );

  const renderLikedSongs = () => (
    <section>
      <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
        {settings.t('likedSongsTitle')}
      </h2>
      <div className="space-y-2">
        {allTracks.map((track, index) => {
          const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === track.artist;
          const isThisPlaying = isCurrentTrack && isPlaying;
          
          return (
            <motion.div
              key={index}
              {...getMotionProps(index * 0.02)}
              onMouseEnter={() => setHoveredTrack(track.title)}
              onMouseLeave={() => setHoveredTrack(null)}
              className="glass rounded-xl p-3 sm:p-4 w-full fast-transition hover:scale-[1.02] gpu-accelerated flex items-center gap-3 sm:gap-4 group relative cursor-pointer"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Cover with play button */}
              <button
                onClick={() => handleTrackPlay(track)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 relative"
              >
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-110 fast-transition"
                />
                
                <div
                  className={`absolute inset-0 bg-black/40 flex items-center justify-center fast-transition ${
                    hoveredTrack === track.title || isCurrentTrack ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center fast-transition hover:scale-110"
                    style={{
                      background: isThisPlaying ? '#1ED760' : 'rgba(255, 255, 255, 0.9)',
                      color: '#000',
                    }}
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                  </div>
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleTrackPlay(track)}
                  className="text-left w-full"
                >
                  <h4 className={`text-sm sm:text-base truncate mb-0.5 ${isCurrentTrack ? 'text-[#1ED760]' : 'text-white'}`}>
                    {track.title}
                  </h4>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openArtistView(track.artist);
                    closePlaylist();
                  }}
                  className="text-white opacity-60 hover:opacity-100 hover:underline text-xs sm:text-sm truncate text-left w-full"
                >
                  {track.artist}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );

  // Load playlists from database
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setIsLoadingPlaylists(true);
        const playlists = await apiClient.getPlaylists();
        const formattedPlaylists = playlists.map((playlist: any) => ({
          id: playlist.id,
          title: playlist.title,
          count: playlist._count?.tracks || 0,
          image: resolveImageUrl(playlist.coverUrl) || '',
        }));
        setPlaylistsData(formattedPlaylists);
      } catch (error) {
        setPlaylistsData([]);
      } finally {
        setIsLoadingPlaylists(false);
      }
    };
    loadPlaylists();
  }, []);

  const renderPlaylists = () => {
    const handlePlaylistClick = (playlist: { id: string; title: string; image: string; count: number }) => {
      // Убеждаемся, что обложка правильно разрешена
      const resolvedImage = resolveImageUrl(playlist.image) || playlist.image;
      openPlaylist({ 
        id: playlist.id,
        title: playlist.title, 
        artist: `${playlist.count} ${playlist.count === 1 ? settings.t('track') : settings.t('tracks')}`, 
        image: resolvedImage,
        type: playlist.title === 'Liked Songs' ? 'liked' : 'playlist',
        returnTo: 'playlists'
      });
    };

    const handlePlaylistPlay = async (e: React.MouseEvent, playlist: { id: string; title: string; image: string; count: number }) => {
      e.stopPropagation();
      
      // Если плейлист не существует, открываем его как плейлист для загрузки треков
      if (playlist.title === 'Liked Songs') {
        openPlaylist({
          title: 'Liked Songs',
          artist: 'Ваши любимые треки',
          image: '',
          type: 'liked',
        });
      } else {
        // Убеждаемся, что обложка правильно разрешена
        const resolvedImage = resolveImageUrl(playlist.image) || playlist.image;
        openPlaylist({
          id: playlist.id,
          title: playlist.title,
          artist: 'Плейлист',
          image: resolvedImage,
          type: 'playlist',
        });
      }
    };

    return (
      <section>
        <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
          {settings.t('yourPlaylists')}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {isLoadingPlaylists ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
            </div>
          ) : playlistsData.length === 0 ? (
            <div className="col-span-full text-center text-white/60 py-8">
              {'Нет плейлистов'}
            </div>
          ) : (
            playlistsData.map((playlist: { id: string; title: string; image: string; count: number }, index: number) => {
            const isCurrentPlaylist = currentTrack?.playlistTitle === playlist.title;
            const isThisPlaying = isCurrentPlaylist && isPlaying;
            const isHovered = hoveredPlaylist === playlist.title;

            return (
              <motion.div
                key={playlist.title}
                {...getMotionProps(index * 0.03)}
                onClick={() => handlePlaylistClick(playlist)}
                onMouseEnter={() => setHoveredPlaylist(playlist.title)}
                onMouseLeave={() => setHoveredPlaylist(null)}
                className="glass-card rounded-xl p-3 sm:p-4 fast-transition hover:scale-105 hover:-translate-y-1 gpu-accelerated cursor-pointer group relative overflow-hidden"
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 pointer-events-none fast-transition gpu-accelerated"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.15) 0%, rgba(29, 185, 84, 0.10) 100%)',
                    opacity: isHovered ? 1 : 0
                  }}
                />

                {/* Square playlist cover */}
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 relative">
                  {playlist.title === 'Liked Songs' ? (
                    <div 
                      className="w-full h-full flex items-center justify-center relative"
                      style={{ 
                        background: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 50%, #00F5FF 100%)',
                      }}
                    >
                      <Heart className="w-12 h-12 sm:w-14 sm:h-14 text-white fill-white" />
                    </div>
                  ) : (
                    <img
                      src={resolveImageUrl(playlist.image) || playlist.image}
                      alt={playlist.title}
                      className="w-full h-full object-cover fast-transition gpu-accelerated"
                      style={{
                        transform: isHovered ? 'scale(1.08) translateZ(0)' : 'scale(1) translateZ(0)'
                      }}
                    />
                  )}
                  
                  {/* Play button on hover - показываем только если плейлист существует или это "Liked Songs" */}
                  {(playlist.title === 'Liked Songs') && (
                  <motion.div
                    className="absolute bottom-2 right-2"
                    initial={{ opacity: 0, scale: 0, y: 8 }}
                    animate={{
                      opacity: isHovered || isThisPlaying ? 1 : 0,
                      scale: isHovered || isThisPlaying ? 1 : 0,
                      y: isHovered || isThisPlaying ? 0 : 8,
                    }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <motion.button
                      onClick={(e) => handlePlaylistPlay(e, playlist)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: '#1ED760',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" />
                      ) : (
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-0.5" />
                      )}
                    </motion.button>
                  </motion.div>
                  )}
                </div>

                {/* Playlist info */}
                <div className="relative z-10">
                  <h4 className="text-white text-xs sm:text-sm truncate mb-1">
                    {playlist.title}
                  </h4>
                  <p className="text-white opacity-60 text-xs truncate">
                    {playlist.count} {playlist.count === 1 ? settings.t('track') : settings.t('tracks')}
                  </p>
                </div>
              </motion.div>
            );
          })
          )}
        </div>
      </section>
    );
  };

  const renderRecentlyPlayed = () => (
    <section>
      <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
        {settings.t('recentlyPlayedTitle')}
      </h2>
      <div className="space-y-2">
        {recentlyPlayed.map((track, index) => {
          const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === track.artist;
          const isThisPlaying = isCurrentTrack && isPlaying;
          
          return (
            <motion.div
              key={index}
              {...getMotionProps(index * 0.05)}
              onMouseEnter={() => setHoveredTrack(track.title)}
              onMouseLeave={() => setHoveredTrack(null)}
              className="glass rounded-xl p-3 sm:p-4 w-full fast-transition hover:scale-[1.02] gpu-accelerated flex items-center gap-3 sm:gap-4 group relative"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              <button
                onClick={() => handleTrackPlay(track)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 relative"
              >
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-110 fast-transition"
                />
                
                <div
                  className={`absolute inset-0 bg-black/40 flex items-center justify-center fast-transition ${
                    hoveredTrack === track.title || isCurrentTrack ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center fast-transition hover:scale-110"
                    style={{
                      background: isThisPlaying ? '#1ED760' : 'rgba(255, 255, 255, 0.9)',
                      color: '#000',
                    }}
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                  </div>
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleTrackPlay(track)}
                  className="text-left w-full"
                >
                  <h4 className={`text-sm sm:text-base truncate mb-0.5 ${isCurrentTrack ? 'text-[#1ED760]' : 'text-white'}`}>
                    {track.title}
                  </h4>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openArtistView(track.artist);
                    closePlaylist();
                  }}
                  className="text-white opacity-60 hover:opacity-100 hover:underline text-xs sm:text-sm truncate text-left w-full"
                >
                  {track.artist}
                </button>
              </div>

              <div className="text-white opacity-50 text-xs sm:text-sm flex-shrink-0">
                {track.time}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );

  const renderAlbums = () => {
    const handleAlbumClick = (album: { title: string; artist: string; image: string; year?: number; id: string; type: 'album' | 'single' }) => {
      // Open album as a playlist
      openPlaylist({ 
        title: album.title, 
        artist: `${album.year ? `${album.year} • ` : ''}${album.artist}`, 
        image: album.image,
        type: album.type,
        albumId: album.id,
        albumType: album.type,
        returnTo: 'albums'
      });
    };

    const handleAlbumPlay = (e: React.MouseEvent, album: { title: string; artist: string; image: string; year?: number; id: string; type: 'album' | 'single' }) => {
      e.stopPropagation();
      // Get random tracks for this album (since we don't have real album data)
      const tracks: any[] = [];
      if (!tracks || tracks.length === 0) return;
      
      setCurrentTrack(tracks[0], album.title);
    };

    return (
      <section>
        <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
          {settings.t('yourAlbums')}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {isLoadingAlbums ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
            </div>
          ) : albumsData.length === 0 ? (
            <div className="col-span-full text-center text-white/60 py-8">
              {settings.t('albumsNotFound')}
            </div>
          ) : (
            albumsData.map((album, index) => {
            const isHovered = hoveredPlaylist === album.title;

            return (
              <motion.div
                key={index}
                {...getMotionProps(index * 0.03)}
                onClick={() => handleAlbumClick({ ...album, year: album.year || undefined })}
                onMouseEnter={() => setHoveredPlaylist(album.title)}
                onMouseLeave={() => setHoveredPlaylist(null)}
                className="glass-card rounded-xl p-3 sm:p-4 fast-transition hover:scale-105 hover:-translate-y-1 gpu-accelerated cursor-pointer group relative overflow-hidden"
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 pointer-events-none fast-transition gpu-accelerated"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.15) 0%, rgba(29, 185, 84, 0.10) 100%)',
                    opacity: isHovered ? 1 : 0
                  }}
                />

                {/* Square album cover */}
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 relative">
                  <img
                    src={resolveImageUrl(album.image) || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'}
                    alt={album.title}
                    className="w-full h-full object-cover fast-transition gpu-accelerated"
                    style={{
                      transform: isHovered ? 'scale(1.08) translateZ(0)' : 'scale(1) translateZ(0)'
                    }}
                  />
                  
                  {/* Play button on hover */}
                  <motion.div
                    className="absolute bottom-2 right-2"
                    initial={{ opacity: 0, scale: 0, y: 8 }}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      scale: isHovered ? 1 : 0,
                      y: isHovered ? 0 : 8,
                    }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <motion.button
                      onClick={(e) => handleAlbumPlay(e, { ...album, year: album.year || 0 })}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: '#1ED760',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black ml-0.5" />
                    </motion.button>
                  </motion.div>
                </div>

                {/* Album info */}
                <div className="relative z-10">
                  <h4 className="text-white text-xs sm:text-sm truncate mb-1">
                    {album.title}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Находим артиста по имени для получения ID
                      const artist = artistsData.find(a => a.name === album.artist);
                      if (artist) {
                        openArtistView({ id: artist.id, name: album.artist });
                      } else {
                      openArtistView(album.artist);
                      }
                      closePlaylist();
                    }}
                    className="text-white opacity-60 hover:opacity-100 hover:underline text-xs truncate text-left w-full"
                  >
                    {album.year ? `${album.year} • ` : ''}{album.artist}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPlaylist({
                        title: album.title,
                        artist: `${album.year || ''} • ${album.artist}`,
                        image: resolveImageUrl(album.image) || '',
                        type: album.type,
                        albumId: album.id,
                        albumType: album.type,
                      });
                      closePlaylist();
                    }}
                    className="text-white opacity-60 hover:opacity-100 hover:underline text-xs truncate text-left w-full mt-1"
                  >
                    {album.type === 'single' ? settings.t('singleType') : settings.t('albumType')}
                  </button>
                </div>
              </motion.div>
            );
          })
          )}
        </div>
      </section>
    );
  };

  const renderArtists = () => (
    <section>
      <h2 className="section-heading-spotify text-xl sm:text-2xl md:text-3xl text-white mb-4">
        {settings.t('yourArtists')}
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-5 md:gap-6">
        {isLoadingArtists ? (
          <div className="col-span-full flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
          </div>
        ) : artistsData.length === 0 ? (
          <div className="col-span-full text-center text-white/60 py-8">
            {settings.t('artistsNotFound')}
          </div>
        ) : (
          artistsData.map((artist, index) => (
          <motion.button
            key={index}
            {...getMotionProps(index * 0.03)}
            onClick={() => {
              openArtistView({ id: artist.id, name: artist.name });
              closePlaylist();
            }}
            className="fast-transition hover:scale-105 gpu-accelerated cursor-pointer group"
          >
            {/* Circular artist image */}
            <div className="w-full aspect-square rounded-full overflow-hidden mb-3 relative">
              <img
                src={resolveImageUrl(artist.image) || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'}
                alt={artist.name}
                className="w-full h-full object-cover group-hover:scale-110 fast-transition"
              />
            </div>

            {/* Artist name */}
            <div className="text-center">
              <h4 className="text-white text-xs sm:text-sm truncate">
                {artist.name}
              </h4>
            </div>
          </motion.button>
          ))
        )}
      </div>
    </section>
  );

  return (
    <motion.div
      {...(settings.animations ? {
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
      {/* Header */}
      <div className="flex-shrink-0">
        {activeCategory !== 'browse' && (
          <motion.button
            onClick={() => setActiveCategory('browse')}
            className="glass px-4 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center gap-2 opacity-70 hover:opacity-100 fast-transition w-fit text-sm sm:text-base text-white mb-4"
            {...(settings.animations ? {
              whileHover: { x: -4, scale: 1.02 },
              whileTap: { scale: 0.98 },
            } : {})}
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="leading-none">{settings.t('back')}</span>
          </motion.button>
        )}
        
        <motion.h1
          {...getMotionProps(0)}
          className="playlist-title-spotify text-3xl sm:text-4xl md:text-5xl text-white mb-2"
        >
          {settings.t('yourLibrary')}
        </motion.h1>
        <motion.p
          {...getMotionProps(0.1)}
          className="text-white opacity-70 text-sm sm:text-base"
        >
          {settings.t('allYourMusicInOnePlace')}
        </motion.p>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 space-y-6 sm:space-y-8 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        {renderCategoryView()}
      </div>
    </motion.div>
  );
}
