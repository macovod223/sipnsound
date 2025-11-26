import { motion } from 'motion/react';
import { ArrowLeft, Plus, Music, Image as ImageIcon, Search, X, Edit2, Trash2 } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { Track } from './PlayerContext';
import { ImageWithFallback } from '@/components/timurgenii/ImageWithFallback';
import { formatDuration } from '../utils/time';
import { apiClient, Playlist, PlaylistDetails } from '../api/client';
import { toast } from 'sonner';
import { resolveImageUrl } from '../utils/media';

interface CreatePlaylistViewProps {
  onBack: () => void;
}

const FALLBACK_PLAYLIST_COVER = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';

export function CreatePlaylistView({ onBack }: CreatePlaylistViewProps) {
  const { animations, t } = useSettings();
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedTracks, setAddedTracks] = useState<Track[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const getMotionProps = (delay: number = 0) => {
    if (!animations) {
      return { initial: false, animate: false };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] },
    };
  };

  const [allAvailableTracks, setAllAvailableTracks] = useState<Track[]>([]);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const response = await apiClient.getTracks({ includeAll: true });
        if (response && response.tracks) {
          const formattedTracks: Track[] = response.tracks.map((apiTrack: any) => ({
            id: apiTrack.id,
            title: apiTrack.title,
            artist: apiTrack.artist?.name || 'Unknown Artist',
            image: apiTrack.coverUrl || apiTrack.coverPath || '',
            genre: apiTrack.genre?.name || 'Unknown',
            duration: apiTrack.duration,
          }));
          setAllAvailableTracks(formattedTracks);
        }
      } catch (error) {
        setAllAvailableTracks([]);
      }
    };
    loadTracks();
    loadUserPlaylists();
  }, []);

  const loadUserPlaylists = async () => {
    try {
      setIsLoadingPlaylists(true);
      const playlists = await apiClient.getPlaylists();
      setUserPlaylists(playlists);
    } catch (error: any) {
      toast.error(error?.message || t('failedToLoadPlaylists') || 'Не удалось загрузить плейлисты');
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const resetForm = () => {
    setPlaylistName('');
    setPlaylistDescription('');
    setAddedTracks([]);
    setCoverFile(null);
    setCoverPreview(null);
    setEditingPlaylistId(null);
    setIsPublic(true);
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  const handlePlaylistEdit = async (playlist: Playlist) => {
    try {
      const details: PlaylistDetails = await apiClient.getPlaylistById(playlist.id);
      const trackIds = details?.tracks?.map((entry) => entry.track?.id).filter((id): id is string => Boolean(id)) ?? [];
      
      // Загружаем треки для отображения
      const tracksToAdd: Track[] = [];
      for (const trackId of trackIds) {
        try {
          const trackResponse = await apiClient.getTrackById(trackId);
          const apiTrack = trackResponse.track;
          tracksToAdd.push({
            id: apiTrack.id,
            title: apiTrack.title,
            artist: apiTrack.artist?.name || 'Unknown Artist',
            image: apiTrack.coverUrl || apiTrack.coverPath || '',
            genre: apiTrack.genre?.name || 'Unknown',
            duration: apiTrack.duration,
          });
        } catch (error) {
          // Пропускаем треки, которые не удалось загрузить
        }
      }

      setPlaylistName(playlist.title);
      setPlaylistDescription(playlist.description || '');
      setAddedTracks(tracksToAdd);
      setIsPublic(playlist.isPublic);
      setEditingPlaylistId(playlist.id);
      
      // Устанавливаем превью обложки, если есть
      if (playlist.coverUrl) {
        const coverUrl = resolveImageUrl(playlist.coverUrl);
        if (coverUrl) {
          setCoverPreview(coverUrl);
        }
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(t('playlistLoaded') || 'Плейлист загружен для редактирования');
    } catch (error: any) {
      toast.error(error?.message || t('failedToLoadPlaylist') || 'Не удалось загрузить плейлист');
    }
  };

  const handlePlaylistDelete = async (playlistId: string) => {
    if (!window.confirm(t('deletePlaylistConfirm') || 'Вы уверены, что хотите удалить этот плейлист?')) {
      return;
    }
    try {
      await apiClient.deletePlaylist(playlistId);
      toast.success(t('playlistDeleted') || 'Плейлист удален');
      if (editingPlaylistId === playlistId) {
        resetForm();
      }
      await loadUserPlaylists();
      window.dispatchEvent(new CustomEvent('playlists:refresh'));
    } catch (error: any) {
      toast.error(error?.message || t('failedToDeletePlaylist') || 'Не удалось удалить плейлист');
    }
  };

  // Filter tracks based on search query
  const filteredTracks = allAvailableTracks.filter(track => {
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query)
    );
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!playlistName.trim()) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', playlistName.trim());
      if (playlistDescription.trim()) {
        formData.append('description', playlistDescription.trim());
      }
      formData.append('isPublic', String(isPublic));
      
      // Добавляем ID треков
      const trackIds = addedTracks.map(track => track.id).filter(Boolean) as string[];
      if (trackIds.length > 0) {
        formData.append('trackIds', JSON.stringify(trackIds));
      }
      
      // Добавляем файл обложки, если выбран
      if (coverFile) {
        formData.append('coverFile', coverFile);
      }

      if (editingPlaylistId) {
        await apiClient.updatePlaylist(editingPlaylistId, formData);
        toast.success(t('playlistUpdated') || 'Плейлист обновлен');
      } else {
      await apiClient.createPlaylist(formData);
        toast.success(t('playlistCreated') || 'Плейлист создан');
      }
      
      // Обновляем список плейлистов
      await loadUserPlaylists();
      window.dispatchEvent(new Event('playlists:refresh'));
      
      resetForm();
    onBack();
    } catch (error: any) {
      toast.error(error?.message || (editingPlaylistId ? 'Не удалось обновить плейлист' : 'Не удалось создать плейлист'));
    }
  };

  const handleAddTrack = (track: Track) => {
    // Check if track is already added
    const isAlreadyAdded = addedTracks.some(
      t => t.title === track.title && t.artist === track.artist
    );
    if (!isAlreadyAdded) {
      setAddedTracks([...addedTracks, track]);
    }
  };

  const handleRemoveTrack = (index: number) => {
    setAddedTracks(addedTracks.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      {...(animations ? {
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
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="glass px-4 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center gap-2 opacity-70 hover:opacity-100 fast-transition w-fit text-sm sm:text-base text-white"
        {...(animations ? {
          whileHover: { x: -4, scale: 1.02 },
          whileTap: { scale: 0.98 },
        } : {})}
      >
        <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span className="leading-none">{t('back')}</span>
      </motion.button>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 pb-4 space-y-6 sm:space-y-8 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div {...getMotionProps(0)} className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="playlist-title-spotify text-4xl sm:text-5xl md:text-6xl text-white">
                {editingPlaylistId ? (t('editingPlaylist') || 'Редактирование плейлиста') : t('createPlaylist')}
            </h1>
              {editingPlaylistId && (
                <button
                  onClick={resetForm}
                  className="text-sm text-gray-300 hover:text-white px-3 py-1 rounded-lg hover:bg-white/10 fast-transition"
                >
                  {t('cancelEditing') || 'Отменить редактирование'}
                </button>
              )}
            </div>
            <p className="text-white opacity-70 text-sm sm:text-base">
              {editingPlaylistId 
                ? (t('editPlaylistDescription') || 'Измените данные плейлиста и сохраните изменения')
                : t('createPlaylistDescription')
              }
            </p>
          </motion.div>

          {/* Form */}
          <div className="space-y-6">
            {/* Cover Image */}
            <motion.div {...getMotionProps(0.1)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistCover')}
              </label>
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => coverFileInputRef.current?.click()}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 fast-transition group relative overflow-hidden"
                >
                  {coverPreview ? (
                    <img 
                      src={coverPreview} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1ED760]/20 to-transparent opacity-0 group-hover:opacity-100 fast-transition" />
                  <ImageIcon className="w-12 h-12 text-white/40 relative z-10" />
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm mb-2">
                    {t('chooseCoverImage')}
                  </p>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="glass px-4 py-2 rounded-lg text-sm text-white hover:bg-white/10 fast-transition"
                  >
                    {coverFile ? t('changeImage') || 'Изменить изображение' : t('uploadImage')}
                  </button>
                  {coverFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        if (coverFileInputRef.current) {
                          coverFileInputRef.current.value = '';
                        }
                      }}
                      className="mt-2 text-xs text-white/60 hover:text-white"
                    >
                      {t('removeImage') || 'Удалить изображение'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Playlist Name */}
            <motion.div {...getMotionProps(0.15)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistName')}
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder={t('myPlaylist')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                autoFocus
              />
            </motion.div>

            {/* Playlist Description */}
            <motion.div {...getMotionProps(0.2)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-3">
                {t('playlistDescription')}
              </label>
              <textarea
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder={t('addDescription')}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none resize-none fast-transition"
              />
            </motion.div>

            {/* Public/Private Toggle */}
            <motion.div {...getMotionProps(0.22)} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#1ED760] focus:ring-[#1ED760] focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="isPublic" className="text-white cursor-pointer">
                  {t('publicPlaylist') || 'Публичный плейлист'}
                </label>
              </div>
            </motion.div>

            {/* Add Tracks Section */}
            <motion.div {...getMotionProps(0.25)} className="glass-card rounded-2xl p-6">
              <label className="block text-white mb-4">
                {t('addTracks')}
              </label>
              
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchTracks')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white fast-transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Added tracks list */}
              {addedTracks.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/60 text-sm mb-3">
                    {addedTracks.length} {addedTracks.length === 1 ? t('track') : t('tracks')} {t('added')}
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}>
                    {addedTracks.map((track, index) => (
                      <div
                        key={`${track.title}-${index}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 fast-transition group"
                      >
                        <ImageWithFallback
                          src={track.image}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{track.title}</p>
                          <p className="text-white/60 text-xs truncate">{track.artist}</p>
                        </div>
                        <span className="text-white/40 text-xs">{formatDuration(track.duration)}</span>
                        <button
                          onClick={() => handleRemoveTrack(index)}
                          className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white fast-transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchQuery && (
                <div className="space-y-2 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}>
                  {filteredTracks.length > 0 ? (
                    filteredTracks.map((track, index) => {
                      const isAdded = addedTracks.some(
                        t => t.title === track.title && t.artist === track.artist
                      );
                      return (
                        <motion.div
                          key={`${track.title}-${index}`}
                          {...(animations ? {
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            transition: { delay: index * 0.03 }
                          } : {})}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isAdded ? 'bg-[#1ED760]/20 border border-[#1ED760]/40' : 'bg-white/5 hover:bg-white/10'
                          } fast-transition group cursor-pointer`}
                          onClick={() => !isAdded && handleAddTrack(track)}
                        >
                          <ImageWithFallback
                            src={track.image}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{track.title}</p>
                            <p className="text-white/60 text-xs truncate">{track.artist}</p>
                          </div>
                          <span className="text-white/40 text-xs">{formatDuration(track.duration)}</span>
                          {isAdded ? (
                            <div className="w-8 h-8 rounded-full bg-[#1ED760] flex items-center justify-center flex-shrink-0">
                              <Music className="w-4 h-4 text-black" />
                            </div>
                          ) : (
                            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 fast-transition flex-shrink-0 hover:bg-[#1ED760] hover:scale-110">
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">{t('noResults')}</p>
                    </div>
                  )}
                </div>
              )}

              {!searchQuery && addedTracks.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('searchToAddTracks')}</p>
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div {...getMotionProps(0.3)} className="flex gap-3 pt-4">
              <button
                onClick={handleCreate}
                disabled={!playlistName.trim()}
                className="flex-1 sm:flex-none px-8 py-3 rounded-full flex items-center justify-center gap-2 fast-transition disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 gpu-accelerated"
                style={{
                  background: playlistName.trim() ? '#1ED760' : '#282828',
                  color: playlistName.trim() ? '#000' : '#fff',
                }}
              >
                {editingPlaylistId ? (
                  <>
                    <Edit2 className="w-5 h-5" />
                    <span>{t('saveChanges') || 'Сохранить изменения'}</span>
                  </>
                ) : (
                  <>
                <Plus className="w-5 h-5" />
                <span>{t('createPlaylist')}</span>
                  </>
                )}
              </button>
              <button
                onClick={editingPlaylistId ? resetForm : onBack}
                className="px-6 py-3 rounded-full glass text-white hover:bg-white/10 fast-transition"
              >
                {t('cancel')}
              </button>
            </motion.div>

            {/* User Playlists List */}
            <motion.div {...getMotionProps(0.35)} className="glass-card rounded-2xl p-6 mt-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                {t('myPlaylists') || 'Мои плейлисты'}
              </h2>
              {isLoadingPlaylists ? (
                <div className="text-center py-8 text-white/40">
                  <p className="text-sm">{t('loading') || 'Загрузка...'}</p>
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Music className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('noPlaylists') || 'У вас пока нет плейлистов'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 fast-transition group"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        <img
                          src={resolveImageUrl(playlist.coverUrl) || FALLBACK_PLAYLIST_COVER}
                          alt={playlist.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{playlist.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {(playlist._count?.tracks ?? 0)} {t('tracks') || 'треков'} · {playlist.isPublic ? (t('public') || 'Публичный') : (t('private') || 'Приватный')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlaylistEdit(playlist)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm fast-transition flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>{t('edit') || 'Редактировать'}</span>
                        </button>
                        <button
                          onClick={() => handlePlaylistDelete(playlist.id)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 text-sm fast-transition flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{t('delete') || 'Удалить'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
