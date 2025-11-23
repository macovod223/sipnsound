import { motion } from 'motion/react';
import { ArrowLeft, Play, Pause, Clock, Heart } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { AnimatedGradientText, MusicVisualizer } from './UI';
import { useSettings } from './SettingsContext';
import { useState, useEffect } from 'react';

// Mock songs data
const playlistSongs: { [key: string]: Array<{
  id: number;
  title: string;
  artist: string;
  duration: string;
  album: string;
  image: string;
}> } = {
  'Liked Songs': [
    { id: 1, title: 'Starboy', artist: 'The Weeknd', duration: '3:50', album: 'Starboy', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 2, title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', album: 'After Hours', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 3, title: 'Save Your Tears', artist: 'The Weeknd', duration: '3:35', album: 'After Hours', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 4, title: 'Die For You', artist: 'The Weeknd', duration: '4:20', album: 'Starboy', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 5, title: 'Sacrifice', artist: 'The Weeknd', duration: '3:08', album: 'Dawn FM', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 6, title: 'Moth To A Flame', artist: 'Swedish House Mafia, The Weeknd', duration: '3:45', album: 'Paradise Again', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 7, title: 'Take My Breath', artist: 'The Weeknd', duration: '5:40', album: 'Dawn FM', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 8, title: 'Less Than Zero', artist: 'The Weeknd', duration: '3:31', album: 'Dawn FM', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 9, title: 'Out of Time', artist: 'The Weeknd', duration: '3:34', album: 'Dawn FM', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 10, title: 'Gasoline', artist: 'The Weeknd', duration: '3:32', album: 'Dawn FM', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
  ],
  'Daily Mix 1': [
    { id: 1, title: 'SICKO MODE', artist: 'Travis Scott', duration: '5:12', album: 'ASTROWORLD', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 2, title: 'goosebumps', artist: 'Travis Scott', duration: '4:03', album: 'Birds in the Trap', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 3, title: 'HIGHEST IN THE ROOM', artist: 'Travis Scott', duration: '2:57', album: 'Single', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 4, title: 'Antidote', artist: 'Travis Scott', duration: '4:21', album: 'Rodeo', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 5, title: 'Butterfly Effect', artist: 'Travis Scott', duration: '3:10', album: 'ASTROWORLD', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 6, title: 'Praise The Lord', artist: 'A$AP Rocky', duration: '3:31', album: 'Testing', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 7, title: 'HUMBLE.', artist: 'Kendrick Lamar', duration: '2:57', album: 'DAMN.', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 8, title: 'DNA.', artist: 'Kendrick Lamar', duration: '3:05', album: 'DAMN.', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 9, title: 'L$D', artist: 'A$AP Rocky', duration: '3:58', album: 'AT.LONG.LAST.A$AP', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 10, title: 'STARGAZING', artist: 'Travis Scott', duration: '4:30', album: 'ASTROWORLD', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
  ],
  'Peaceful Piano': [
    { id: 1, title: 'River Flows in You', artist: 'Yiruma', duration: '3:37', album: 'First Love', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400' },
    { id: 2, title: 'Comptine d\'un autre été', artist: 'Yann Tiersen', duration: '2:18', album: 'Amélie', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400' },
    { id: 3, title: 'Clair de Lune', artist: 'Claude Debussy', duration: '5:03', album: 'Suite bergamasque', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400' },
    { id: 4, title: 'Gymnopédie No.1', artist: 'Erik Satie', duration: '3:32', album: 'Trois Gymnopédies', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=400' },
    { id: 5, title: 'Kiss the Rain', artist: 'Yiruma', duration: '4:32', album: 'First Love', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400' },
    { id: 6, title: 'Nocturne Op.9 No.2', artist: 'Frédéric Chopin', duration: '4:30', album: 'Nocturnes', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400' },
    { id: 7, title: 'May Be', artist: 'Yiruma', duration: '3:40', album: 'First Love', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400' },
    { id: 8, title: 'Nuvole Bianche', artist: 'Ludovico Einaudi', duration: '5:57', album: 'Una Mattina', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400' },
    { id: 9, title: 'Primavera', artist: 'Ludovico Einaudi', duration: '3:48', album: 'Divenire', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=400' },
    { id: 10, title: 'Una Mattina', artist: 'Ludovico Einaudi', duration: '5:26', album: 'Una Mattina', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400' },
  ],
  'This Is Yeat': [
    { id: 1, title: 'Sorry Bout That', artist: 'Yeat', duration: '2:42', album: '2 Alive', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 2, title: 'Mad bout that', artist: 'Yeat', duration: '2:28', album: 'Up 2 Më', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 3, title: 'Poppin', artist: 'Yeat', duration: '2:15', album: '2 Alive', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 4, title: 'Talk', artist: 'Yeat', duration: '2:34', album: 'Up 2 Më', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 5, title: 'Get Busy', artist: 'Yeat', duration: '2:45', album: '2 Alive', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 6, title: 'Money Twerk', artist: 'Yeat', duration: '2:52', album: '2 Alive', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 7, title: 'Géëk high', artist: 'Yeat', duration: '2:38', album: '2 Alive', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 8, title: 'Turban', artist: 'Yeat', duration: '2:23', album: 'Up 2 Më', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 9, title: 'Out thë way', artist: 'Yeat', duration: '2:32', album: '2 Alive', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 10, title: 'Up 2 Më', artist: 'Yeat', duration: '2:48', album: 'Up 2 Më', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
  ],
  'From Sparta to Padre': [
    { id: 1, title: 'Epic Journey', artist: 'Two Steps From Hell', duration: '4:08', album: 'Battlecry', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 2, title: 'Victory', artist: 'Two Steps From Hell', duration: '3:55', album: 'Archangel', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 3, title: 'Heart of Courage', artist: 'Two Steps From Hell', duration: '3:20', album: 'Invincible', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 4, title: 'Protectors of the Earth', artist: 'Two Steps From Hell', duration: '3:48', album: 'Invincible', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 5, title: 'To Glory', artist: 'Two Steps From Hell', duration: '3:35', album: 'SkyWorld', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 6, title: 'Archangel', artist: 'Two Steps From Hell', duration: '4:02', album: 'Archangel', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 7, title: 'Strength of a Thousand Men', artist: 'Two Steps From Hell', duration: '3:15', album: 'Archangel', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 8, title: 'Star Sky', artist: 'Two Steps From Hell', duration: '4:28', album: 'SkyWorld', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 9, title: 'United We Stand', artist: 'Two Steps From Hell', duration: '3:42', album: 'Invincible', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 10, title: 'Black Blade', artist: 'Two Steps From Hell', duration: '4:15', album: 'Archangel', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 11, title: 'Immortal', artist: 'Two Steps From Hell', duration: '3:58', album: 'Battlecry', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 12, title: 'Rebirth', artist: 'Two Steps From Hell', duration: '4:22', album: 'Archangel', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
  ],
  'DJ': [
    { id: 1, title: 'One More Time', artist: 'Daft Punk', duration: '5:20', album: 'Discovery', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 2, title: 'Around The World', artist: 'Daft Punk', duration: '7:09', album: 'Homework', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 3, title: 'Levels', artist: 'Avicii', duration: '3:18', album: 'True', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 4, title: 'Wake Me Up', artist: 'Avicii', duration: '4:09', album: 'True', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 5, title: 'Animals', artist: 'Martin Garrix', duration: '5:02', album: 'Single', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 6, title: 'Titanium', artist: 'David Guetta ft. Sia', duration: '4:05', album: 'Nothing But The Beat', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 7, title: 'Don\'t You Worry Child', artist: 'Swedish House Mafia', duration: '6:43', album: 'Until Now', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 8, title: 'Clarity', artist: 'Zedd ft. Foxes', duration: '4:32', album: 'Clarity', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 9, title: 'Summer', artist: 'Calvin Harris', duration: '3:43', album: 'Motion', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 10, title: 'This Is What You Came For', artist: 'Calvin Harris ft. Rihanna', duration: '3:42', album: 'Single', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
  ],
  'Tea Lovers': [
    { id: 1, title: 'Lofi Hip Hop Beat 1', artist: 'ChilledCow', duration: '2:45', album: 'Lofi Collection', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 2, title: 'Coffee Shop Jazz', artist: 'Jazz Vibes', duration: '3:12', album: 'Relaxing Moments', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 3, title: 'Rainy Day', artist: 'Lofi Beats', duration: '2:58', album: 'Chill Vibes', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
    { id: 4, title: 'Study Time', artist: 'Focus Music', duration: '3:20', album: 'Concentration', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
    { id: 5, title: 'Green Tea Dreams', artist: 'Ambient Sounds', duration: '4:05', album: 'Tea House', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
    { id: 6, title: 'Morning Brew', artist: 'Chill Beats', duration: '2:48', album: 'Daily Routine', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
    { id: 7, title: 'Afternoon Delight', artist: 'Relax Master', duration: '3:35', album: 'Peace', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: 8, title: 'Evening Meditation', artist: 'Zen Music', duration: '4:22', album: 'Mindfulness', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
  ],
};

// Default songs for playlists without specific data
const defaultSongs = [
  { id: 1, title: 'Track 1', artist: 'Artist 1', duration: '3:45', album: 'Album 1', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
  { id: 2, title: 'Track 2', artist: 'Artist 2', duration: '4:12', album: 'Album 2', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
  { id: 3, title: 'Track 3', artist: 'Artist 3', duration: '3:28', album: 'Album 3', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
  { id: 4, title: 'Track 4', artist: 'Artist 4', duration: '3:55', album: 'Album 4', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400' },
  { id: 5, title: 'Track 5', artist: 'Artist 5', duration: '4:02', album: 'Album 5', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400' },
];

export function PlaylistView() {
  const { selectedPlaylist, closePlaylist, setCurrentTrack, currentTrack, isPlaying, togglePlay, openArtistView, apiTracks } = usePlayer();
  const { t } = useSettings();
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load tracks for the selected playlist
  useEffect(() => {
    if (!selectedPlaylist) return;

    const loadPlaylistTracks = async () => {
      setIsLoading(true);
      try {
        // First try to fetch from API
        const response = await fetch(`http://localhost:3001/api/playlists/${encodeURIComponent(selectedPlaylist.title)}/tracks`);
        if (response.ok) {
          const tracks = await response.json();
          setPlaylistTracks(tracks);
        } else {
          // Fallback to mock data or empty array
          const mockTracks = playlistSongs[selectedPlaylist.title] || defaultSongs;
          setPlaylistTracks(mockTracks);
        }
      } catch (error) {
        console.error('Error loading playlist tracks:', error);
        // Fallback to mock data
        const mockTracks = playlistSongs[selectedPlaylist.title] || defaultSongs;
        setPlaylistTracks(mockTracks);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylistTracks();
  }, [selectedPlaylist]);

  if (!selectedPlaylist) return null;

  const songs = playlistTracks;

  const handlePlaySong = (song: typeof songs[0]) => {
    const isCurrentSong = currentTrack?.title === song.title;
    
    if (isCurrentSong) {
      togglePlay();
    } else {
      setCurrentTrack({
        title: song.title,
        artist: song.artist,
        image: song.image,
        genre: 'Music',
        playlistTitle: selectedPlaylist.title,
      }, selectedPlaylist.title);
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setCurrentTrack({
        title: songs[0].title,
        artist: songs[0].artist,
        image: songs[0].image,
        genre: 'Music',
        playlistTitle: selectedPlaylist.title,
      }, selectedPlaylist.title);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex-1 flex flex-col gap-3 sm:gap-4 md:gap-6 min-w-0 h-full overflow-hidden"
    >
      {/* Back button */}
      <motion.button
        onClick={closePlaylist}
        className="glass px-4 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center gap-2 opacity-70 hover:opacity-100 fast-transition w-fit text-sm sm:text-base text-white"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
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
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
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
                      src={selectedPlaylist.image} 
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="min-w-0"
              >
                <p className="text-[10px] sm:text-xs text-white opacity-60 mb-1 sm:mb-2 uppercase tracking-wider">
                  {t('playlist')}
                </p>
                <h1 className="playlist-title-spotify text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-1 sm:mb-2 break-words overflow-wrap-anywhere">
                  {selectedPlaylist.title}
                </h1>
                <p className="text-white opacity-70 text-xs sm:text-sm break-words">
                  {selectedPlaylist.artist}
                </p>
                <p className="text-white text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-2">
                  {songs.length} {t('songs')}
                </p>
              </motion.div>

              {/* Play button */}
              <motion.div
                className="pt-2 sm:pt-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={handlePlayAll}
                  className="px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 rounded-full flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 shadow-xl text-sm sm:text-base mx-auto sm:mx-0"
                  style={{
                    background: '#1ED760',
                    color: '#000',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span className="font-semibold">{t('play')}</span>
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Songs list */}
        <div className="glass-strong rounded-xl sm:rounded-2xl overflow-hidden">
          {/* Table header - Hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[50px_1fr_160px_80px] md:grid-cols-[50px_minmax(200px,1fr)_180px_80px] gap-3 sm:gap-4 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 border-b border-white/10 text-[10px] sm:text-xs text-white opacity-50 uppercase tracking-wider">
            <div className="text-center">#</div>
            <div className="truncate">{t('title')}</div>
            <div className="hidden md:block truncate">{t('album')}</div>
            <div className="flex items-center justify-end gap-2">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>

          {/* Songs */}
          <div>
            {songs.map((song, index) => {
              const isCurrentSong = currentTrack?.title === song.title;
              const isSongPlaying = isCurrentSong && isPlaying;

              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handlePlaySong(song)}
                  className="grid grid-cols-[40px_1fr_60px] sm:grid-cols-[50px_1fr_80px] md:grid-cols-[50px_minmax(200px,1fr)_180px_80px] gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 hover:bg-white/5 transition-all duration-200 cursor-pointer group border-b border-white/5 last:border-0"
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
                    <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex-shrink-0 rounded-md sm:rounded-lg overflow-hidden glass p-0.5">
                      <img src={song.image} alt={song.title} className="w-full h-full object-cover rounded-sm sm:rounded-md" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-sm sm:text-base truncate mb-0 sm:mb-0.5 transition-colors duration-300"
                        style={{ 
                          color: isCurrentSong ? '#1ED760' : 'white',
                          fontWeight: isCurrentSong ? '600' : '500',
                        }}
                      >
                        {song.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openArtistView(song.artist);
                          closePlaylist();
                        }}
                        className="text-xs sm:text-sm text-white opacity-50 hover:opacity-100 hover:underline truncate text-left w-full"
                      >
                        {song.artist}
                      </button>
                    </div>
                  </div>

                  {/* Album - Hidden on mobile */}
                  <div className="hidden md:flex items-center min-w-0">
                    <p className="text-sm text-white opacity-50 truncate">
                      {song.album}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center justify-end">
                    <span className="text-xs sm:text-sm text-white opacity-50 tabular-nums">
                      {song.duration}
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
