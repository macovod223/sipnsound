/**
 * Admin Panel для управления треками и плейлистами
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Music, Users, BarChart3, Plus } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { toast } from 'sonner';

interface TrackData {
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: string;
}

interface PlaylistData {
  title: string;
  description: string;
  isPublic: boolean;
  trackIds: string[];
}

export function AdminPanel() {
  const { animations } = useSettings();
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'artists' | 'stats'>('tracks');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Формы данных
  const [trackData, setTrackData] = useState<TrackData>({
    title: '',
    artist: '',
    album: '',
    genre: '',
    duration: ''
  });
  
  const [playlistData, setPlaylistData] = useState<PlaylistData>({
    title: '',
    description: '',
    isPublic: true,
    trackIds: []
  });

  // Формы данных для артистов
  const [artistData, setArtistData] = useState({
    name: '',
    bio: '',
    verified: false
  });

  // Refs для файлов
  const audioFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const lyricsFileRef = useRef<HTMLInputElement>(null);
  const artistImageRef = useRef<HTMLInputElement>(null);
  const playlistCoverRef = useRef<HTMLInputElement>(null);

  // Статистика
  const [stats, setStats] = useState({
    tracks: 0,
    playlists: 0,
    users: 0,
    totalPlays: 0
  });

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Добавляем данные трека
      Object.entries(trackData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Добавляем файлы
      if (audioFileRef.current?.files?.[0]) {
        formData.append('audioFile', audioFileRef.current.files[0]);
      }
      if (coverFileRef.current?.files?.[0]) {
        formData.append('coverFile', coverFileRef.current.files[0]);
      }
      if (lyricsFileRef.current?.files?.[0]) {
        formData.append('lyricsFile', lyricsFileRef.current.files[0]);
      }

      // Симуляция прогресса
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('http://localhost:3001/api/tracks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        toast.success('Трек успешно загружен!');
        setTrackData({ title: '', artist: '', album: '', genre: '', duration: '' });
        // Очищаем файлы
        if (audioFileRef.current) audioFileRef.current.value = '';
        if (coverFileRef.current) coverFileRef.current.value = '';
        if (lyricsFileRef.current) lyricsFileRef.current.value = '';
      } else {
        const error = await response.json();
        toast.error(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      toast.error('Ошибка загрузки трека');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData();
      
      // Добавляем данные плейлиста
      formData.append('title', playlistData.title);
      formData.append('description', playlistData.description);
      formData.append('isPublic', playlistData.isPublic.toString());
      formData.append('trackIds', JSON.stringify(playlistData.trackIds));

      // Добавляем обложку плейлиста
      if (playlistCoverRef.current?.files?.[0]) {
        formData.append('coverFile', playlistCoverRef.current.files[0]);
      }

      const response = await fetch('http://localhost:3001/api/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Плейлист успешно создан!');
        setPlaylistData({ title: '', description: '', isPublic: true, trackIds: [] });
        if (playlistCoverRef.current) playlistCoverRef.current.value = '';
      } else {
        const error = await response.json();
        toast.error(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      toast.error('Ошибка создания плейлиста');
      console.error('Playlist error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData();
      
      // Добавляем данные артиста
      formData.append('name', artistData.name);
      formData.append('bio', artistData.bio);
      formData.append('verified', artistData.verified.toString());

      // Добавляем изображение артиста
      if (artistImageRef.current?.files?.[0]) {
        formData.append('imageFile', artistImageRef.current.files[0]);
      }

      const response = await fetch('/api/artists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Артист успешно создан!');
        setArtistData({ name: '', bio: '', verified: false });
        if (artistImageRef.current) artistImageRef.current.value = '';
      } else {
        const error = await response.json();
        toast.error(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      toast.error('Ошибка создания артиста');
      console.error('Artist error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Загружаем статистику при переключении на вкладку
  useState(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      <div className="max-w-6xl mx-auto flex flex-col h-screen">
        {/* Header */}
        <motion.div
          {...(animations ? {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 }
          } : {})}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Админ-панель</h1>
          <p className="text-gray-400">Управление треками, плейлистами и статистикой</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          {...(animations ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.1 }
          } : {})}
          className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-lg"
        >
        {[
          { id: 'tracks', label: 'Треки', icon: Music },
          { id: 'playlists', label: 'Плейлисты', icon: Upload },
          { id: 'artists', label: 'Артисты', icon: Users },
          { id: 'stats', label: 'Статистика', icon: BarChart3 }
        ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === id
                  ? 'bg-[#1ED760] text-black font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden admin-panel-scroll">
          <motion.div
            {...(animations ? {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.5, delay: 0.2 }
            } : {})}
            className="glass-card rounded-xl p-6"
          >
          {/* Upload Track Form */}
          {activeTab === 'tracks' && (
            <form onSubmit={handleTrackSubmit} className="space-y-3 pb-4">
              <h2 className="text-xl font-semibold text-white mb-3">Загрузка трека</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Название трека *
                  </label>
                  <input
                    type="text"
                    value={trackData.title}
                    onChange={(e) => setTrackData({...trackData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Введите название трека"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Исполнитель *
                  </label>
                  <input
                    type="text"
                    value={trackData.artist}
                    onChange={(e) => setTrackData({...trackData, artist: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Введите имя исполнителя"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Альбом
                  </label>
                  <input
                    type="text"
                    value={trackData.album}
                    onChange={(e) => setTrackData({...trackData, album: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Название альбома"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Жанр
                  </label>
                  <input
                    type="text"
                    value={trackData.genre}
                    onChange={(e) => setTrackData({...trackData, genre: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Жанр музыки"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Длительность (секунды)
                  </label>
                  <input
                    type="number"
                    value={trackData.duration}
                    onChange={(e) => setTrackData({...trackData, duration: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="180"
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Аудио файл *
                  </label>
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept=".mp3,.wav,.flac,.m4a,.ogg"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Обложка
                  </label>
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Текст песни (LRC)
                  </label>
                  <input
                    ref={lyricsFileRef}
                    type="file"
                    accept=".lrc,.txt"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-[#1ED760] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <div className="mt-4">
                <button
                  type="submit"
                disabled={isUploading}
                className="w-full bg-[#1ED760] hover:bg-[#1DB954] disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Загрузить трек
                  </>
                )}
                </button>
              </div>
            </form>
          )}

          {/* Create Artist Form */}
          {activeTab === 'artists' && (
            <form onSubmit={handleArtistSubmit} className="space-y-6 pb-16">
              <h2 className="text-2xl font-semibold text-white mb-6">Создание артиста</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Имя артиста *
                  </label>
                  <input
                    type="text"
                    value={artistData.name}
                    onChange={(e) => setArtistData({...artistData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Введите имя артиста"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Изображение артиста
                  </label>
                  <input
                    ref={artistImageRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Биография
                </label>
                <textarea
                  value={artistData.bio}
                  onChange={(e) => setArtistData({...artistData, bio: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                  placeholder="Краткая биография артиста"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={artistData.verified}
                  onChange={(e) => setArtistData({...artistData, verified: e.target.checked})}
                  className="w-4 h-4 rounded border-white/20 text-[#1ED760] focus:ring-[#1ED760] focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="verified" className="text-gray-300">
                  Верифицированный артист
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-[#1ED760] hover:bg-[#1DB954] disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Создать артиста
                  </>
                )}
              </button>
            </form>
          )}

          {/* Create Playlist Form */}
          {activeTab === 'playlists' && (
            <form onSubmit={handlePlaylistSubmit} className="space-y-6 pb-16">
              <h2 className="text-2xl font-semibold text-white mb-6">Создание плейлиста</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Название плейлиста *
                  </label>
                  <input
                    type="text"
                    value={playlistData.title}
                    onChange={(e) => setPlaylistData({...playlistData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Название плейлиста"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Обложка плейлиста
                  </label>
                  <input
                    ref={playlistCoverRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={playlistData.description}
                  onChange={(e) => setPlaylistData({...playlistData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                  placeholder="Описание плейлиста"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={playlistData.isPublic}
                  onChange={(e) => setPlaylistData({...playlistData, isPublic: e.target.checked})}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#1ED760] focus:ring-[#1ED760] focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="isPublic" className="text-gray-300">
                  Публичный плейлист
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-[#1ED760] hover:bg-[#1DB954] disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Создать плейлист
                  </>
                )}
              </button>
            </form>
          )}

          {/* Statistics */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">Статистика</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-lg p-6 text-center">
                  <Music className="w-8 h-8 text-[#1ED760] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{stats.tracks}</div>
                  <div className="text-gray-400">Треков</div>
                </div>

                <div className="glass-card rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-[#1ED760] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{stats.playlists}</div>
                  <div className="text-gray-400">Плейлистов</div>
                </div>

                <div className="glass-card rounded-lg p-6 text-center">
                  <Users className="w-8 h-8 text-[#1ED760] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{stats.users}</div>
                  <div className="text-gray-400">Пользователей</div>
                </div>

                <div className="glass-card rounded-lg p-6 text-center">
                  <BarChart3 className="w-8 h-8 text-[#1ED760] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{stats.totalPlays}</div>
                  <div className="text-gray-400">Прослушиваний</div>
                </div>
              </div>

              <button
                onClick={loadStats}
                className="bg-[#1ED760] hover:bg-[#1DB954] text-black font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Обновить статистику
              </button>
            </div>
          )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
