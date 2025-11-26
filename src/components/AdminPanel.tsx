/**
 * Admin Panel для управления треками и плейлистами
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Upload, Music, Users, BarChart3, Plus, RefreshCcw } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { toast } from 'sonner';
import { apiClient, ArtistSummary, Playlist, PlaylistDetails, Track } from '../api/client';
import { usePlayer } from './PlayerContext';
import { resolveImageUrl } from '../utils/media';

interface TrackData {
  title: string;
  artistId: string;
  albumName: string;
  albumId: string;
  albumYear: string;
  genreName: string;
  duration: string;
  isExplicit: boolean;
  isPublished: boolean;
  playsCount: string;
}

interface PlaylistData {
  title: string;
  description: string;
  isPublic: boolean;
  trackIds: string[];
}

const FALLBACK_PLAYLIST_COVER = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';

export function AdminPanel() {
  const { animations, t, language } = useSettings();
  const { loadTracksFromAPI } = usePlayer();
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'artists' | 'albums' | 'stats'>('tracks');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [artistSearch, setArtistSearch] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<ArtistSummary | null>(null);
  const [albums, setAlbums] = useState<Array<{id: string; title: string; artist: {id: string; name: string}}>>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [albumSearch, setAlbumSearch] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<{id: string; title: string; artist: {id: string; name: string}} | null>(null);
  const [adminTracks, setAdminTracks] = useState<Track[]>([]);
  const [allAlbums, setAllAlbums] = useState<Array<{id: string; title: string; year?: number; type: string; artist: {id: string; name: string}}>>([]);
  const [isLoadingAllAlbums, setIsLoadingAllAlbums] = useState(false);
  const [albumListSearch, setAlbumListSearch] = useState('');
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumData, setAlbumData] = useState({
    title: '',
    year: '',
    type: 'album' as 'album' | 'single',
  });
  const [trackSearch, setTrackSearch] = useState('');
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  
  // Формы данных
  const [trackData, setTrackData] = useState<TrackData>({
    title: '',
    artistId: '',
    albumName: '',
    albumId: '',
    albumYear: '',
    genreName: '',
    duration: '',
    isExplicit: false,
    isPublished: true,
    playsCount: '',
  });
  
  const [playlistData, setPlaylistData] = useState<PlaylistData>({
    title: '',
    description: '',
    isPublic: true,
    trackIds: []
  });
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [isLoadingUserPlaylists, setIsLoadingUserPlaylists] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState('');

  // Формы данных для артистов
  const [artistData, setArtistData] = useState({
    name: '',
    bio: '',
    verified: false,
    monthlyListeners: '',
  });

  // Refs для файлов
  const audioFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const lyricsFileRef = useRef<HTMLInputElement>(null);
  const albumCoverFileRef = useRef<HTMLInputElement>(null);
  const artistImageRef = useRef<HTMLInputElement>(null);
  const playlistCoverRef = useRef<HTMLInputElement>(null);

  // Статистика
  const [stats, setStats] = useState({
    tracks: 0,
    playlists: 0,
    users: 0,
    totalPlays: 0
  });

  const resetTrackForm = () => {
    setTrackData({
      title: '',
      artistId: '',
      albumName: '',
      albumId: '',
      albumYear: '',
      genreName: '',
      duration: '',
      isExplicit: false,
      isPublished: true,
      playsCount: '',
    });
    setSelectedArtist(null);
    setArtistSearch('');
    setEditingTrackId(null);
    if (audioFileRef.current) audioFileRef.current.value = '';
    if (coverFileRef.current) coverFileRef.current.value = '';
    if (lyricsFileRef.current) lyricsFileRef.current.value = '';
  };

  const resetPlaylistForm = () => {
    setPlaylistData({
      title: '',
      description: '',
      isPublic: true,
      trackIds: [],
    });
    setEditingPlaylistId(null);
    setPlaylistTrackSearch('');
    if (playlistCoverRef.current) {
      playlistCoverRef.current.value = '';
    }
  };

  const resetArtistForm = () => {
    setArtistData({ name: '', bio: '', verified: false, monthlyListeners: '' });
    setEditingArtistId(null);
    if (artistImageRef.current) artistImageRef.current.value = '';
  };

  const loadArtists = async () => {
    try {
      setIsLoadingArtists(true);
      const artistList = await apiClient.getArtists();
      setArtists(artistList);
    } catch (error) {
      console.error('Error loading artists:', error);
      toast.error(t('failedToLoadArtists'));
    } finally {
      setIsLoadingArtists(false);
    }
  };

  const loadAlbums = async () => {
    try {
      setIsLoadingAlbums(true);
      const albumList = await apiClient.getAlbums({
        search: albumSearch,
        artistId: selectedArtist?.id,
        limit: 50,
      });
      setAlbums(albumList);
    } catch (error) {
      console.error('Error loading albums:', error);
      toast.error(t('failedToLoadAlbums'));
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const loadAllAlbums = async () => {
    try {
      setIsLoadingAllAlbums(true);
      const albumList = await apiClient.getAlbums({
        search: albumListSearch,
        limit: 100,
      });
      setAllAlbums(albumList);
    } catch (error) {
      console.error('Error loading all albums:', error);
      toast.error(t('failedToLoadAlbums'));
    } finally {
      setIsLoadingAllAlbums(false);
    }
  };

  const loadAdminTracks = async () => {
    try {
      setIsLoadingTracks(true);
      const { tracks } = await apiClient.getAdminTracks({ limit: 200 });
      setAdminTracks(tracks);
    } catch (error) {
      console.error('Error loading admin tracks:', error);
      toast.error(t('failedToLoadTracks'));
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleTrackPlaysAdjust = async (track: Track, delta: number) => {
    if (!track.id) {
      return;
    }
    const nextValue = Math.max(0, (track.playsCount ?? 0) + delta);
    const formData = new FormData();
    formData.append('playsCount', String(nextValue));
    try {
      await apiClient.updateTrack(track.id, formData);
      toast.success(`${t('playsUpdated')}: ${nextValue.toLocaleString(language === 'Русский' ? 'ru-RU' : 'en-US')}`);
      await loadAdminTracks();
    } catch (error: any) {
      console.error('Boost plays error:', error);
      toast.error(error?.message || t('failedToUpdatePlays'));
    }
  };

  const loadUserPlaylists = async () => {
    try {
      setIsLoadingUserPlaylists(true);
      const playlists = await apiClient.getPlaylists();
      setUserPlaylists(playlists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error(t('failedToLoadPlaylists'));
    } finally {
      setIsLoadingUserPlaylists(false);
    }
  };

  const handlePlaylistTrackAdd = (trackId: string) => {
    setPlaylistData((prev) => {
      if (prev.trackIds.includes(trackId)) {
        return prev;
      }
      return { ...prev, trackIds: [...prev.trackIds, trackId] };
    });
  };

  const handlePlaylistTrackRemove = (trackId: string) => {
    setPlaylistData((prev) => ({
      ...prev,
      trackIds: prev.trackIds.filter((id) => id !== trackId),
    }));
  };

  const handlePlaylistEdit = async (playlist: Playlist) => {
    try {
      const details: PlaylistDetails = await apiClient.getPlaylistById(playlist.id);
      const trackIds =
        details?.tracks?.map((entry) => entry.track?.id).filter((id): id is string => Boolean(id)) ?? [];

      setPlaylistData({
        title: playlist.title,
        description: playlist.description || '',
        isPublic: playlist.isPublic,
        trackIds,
      });
      setEditingPlaylistId(playlist.id);
      setPlaylistTrackSearch('');
      if (playlistCoverRef.current) {
        playlistCoverRef.current.value = '';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Playlist load error:', error);
      toast.error(error?.message || t('failedToLoadPlaylist'));
    }
  };

  const handlePlaylistDelete = async (playlistId: string) => {
    if (!window.confirm(t('deletePlaylistConfirm'))) {
      return;
    }
    try {
      await apiClient.deletePlaylist(playlistId);
      toast.success(t('playlistDeleted'));
      if (editingPlaylistId === playlistId) {
        resetPlaylistForm();
      }
      await loadUserPlaylists();
      window.dispatchEvent(new CustomEvent('playlists:refresh'));
    } catch (error: any) {
      console.error('Delete playlist error:', error);
      toast.error(error?.message || t('failedToDeletePlaylist'));
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditMode = Boolean(editingTrackId);

    if (!trackData.artistId) {
      toast.error(t('selectArtistFromList'));
      return;
    }

    if (!trackData.duration || Number(trackData.duration) <= 0) {
      toast.error(t('enterDurationInSeconds'));
      return;
    }

    if (!isEditMode && !audioFileRef.current?.files?.[0]) {
      toast.error(t('addAudioFile'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let progressInterval: number | undefined;

    try {
      const formData = new FormData();
      formData.append('title', trackData.title.trim());
      formData.append('artistId', trackData.artistId);
      formData.append('duration', trackData.duration.trim());
      formData.append('isExplicit', String(trackData.isExplicit));
      formData.append('isPublished', String(trackData.isPublished));

      // Если альбом выбран из списка, отправляем albumId, иначе albumName (для создания нового)
      if (selectedAlbum?.id) {
        formData.append('albumId', selectedAlbum.id);
      } else if (trackData.albumName.trim()) {
        formData.append('albumName', trackData.albumName.trim());
        if (trackData.albumYear.trim()) {
          formData.append('albumYear', trackData.albumYear.trim());
        }
      }
      if (trackData.genreName.trim()) {
        formData.append('genreName', trackData.genreName.trim());
      }
      if (trackData.playsCount.trim()) {
        // Используем Number вместо parseInt для поддержки больших чисел (> 1 млрд)
        const parsedPlays = Math.max(0, Math.floor(Number(trackData.playsCount.trim().replace(/\s/g, ''))) || 0);
        formData.append('playsCount', String(parsedPlays));
      }

      const audioFile = audioFileRef.current?.files?.[0];
      const coverFile = coverFileRef.current?.files?.[0];
      const lyricsFile = lyricsFileRef.current?.files?.[0];

      if (audioFile) {
        formData.append('audioFile', audioFile);
      }
      if (coverFile) {
        formData.append('coverFile', coverFile);
      }
      if (lyricsFile) {
        formData.append('lyricsFile', lyricsFile);
      }

      progressInterval = window.setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 95));
      }, 200);

      if (isEditMode && editingTrackId) {
        await apiClient.updateTrack(editingTrackId, formData);
        toast.success(t('trackUpdated'));
      } else {
        await apiClient.createTrack(formData);
        toast.success(t('trackUploaded'));
      }

      setUploadProgress(100);

      resetTrackForm();
      await loadAdminTracks();
      await loadTracksFromAPI();
    } catch (error: any) {
      toast.error(error?.message || t('failedToSaveTrack'));
      console.error('Upload error:', error);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistData.title.trim()) {
      toast.error(t('enterPlaylistTitle'));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      // ВСЕГДА передаем title, даже при редактировании
      formData.append('title', playlistData.title.trim());
      
      // При редактировании передаем все поля явно
      if (editingPlaylistId) {
        // Обязательные поля при редактировании
        // Передаем description явно, даже если пустое (бэкенд преобразует в null)
        const descriptionValue = playlistData.description?.trim() || '';
        formData.append('description', descriptionValue);
        formData.append('isPublic', String(playlistData.isPublic));
        // ВСЕГДА передаем trackIds при редактировании, даже если массив пустой
        formData.append('trackIds', JSON.stringify(playlistData.trackIds || []));
      } else {
        // При создании
        if (playlistData.description?.trim()) {
          formData.append('description', playlistData.description.trim());
        }
        formData.append('isPublic', String(playlistData.isPublic));
        // При создании передаем только если есть треки
        if (playlistData.trackIds.length > 0) {
          formData.append('trackIds', JSON.stringify(playlistData.trackIds));
        }
      }

      const coverFile = playlistCoverRef.current?.files?.[0];
      if (coverFile) {
        formData.append('coverFile', coverFile);
      }

      if (editingPlaylistId) {
        await apiClient.updatePlaylist(editingPlaylistId, formData);
        toast.success(t('playlistUpdated'));
      } else {
        await apiClient.createPlaylist(formData);
        toast.success(t('playlistCreated'));
      }

      resetPlaylistForm();
      await loadUserPlaylists();
      await loadTracksFromAPI();
      window.dispatchEvent(new CustomEvent('playlists:refresh'));
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || t('failedToCreatePlaylist');
      toast.error(errorMessage);
      console.error('Playlist error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistData.name.trim()) {
      toast.error(t('artistNameRequired'));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', artistData.name.trim());
      formData.append('bio', artistData.bio?.trim() || '');
      formData.append('verified', String(artistData.verified));
      if (artistData.monthlyListeners.trim()) {
        formData.append('monthlyListeners', artistData.monthlyListeners.trim());
      }
      const imageFile = artistImageRef.current?.files?.[0];
      if (imageFile) {
        formData.append('imageFile', imageFile);
      }

      if (editingArtistId) {
        await apiClient.updateArtist(editingArtistId, formData);
        toast.success(t('artistUpdated'));
      } else {
        await apiClient.createArtist(formData);
        toast.success(t('artistCreated'));
      }

      resetArtistForm();
      await loadArtists();
    } catch (error: any) {
      toast.error(error?.message || t('failedToSaveArtist'));
      console.error('Artist error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleArtistEdit = (artist: ArtistSummary) => {
    setArtistData({
      name: artist.name,
      bio: artist.bio || '',
      verified: !!artist.verified,
      monthlyListeners: artist.monthlyListeners ? String(artist.monthlyListeners) : '',
    });
    setEditingArtistId(artist.id);
    if (artistImageRef.current) {
      artistImageRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArtistDelete = async (artistId: string) => {
    if (!window.confirm(t('deleteArtistConfirm'))) {
      return;
    }
    try {
      await apiClient.deleteArtist(artistId);
      toast.success(t('artistDeleted'));
      if (editingArtistId === artistId) {
        resetArtistForm();
      }
      await loadArtists();
    } catch (error: any) {
      toast.error(error?.message || t('failedToDeleteArtist'));
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient.getStats();
      setStats(data);
      toast.success(t('statsUpdated') || 'Статистика обновлена');
    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast.error(error?.message || t('failedToLoadStats') || 'Не удалось загрузить статистику');
    }
  };

  useEffect(() => {
    loadArtists();
  }, []);

  useEffect(() => {
    if (selectedArtist?.id) {
      loadAlbums();
    } else {
      setAlbums([]);
      setSelectedAlbum(null);
      setAlbumSearch('');
    }
  }, [selectedArtist?.id]);

  useEffect(() => {
    if (activeTab === 'tracks' || activeTab === 'playlists') {
      loadAdminTracks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'playlists') {
      loadUserPlaylists();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'albums') {
      loadAllAlbums();
    }
  }, [activeTab]);

  // Отдельный useEffect для поиска с debounce
  useEffect(() => {
    if (activeTab === 'albums') {
      const timeoutId = setTimeout(() => {
        loadAllAlbums();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [albumListSearch]);

  const filteredArtists = useMemo(() => {
    const search = artistSearch.trim().toLowerCase();
    const base = search.length
      ? artists.filter((artist) => artist.name.toLowerCase().includes(search))
      : artists;
    return base.slice(0, 8);
  }, [artistSearch, artists]);

  const filteredPlaylistTracks = useMemo(() => {
    const search = playlistTrackSearch.trim().toLowerCase();
    const base = search.length
      ? adminTracks.filter(
          (track) =>
            track.title.toLowerCase().includes(search) ||
            track.artist?.name?.toLowerCase().includes(search)
        )
      : adminTracks;
    return base.slice(0, 20);
  }, [playlistTrackSearch, adminTracks]);

  const selectedPlaylistTracks = useMemo(() => {
    return playlistData.trackIds
      .map((trackId) => adminTracks.find((track) => track.id === trackId))
      .filter((track): track is Track => Boolean(track));
  }, [playlistData.trackIds, adminTracks]);

  const handleArtistSelect = (artist: ArtistSummary) => {
    setSelectedArtist(artist);
    setTrackData((prev) => ({ ...prev, artistId: artist.id }));
    setArtistSearch(artist.name);
  };

  const handleTrackEdit = (track: Track) => {
    if (!track.artist) {
      toast.error(t('trackHasNoArtist'));
      return;
    }
    setEditingTrackId(track.id);
    setTrackData({
      title: track.title,
      artistId: track.artist.id,
      albumName: track.album?.title || '',
      albumId: track.album?.id || '',
      albumYear: track.album?.year ? String(track.album.year) : '',
      genreName: track.genre?.name || '',
      duration: track.duration ? String(track.duration) : '',
      isExplicit: track.isExplicit ?? false,
      isPublished: track.isPublished ?? true,
      playsCount: track.playsCount ? String(track.playsCount) : '',
    });
    const artistSummary: ArtistSummary = {
      id: track.artist.id,
      name: track.artist.name,
      imageUrl: track.artist.imageUrl,
      verified: track.artist.verified,
    };
    setSelectedArtist(artistSummary);
    setArtistSearch(track.artist.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackDelete = async (trackId: string) => {
    if (!window.confirm(t('deleteTrackConfirm'))) {
      return;
    }

    try {
      await apiClient.deleteTrack(trackId);
      toast.success(t('trackDeleted'));
      if (editingTrackId === trackId) {
        resetTrackForm();
      }
      await loadAdminTracks();
      await loadTracksFromAPI();
    } catch (error: any) {
      toast.error(error?.message || t('failedToDeleteTrack'));
    }
  };

  const filteredTracks = useMemo(() => {
    const search = trackSearch.trim().toLowerCase();
    if (!search) {
      return adminTracks;
    }
    return adminTracks.filter((track) => {
      const titleMatch = track.title.toLowerCase().includes(search);
      const artistMatch = track.artist?.name?.toLowerCase().includes(search);
      return titleMatch || artistMatch;
    });
  }, [trackSearch, adminTracks]);

  return (
    <div className="admin-panel-scroll flex flex-col h-full min-h-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      <div className="max-w-6xl mx-auto flex-1 flex flex-col gap-8 min-h-full pb-24">
        {/* Header */}
        <motion.div
          {...(animations ? {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 }
          } : {})}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">{t('adminPanel')}</h1>
          <p className="text-gray-400">{t('manageTracksPlaylistsStats')}</p>
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
          { id: 'tracks', label: t('tracks'), icon: Music },
          { id: 'playlists', label: t('playlists'), icon: Upload },
          { id: 'artists', label: t('artists'), icon: Users },
          { id: 'albums', label: t('albums'), icon: Music },
          { id: 'stats', label: t('stats'), icon: BarChart3 }
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
        <div className="flex-1 w-full">
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
            <>
            <form onSubmit={handleTrackSubmit} className="space-y-3 pb-4">
              <h2 className="text-xl font-semibold text-white mb-3">{t('uploadTrack')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('trackTitle')} *
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-300">
                    Исполнитель *
                  </label>
                    <button
                      type="button"
                      onClick={loadArtists}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Обновить
                    </button>
                  </div>
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => {
                      setArtistSearch(e.target.value);
                      setSelectedArtist(null);
                      setTrackData((prev) => ({ ...prev, artistId: '' }));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Начните вводить имя артиста"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedArtist ? `${t('selectArtist')}: ${selectedArtist.name}` : t('artistNotSelected')}
                  </p>
                  <div className="mt-2 bg-white/5 rounded-lg max-h-32 overflow-y-auto border border-white/10 divide-y divide-white/5">
                    {isLoadingArtists && (
                      <div className="py-2 text-center text-gray-400 text-sm">{t('loadingArtists')}</div>
                    )}
                    {!isLoadingArtists && filteredArtists.length === 0 && (
                      <div className="py-2 text-center text-gray-400 text-sm">Ничего не найдено</div>
                    )}
                    {!isLoadingArtists &&
                      filteredArtists.map((artist) => (
                        <button
                          key={artist.id}
                          type="button"
                          onClick={() => handleArtistSelect(artist)}
                          className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                            selectedArtist?.id === artist.id
                              ? 'bg-[#1ED760]/20 text-[#1ED760]'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {artist.name}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('album')}
                  </label>
                  {selectedArtist ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={albumSearch}
                          onChange={(e) => {
                            setAlbumSearch(e.target.value);
                            setSelectedAlbum(null);
                            setTrackData((prev) => ({ ...prev, albumId: '', albumName: e.target.value }));
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                          placeholder={t('searchAlbumOrNewName')}
                        />
                        <button
                          type="button"
                          onClick={loadAlbums}
                          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          {t('update')}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {selectedAlbum 
                          ? `${t('selectArtist')}: ${selectedAlbum.title}` 
                          : albumSearch.trim() 
                            ? `${t('creating')} ${t('albumType').toLowerCase()}: "${albumSearch.trim()}"`
                            : t('albumNotSelected')}
                      </p>
                      <div className="bg-white/5 rounded-lg max-h-32 overflow-y-auto border border-white/10 divide-y divide-white/5">
                        {isLoadingAlbums && (
                          <div className="py-2 text-center text-gray-400 text-sm">{t('loadingArtists')}</div>
                        )}
                        {!isLoadingAlbums && albums.length === 0 && albumSearch && (
                          <div className="py-2 text-center text-gray-400 text-sm">{t('nothingFound')}</div>
                        )}
                        {!isLoadingAlbums &&
                          albums
                            .filter((album) => 
                              !albumSearch || album.title.toLowerCase().includes(albumSearch.toLowerCase())
                            )
                            .map((album) => (
                              <button
                                key={album.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAlbum(album);
                                  setAlbumSearch(album.title);
                                  setTrackData((prev) => ({ ...prev, albumId: album.id, albumName: '' }));
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                  selectedAlbum?.id === album.id
                                    ? 'bg-[#1ED760]/20 text-[#1ED760]'
                                    : 'text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                {album.title} • {album.artist.name}
                              </button>
                            ))}
                      </div>
                    </>
                  ) : (
                  <input
                    type="text"
                    value={trackData.albumName}
                    onChange={(e) => setTrackData({...trackData, albumName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                      placeholder="Сначала выберите артиста"
                      disabled
                    />
                  )}
                  {selectedArtist && !selectedAlbum && trackData.albumName.trim() && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {t('year')}
                      </label>
                      <input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={trackData.albumYear}
                        onChange={(e) => setTrackData({...trackData, albumYear: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                        placeholder={String(new Date().getFullYear())}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Жанр
                  </label>
                  <input
                    type="text"
                    value={trackData.genreName}
                    onChange={(e) => setTrackData({...trackData, genreName: e.target.value})}
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Прослушивания
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={trackData.playsCount}
                    onChange={(e) => setTrackData({ ...trackData, playsCount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Аудио файл {!editingTrackId && '*'}
                  </label>
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept=".mp3,.wav,.flac,.m4a,.ogg"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                    required={!editingTrackId}
                  />
                  {editingTrackId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Оставьте пустым, чтобы использовать существующий файл
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('coverImage')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={trackData.isExplicit}
                    onChange={(e) => setTrackData({ ...trackData, isExplicit: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 text-[#1ED760] focus:ring-[#1ED760]"
                  />
                  Ненормативная лексика
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={trackData.isPublished}
                    onChange={(e) => setTrackData({ ...trackData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 text-[#1ED760] focus:ring-[#1ED760]"
                  />
                  Публиковать сразу
                </label>
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
                    {t('loadingArtists')}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {editingTrackId ? 'Сохранить изменения' : 'Загрузить трек'}
                  </>
                )}
                </button>
                {editingTrackId && (
                  <button
                    type="button"
                    onClick={resetTrackForm}
                    className="mt-3 w-full border border-white/20 text-white py-2 rounded-lg hover:bg-white/5"
                  >
                    Отменить редактирование
                  </button>
                )}
              </div>
            </form>
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-white">Загруженные треки</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={trackSearch}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder={t('searchByNameOrArtist')}
                  />
                  <button
                    type="button"
                    onClick={loadAdminTracks}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Обновить
                  </button>
                </div>
              </div>
              {isLoadingTracks ? (
                <div className="py-6 text-center text-gray-400">{t('loadingArtists')}</div>
              ) : filteredTracks.length === 0 ? (
                <div className="py-6 text-center text-gray-400">{t('tracksNotFound')}</div>
              ) : (
                <div className="space-y-2">
                  {filteredTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/5 rounded-lg px-3 py-2 text-sm text-white gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                        <span className="hidden sm:inline">{track.isPublished ? 'Публ.' : 'Черновик'}</span>
                        <span>
                          {track.duration 
                            ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
                            : '0:00'}
                        </span>
                        <span className="hidden sm:inline">
                          {(track.playsCount ?? 0).toLocaleString('ru-RU')} просл.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTrackEdit(track)}
                          className="px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"
                        >
                          Редакт.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTrackDelete(track.id)}
                          className="px-2 py-1 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30"
                        >
                          Удалить
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTrackPlaysAdjust(track, 100)}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white"
                          >
                            +100
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTrackPlaysAdjust(track, 1000)}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white"
                          >
                            +1k
                        </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
          )}

          {/* Create Artist Form */}
          {activeTab === 'artists' && (
            <div className="space-y-6 pb-16">
            <form onSubmit={handleArtistSubmit} className="space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">
                {editingArtistId ? t('editingArtist') : t('creatingArtist')}
              </h2>
              
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ежемесячные слушатели
                </label>
                <input
                  type="number"
                  min="0"
                  value={artistData.monthlyListeners}
                  onChange={(e) => setArtistData({ ...artistData, monthlyListeners: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                  placeholder="Например, 250000"
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
                    {editingArtistId ? 'Сохранить изменения' : 'Создать артиста'}
                  </>
                )}
              </button>
              {editingArtistId && (
                <button
                  type="button"
                  onClick={resetArtistForm}
                  className="w-full mt-3 border border-white/20 text-white py-2 rounded-lg hover:bg-white/5"
                >
                  Отменить редактирование
                </button>
              )}
            </form>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <h3 className="text-lg font-semibold text-white">Существующие артисты</h3>
              {isLoadingArtists ? (
                <div className="py-4 text-center text-gray-400">Загрузка...</div>
              ) : artists.length === 0 ? (
                <div className="py-4 text-center text-gray-400">{t('artistsNotFound')}</div>
              ) : (
                <div className="space-y-2">
                  {artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/5 rounded-lg px-3 py-2 text-sm text-white gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {artist.name}{' '}
                          {artist.verified && <span className="text-[#1ED760] text-xs">(✔)</span>}
                        </p>
                        {artist.bio && (
                          <p className="text-xs text-gray-400 truncate">{artist.bio}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <button
                          type="button"
                          onClick={() => handleArtistEdit(artist)}
                          className="px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"
                        >
                          Редакт.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArtistDelete(artist.id)}
                          className="px-2 py-1 rounded bg-red-500/20 text-red-200 hover:bg-red-500/30"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}

          {/* Albums Management */}
          {activeTab === 'albums' && (
            <div className="space-y-6 pb-16">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!editingAlbumId) return;
                
                setIsUploading(true);
                try {
                  const formData = new FormData();
                  formData.append('title', albumData.title);
                  formData.append('year', albumData.year);
                  formData.append('type', albumData.type);
                  
                  if (albumCoverFileRef.current?.files?.[0]) {
                    formData.append('coverFile', albumCoverFileRef.current.files[0]);
                  }
                  
                  await apiClient.updateAlbum(editingAlbumId, formData);
                  toast.success(t('albumUpdated'));
                  setEditingAlbumId(null);
                  setAlbumData({ title: '', year: '', type: 'album' });
                  if (albumCoverFileRef.current) {
                    albumCoverFileRef.current.value = '';
                  }
                  await loadAllAlbums();
                } catch (error: any) {
                  toast.error(error?.message || t('failedToUpdateAlbum'));
                } finally {
                  setIsUploading(false);
                }
              }} className="space-y-6">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  {editingAlbumId ? t('editingAlbum') : t('manageAlbums')}
                </h2>
                
                {editingAlbumId ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {t('albumTitle')} *
                        </label>
                        <input
                          type="text"
                          value={albumData.title}
                          onChange={(e) => setAlbumData({...albumData, title: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                          placeholder={t('enterAlbumTitle')}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {t('year')} *
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={albumData.year}
                          onChange={(e) => setAlbumData({...albumData, year: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                          placeholder={String(new Date().getFullYear())}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('type')}
                      </label>
                      <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
                        {(['album', 'single'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setAlbumData({...albumData, type})}
                            className={`flex-1 px-4 py-2 rounded-full text-sm transition-colors ${
                              albumData.type === type
                                ? 'bg-[#1ED760] text-black font-medium'
                                : 'text-white/70 hover:text-white'
                            }`}
                          >
                            {type === 'album' ? t('albumType') : t('singleType')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {t('coverImage')}
                      </label>
                      <input
                        ref={albumCoverFileRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="flex-1 bg-[#1ED760] hover:bg-[#1DB954] disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        {isUploading ? 'Сохранение...' : 'Сохранить изменения'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAlbumId(null);
                          setAlbumData({ title: '', year: '', type: 'album' });
                          if (albumCoverFileRef.current) {
                            albumCoverFileRef.current.value = '';
                          }
                        }}
                        className="px-4 border border-white/20 text-white py-3 rounded-lg hover:bg-white/5"
                      >
                        Отменить
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {t('selectAlbumToEdit')}
                  </div>
                )}
              </form>

              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white">{t('allAlbums')}</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={albumListSearch}
                      onChange={(e) => setAlbumListSearch(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                      placeholder={t('searchAlbums')}
                    />
                    <button
                      type="button"
                      onClick={loadAllAlbums}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm"
                    >
                      Обновить
                    </button>
                  </div>
                </div>

                {isLoadingAllAlbums ? (
                  <div className="py-8 text-center text-gray-400">Загрузка альбомов...</div>
                ) : allAlbums.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">{t('albumsNotFound')}</div>
                ) : (
                  <div className="space-y-2">
                    {allAlbums.map((album) => (
                      <div
                        key={album.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{album.title}</h4>
                          <p className="text-sm text-gray-400">
                            {album.artist.name} • {album.year || '—'} • {album.type === 'album' ? t('albumType') : t('singleType')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlbumId(album.id);
                              setAlbumData({
                                title: album.title,
                                year: album.year ? String(album.year) : String(new Date().getFullYear()),
                                type: (album.type === 'single' ? 'single' : 'album') as 'album' | 'single',
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm"
                          >
                            Редактировать
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}

          {/* Create Playlist Form */}
          {activeTab === 'playlists' && (
            <div className="space-y-10 pb-16">
              <form onSubmit={handlePlaylistSubmit} className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold text-white">
                    {editingPlaylistId ? t('editingPlaylist') : t('creatingPlaylist')}
                  </h2>
                  {editingPlaylistId && (
                    <button
                      type="button"
                      onClick={resetPlaylistForm}
                      className="text-sm text-gray-300 hover:text-white"
                    >
                      Отменить редактирование
                    </button>
                  )}
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('playlistTitle')} *
                  </label>
                  <input
                    type="text"
                    value={playlistData.title}
                    onChange={(e) => setPlaylistData({...playlistData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder={t('enterPlaylistTitle')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('coverImage')} плейлиста
                  </label>
                  <input
                    ref={playlistCoverRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1ED760] file:text-black hover:file:bg-[#1DB954]"
                  />
                    <p className="text-xs text-gray-400 mt-1">
                      Поддерживаются форматы JPG, PNG, WEBP до 5 МБ
                    </p>
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-300">
                      Добавить треки
                    </label>
                    <span className="text-xs text-gray-400">
                      Выбрано: {playlistData.trackIds.length}
                    </span>
                  </div>

                  {selectedPlaylistTracks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedPlaylistTracks.map((track) => (
                        <span
                          key={track.id}
                          className="flex items-center gap-2 bg-white/10 text-white text-xs px-3 py-1 rounded-full"
                        >
                          {track.title}
                          <button
                            type="button"
                            onClick={() => handlePlaylistTrackRemove(track.id)}
                            className="text-red-300 hover:text-red-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Треки не выбраны</p>
                  )}

                  <input
                    type="text"
                    value={playlistTrackSearch}
                    onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-gray-400 focus:border-[#1ED760] focus:outline-none"
                    placeholder="Поиск треков по названию или артисту"
                  />

                  <div className="bg-white/5 rounded-lg max-h-60 overflow-y-auto border border-white/10 divide-y divide-white/5">
                    {filteredPlaylistTracks.length === 0 ? (
                      <div className="py-3 text-center text-sm text-gray-400">Треки не найдены</div>
                    ) : (
                      filteredPlaylistTracks.map((track) => {
                        const isSelected = playlistData.trackIds.includes(track.id);
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => handlePlaylistTrackAdd(track.id)}
                            disabled={isSelected}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-[#1ED760]/10 text-[#1ED760]' : 'text-gray-200 hover:bg-white/5'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{track.title}</p>
                              <p className="text-xs opacity-70 truncate">{track.artist?.name || 'Unknown artist'}</p>
                            </div>
                            {isSelected ? <span className="text-xs">Добавлен</span> : <span className="text-xs">Добавить</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isUploading}
                    className="flex-1 bg-[#1ED760] hover:bg-[#1DB954] disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        {editingPlaylistId ? 'Сохранение...' : 'Создание...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                        {editingPlaylistId ? 'Сохранить плейлист' : 'Создать плейлист'}
                  </>
                )}
              </button>
                  {editingPlaylistId && (
                    <button
                      type="button"
                      onClick={resetPlaylistForm}
                      className="sm:w-auto w-full border border-white/20 text-white py-3 px-6 rounded-lg hover:bg-white/5"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
            </form>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Мои плейлисты</h3>
                {isLoadingUserPlaylists ? (
                  <div className="py-6 text-center text-gray-400">Загрузка плейлистов...</div>
                ) : userPlaylists.length === 0 ? (
                  <div className="py-6 text-center text-gray-400">Вы ещё не создали плейлистов</div>
                ) : (
                  <div className="space-y-3">
                    {userPlaylists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                            <img
                              src={resolveImageUrl(playlist.coverUrl) || FALLBACK_PLAYLIST_COVER}
                              alt={playlist.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{playlist.title}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {(playlist._count?.tracks ?? 0)} трек(ов) · {playlist.isPublic ? 'Публичный' : 'Приватный'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handlePlaylistEdit(playlist)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlaylistDelete(playlist.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
