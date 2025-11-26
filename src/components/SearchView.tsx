import { motion } from 'motion/react';
import { useSettings } from './SettingsContext';
import { usePlayer } from './PlayerContext';
import { Music, User, Disc, ListMusic, Play, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { apiClient, ArtistSummary, Track as ApiTrack } from '../api/client';
import { resolveAudioUrl, resolveImageUrl } from '@/utils/media';
import { formatDuration } from '../utils/time';

interface SearchResult {
  type: 'track' | 'artist' | 'playlist' | 'album';
  title: string;
  subtitle?: string;
  image: string;
  data?: any;
}

interface SearchViewProps {
  searchQuery: string;
  onClose: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400';


export function SearchView({ searchQuery, onClose }: SearchViewProps) {
  const { t } = useSettings();
  const { setCurrentTrack, openPlaylist, openArtistView } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'track' | 'artist' | 'playlist' | 'album'>('all');
  const [remoteArtists, setRemoteArtists] = useState<ArtistSummary[]>([]);
  const [remoteTracks, setRemoteTracks] = useState<ApiTrack[]>([]);
  const [remoteAlbums, setRemoteAlbums] = useState<Array<{id: string; title: string; year?: number; type: string; artist: {id: string; name: string}; coverUrl?: string; coverPath?: string}>>([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const upperCaseQuery = trimmedQuery.toUpperCase();

  useEffect(() => {
    if (!trimmedQuery) {
      setRemoteArtists([]);
      setRemoteTracks([]);
      setRemoteAlbums([]);
      setRemoteError(null);
      return;
    }

    let cancelled = false;
    setIsRemoteLoading(true);
    setRemoteError(null);

    const handler = setTimeout(async () => {
      const fetchTracks = async (query: string) => {
        const resp = await apiClient.getTracks({ search: query, limit: 8, includeAll: true });
        return resp?.tracks ?? [];
      };

      try {
        const artistsPromise = apiClient.getArtists({ search: trimmedQuery, limit: 8 });
        const albumsPromise = apiClient.getAlbums({ search: trimmedQuery, limit: 8 });

        const queryVariants = Array.from(
          new Set([trimmedQuery, upperCaseQuery, normalizedQuery].filter(Boolean))
        ) as string[];

        let tracks: ApiTrack[] = [];
        for (const variant of queryVariants) {
          tracks = await fetchTracks(variant);
          if (tracks.length) break;
        }

        const [artistsData, albumsData] = await Promise.all([artistsPromise, albumsPromise]);

        if (!cancelled) {
          setRemoteArtists(artistsData);
          setRemoteTracks(tracks);
          setRemoteAlbums(albumsData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Search error', err);
          setRemoteArtists([]);
          setRemoteTracks([]);
          setRemoteAlbums([]);
          setRemoteError('Не удалось загрузить результаты');
        }
      } finally {
        if (!cancelled) {
          setIsRemoteLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [trimmedQuery, normalizedQuery, upperCaseQuery]);

  const backendResults = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    const matchesQuery = (value?: string | null) =>
      normalizedQuery ? (value || '').toLowerCase().includes(normalizedQuery) : true;

    const trackResults: SearchResult[] = remoteTracks
      .filter(
        (track) =>
          matchesQuery(track.title) ||
          matchesQuery(track.artist?.name) ||
          matchesQuery(track.album?.title)
      )
      .map((track) => ({
      type: 'track',
      title: track.title,
      subtitle: track.artist?.name,
        image:
          resolveImageUrl(
            track.coverUrl || (track as any).coverPath || track.album?.coverUrl || null,
            FALLBACK_IMAGE
          ) || FALLBACK_IMAGE,
      data: track,
    }));

    const artistResults: SearchResult[] = remoteArtists
      .filter((artist) => matchesQuery(artist.name) || matchesQuery(artist.bio))
      .map((artist) => ({
      type: 'artist',
      title: artist.name,
      subtitle: artist.bio || undefined,
        image: resolveImageUrl(artist.imageUrl || (artist as any).imagePath, FALLBACK_IMAGE) || FALLBACK_IMAGE,
      data: artist,
    }));

    const albumResults: SearchResult[] = remoteAlbums
      .filter((album) => matchesQuery(album.title) || matchesQuery(album.artist?.name))
      .map((album) => ({
        type: 'album',
        title: album.title,
        subtitle: `${album.artist?.name || 'Unknown'} • ${album.year || '—'} • ${album.type === 'single' ? 'Сингл' : 'Альбом'}`,
        image: resolveImageUrl(album.coverUrl || album.coverPath, FALLBACK_IMAGE) || FALLBACK_IMAGE,
        data: album,
      }));

    return [...trackResults, ...artistResults, ...albumResults];
  }, [remoteTracks, remoteArtists, remoteAlbums, normalizedQuery, t]);

  const filteredResults = useMemo(() => {
    if (selectedCategory === 'all') {
      return backendResults;
    }
    return backendResults.filter((item) => item.type === selectedCategory);
  }, [backendResults, selectedCategory]);

  // Группировка результатов по типу для режима "all"
  const groupedResults = useMemo(() => {
    if (selectedCategory !== 'all') return null;

    const groups = {
      track: filteredResults.filter(r => r.type === 'track').slice(0, 4),
      artist: filteredResults.filter(r => r.type === 'artist').slice(0, 4),
      playlist: filteredResults.filter(r => r.type === 'playlist').slice(0, 4),
      album: filteredResults.filter(r => r.type === 'album').slice(0, 4),
    };

    return groups;
  }, [filteredResults, selectedCategory]);

  const handleItemClick = async (item: SearchResult) => {
    switch (item.type) {
      case 'track':
        {
          let trackData = item.data as ApiTrack | undefined;

          if (trackData?.id) {
            try {
              const response = await apiClient.getTrackById(trackData.id);
              trackData = response.track as ApiTrack;
            } catch (error) {
              console.error('Track hydrate error', error);
            }
          }

          const resolvedAudioUrl = resolveAudioUrl(
            trackData?.audioUrl || (trackData as any)?.audioPath
          );
          const resolvedImage =
            resolveImageUrl(
              trackData?.coverUrl ||
                (trackData as any)?.coverPath ||
                trackData?.album?.coverUrl ||
                (trackData as any)?.album?.coverPath ||
                trackData?.artist?.imageUrl ||
                (trackData as any)?.artist?.imagePath,
              item.image || FALLBACK_IMAGE
            ) || item.image || FALLBACK_IMAGE;

          setCurrentTrack(
            {
              id: trackData?.id,
              title: trackData?.title || item.title,
              artist: trackData?.artist?.name || item.subtitle || '',
              image: resolvedImage,
              genre: trackData?.genre?.name || 'Music',
              duration: trackData?.duration || 180,
              audioUrl: resolvedAudioUrl,
              lyrics: trackData?.lyrics,
              lyricsUrl: undefined,
              playlistTitle: 'Search Results',
            },
            'Search Results'
          );
          onClose();
        }
        break;
      case 'artist':
        openArtistView(item.title);
        onClose();
        break;
      case 'playlist':
        openPlaylist({
          title: item.title,
          artist: item.subtitle || '',
          image: item.image,
        });
        onClose();
        break;
      case 'album':
        {
          const album = item.data as any;
          if (album?.id) {
            const albumType = album.type?.toLowerCase() === 'album' ? 'album' : 'single';
        openPlaylist({
              title: album.title || item.title,
              artist: `${album.year || ''} • ${album.artist?.name || 'Unknown'}`,
          image: item.image,
              type: albumType,
              albumId: album.id,
              albumType: albumType,
        });
          }
        }
        onClose();
        break;
    }
  };

  const categories = [
    { id: 'all' as const, label: t('all'), icon: Music },
    { id: 'track' as const, label: t('tracks'), icon: Music },
    { id: 'artist' as const, label: t('artists'), icon: User },
    { id: 'playlist' as const, label: t('playlists'), icon: ListMusic },
    { id: 'album' as const, label: t('albums'), icon: Disc },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'track': return <Music className="w-5 h-5" />;
      case 'artist': return <User className="w-5 h-5" />;
      case 'playlist': return <ListMusic className="w-5 h-5" />;
      case 'album': return <Disc className="w-5 h-5" />;
      default: return <Music className="w-5 h-5" />;
    }
  };

  if (!trimmedQuery) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#b3b3b3' }} />
          <h3 className="mb-2" style={{ color: '#ffffff' }}>{t('searchForMusic')}</h3>
          <p style={{ color: '#b3b3b3' }}>{t('searchPlaceholder')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 flex-shrink-0 instant-transition gpu-accelerated hover:scale-105 ${
              selectedCategory === category.id ? 'glass-card' : ''
            }`}
            style={selectedCategory === category.id ? {
              background: '#1ED760',
              color: '#000000',
              boxShadow: '0 4px 16px rgba(30, 215, 96, 0.4)'
            } : {
              background: 'rgba(40, 40, 40, 0.6)',
              color: '#b3b3b3',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <category.icon className="w-4 h-4" />
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {(isRemoteLoading || remoteError) && (
        <div className="mb-4 flex items-center gap-3 text-sm" style={{ color: '#b3b3b3' }}>
          {isRemoteLoading && (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {'Поиск...'}
            </span>
          )}
          {!isRemoteLoading && remoteError && (
            <span className="text-red-400">{remoteError}</span>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: '#b3b3b3' }} />
            <h3 className="mb-2" style={{ color: '#ffffff' }}>{t('noResults')}</h3>
            <p style={{ color: '#b3b3b3' }}>{t('tryDifferentSearch')}</p>
          </div>
        ) : selectedCategory === 'all' && groupedResults ? (
          // Grouped view
          <div className="space-y-8">
            {Object.entries(groupedResults).map(([type, items]) => {
              if (items.length === 0) return null;
              
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 style={{ color: '#ffffff' }}>
                      {t(type === 'track' ? 'tracks' : type === 'artist' ? 'artists' : type === 'playlist' ? 'playlists' : 'albums')}
                    </h2>
                    {filteredResults.filter(r => r.type === type).length > 4 && (
                      <button
                        onClick={() => setSelectedCategory(type as any)}
                        className="hover:underline"
                        style={{ color: '#b3b3b3' }}
                      >
                        {t('showAll')}
                      </button>
                    )}
                  </div>
                  
                  {type === 'track' ? (
                    // Track list view
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.title}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card rounded-xl p-3 flex items-center gap-3 group hover:bg-white/10 instant-transition gpu-accelerated cursor-pointer"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 instant-transition flex items-center justify-center rounded-lg">
                              <Play className="w-5 h-5" style={{ color: '#1ED760' }} fill="#1ED760" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate" style={{ color: '#ffffff' }}>{item.title}</div>
                            <div className="truncate" style={{ color: '#b3b3b3', fontSize: '14px' }}>{item.subtitle}</div>
                          </div>
                          {item.data?.duration && (
                            <div style={{ color: '#b3b3b3', fontSize: '14px' }}>
                              {formatDuration(item.data.duration)}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    // Grid view for artists, playlists, albums
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {items.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.title}-${index}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card rounded-xl p-4 group hover:bg-white/10 instant-transition gpu-accelerated cursor-pointer"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="relative mb-3">
                            <img
                              src={item.image}
                              alt={item.title}
                              className={`w-full aspect-square object-cover ${type === 'artist' ? 'rounded-full' : 'rounded-lg'} shadow-lg`}
                            />
                            {type !== 'artist' && (
                              <motion.div
                                className="absolute bottom-2 right-2 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl"
                                style={{ background: '#1ED760' }}
                                initial={{ y: 10 }}
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Play className="w-5 h-5" style={{ color: '#000000' }} fill="#000000" />
                              </motion.div>
                            )}
                          </div>
                          <h3 className="truncate mb-1" style={{ color: '#ffffff' }}>{item.title}</h3>
                          <p className="truncate" style={{ color: '#b3b3b3', fontSize: '14px' }}>
                            {getIcon(item.type)}
                            <span className="ml-2">{item.subtitle}</span>
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Single category view
          <div>
            {selectedCategory === 'track' ? (
              // Track list view
              <div className="space-y-2">
                {filteredResults.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.title}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card rounded-xl p-3 flex items-center gap-3 group hover:bg-white/10 instant-transition gpu-accelerated cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 instant-transition flex items-center justify-center rounded-lg">
                        <Play className="w-5 h-5" style={{ color: '#1ED760' }} fill="#1ED760" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ color: '#ffffff' }}>{item.title}</div>
                      <div className="truncate" style={{ color: '#b3b3b3', fontSize: '14px' }}>{item.subtitle}</div>
                    </div>
                    {item.data?.duration && (
                      <div style={{ color: '#b3b3b3', fontSize: '14px' }}>
                        {formatDuration(item.data.duration)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              // Grid view
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredResults.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.title}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card rounded-xl p-4 group hover:bg-white/10 instant-transition gpu-accelerated cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="relative mb-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className={`w-full aspect-square object-cover ${selectedCategory === 'artist' ? 'rounded-full' : 'rounded-lg'} shadow-lg`}
                      />
                      {selectedCategory !== 'artist' && (
                        <motion.div
                          className="absolute bottom-2 right-2 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl"
                          style={{ background: '#1ED760' }}
                          initial={{ y: 10 }}
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Play className="w-5 h-5" style={{ color: '#000000' }} fill="#000000" />
                        </motion.div>
                      )}
                    </div>
                    <h3 className="truncate mb-1" style={{ color: '#ffffff' }}>{item.title}</h3>
                    <p className="line-clamp-2" style={{ color: '#b3b3b3', fontSize: '14px' }}>
                      {item.subtitle}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
