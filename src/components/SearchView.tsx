import { motion } from 'motion/react';
import { useSettings } from './SettingsContext';
import { usePlayer } from './PlayerContext';
import { Music, User, Disc, ListMusic, Play } from 'lucide-react';
import { useState, useMemo } from 'react';

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

// Mock data для поиска
const mockSearchData: SearchResult[] = [
  // Треки
  {
    type: 'track',
    title: 'Blinding Lights',
    subtitle: 'The Weeknd',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    data: { artist: 'The Weeknd', genre: 'Synthwave', duration: 200 }
  },
  {
    type: 'track',
    title: 'Starboy',
    subtitle: 'The Weeknd ft. Daft Punk',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    data: { artist: 'The Weeknd', genre: 'R&B', duration: 230 }
  },
  {
    type: 'track',
    title: 'SICKO MODE',
    subtitle: 'Travis Scott',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    data: { artist: 'Travis Scott', genre: 'Hip-Hop', duration: 312 }
  },
  {
    type: 'track',
    title: 'Goosebumps',
    subtitle: 'Travis Scott',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    data: { artist: 'Travis Scott', genre: 'Hip-Hop', duration: 243 }
  },
  {
    type: 'track',
    title: 'HUMBLE.',
    subtitle: 'Kendrick Lamar',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    data: { artist: 'Kendrick Lamar', genre: 'Hip-Hop', duration: 177 }
  },
  {
    type: 'track',
    title: 'DNA.',
    subtitle: 'Kendrick Lamar',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    data: { artist: 'Kendrick Lamar', genre: 'Hip-Hop', duration: 185 }
  },
  {
    type: 'track',
    title: 'One Dance',
    subtitle: 'Drake ft. Wizkid & Kyla',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
    data: { artist: 'Drake', genre: 'Dancehall', duration: 173 }
  },
  {
    type: 'track',
    title: 'God\'s Plan',
    subtitle: 'Drake',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
    data: { artist: 'Drake', genre: 'Hip-Hop', duration: 198 }
  },
  
  // Артисты
  {
    type: 'artist',
    title: 'The Weeknd',
    subtitle: '85M monthly listeners',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  },
  {
    type: 'artist',
    title: 'Travis Scott',
    subtitle: '70M monthly listeners',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  },
  {
    type: 'artist',
    title: 'Kendrick Lamar',
    subtitle: '60M monthly listeners',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
  },
  {
    type: 'artist',
    title: 'Drake',
    subtitle: '90M monthly listeners',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
  },
  
  // Плейлисты
  {
    type: 'playlist',
    title: 'Daily Mix 1',
    subtitle: 'Travis Scott, A$AP Rocky and more',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  },
  {
    type: 'playlist',
    title: 'Peaceful Piano',
    subtitle: 'Relax and indulge with beautiful piano pieces',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400',
  },
  {
    type: 'playlist',
    title: 'RapCaviar',
    subtitle: 'New music from Travis Scott, Drake and more',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
  },
  {
    type: 'playlist',
    title: 'This Is Yeat',
    subtitle: 'This is Yeat. The essential tracks, all in one playlist.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  },
  
  // Альбомы
  {
    type: 'album',
    title: 'After Hours',
    subtitle: 'The Weeknd · 2020',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  },
  {
    type: 'album',
    title: 'ASTROWORLD',
    subtitle: 'Travis Scott · 2018',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  },
  {
    type: 'album',
    title: 'DAMN.',
    subtitle: 'Kendrick Lamar · 2017',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
  },
  {
    type: 'album',
    title: 'Certified Lover Boy',
    subtitle: 'Drake · 2021',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
  },
];

export function SearchView({ searchQuery, onClose }: SearchViewProps) {
  const { t } = useSettings();
  const { setCurrentTrack, openPlaylist, openArtistView } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'track' | 'artist' | 'playlist' | 'album'>('all');

  // Фильтрация результатов поиска
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    let results = mockSearchData.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.subtitle?.toLowerCase().includes(query)
    );

    if (selectedCategory !== 'all') {
      results = results.filter(item => item.type === selectedCategory);
    }

    return results;
  }, [searchQuery, selectedCategory]);

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

  const handleItemClick = (item: SearchResult) => {
    switch (item.type) {
      case 'track':
        setCurrentTrack({
          title: item.title,
          artist: item.subtitle || '',
          image: item.image,
          genre: item.data?.genre || 'Music',
          duration: item.data?.duration || 180,
        });
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
        openPlaylist({
          title: item.title,
          artist: item.subtitle || '',
          image: item.image,
        });
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!searchQuery.trim()) {
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
