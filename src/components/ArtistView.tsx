import { motion } from "motion/react";
import { Play, Shuffle, Check, ChevronLeft, Search, Loader2 } from "lucide-react";
import { usePlayer, type Track } from "./PlayerContext";
import { useSettings } from "./SettingsContext";
import { ImageWithFallback } from "@/components/timurgenii/ImageWithFallback";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../api/client";
import { resolveAudioUrl, resolveImageUrl } from "@/utils/media";
import { TrackMenu } from "./TrackMenu";

type TabType = "tracks" | "albums" | "singles";

const FALLBACK_ARTIST_IMAGE = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600";

interface ArtistViewProps {
  onBack: () => void;
  artist?: {
    id?: string;
    name: string;
  };
}

interface ArtistDetails {
  id: string;
  name: string;
  bio?: string | null;
  image: string;
  coverImage: string;
  verified: boolean;
  monthlyListeners?: number | null;
  tracks: Array<{
    id: string;
    title: string;
    duration?: number | null;
    playsCount?: number | null;
    image: string;
    audioUrl?: string;
    lyricsUrl?: string;
  }>;
  albums: Array<{
    id: string;
    title: string;
    year?: number | null;
    type?: string | null;
    image: string;
    tracksCount?: number;
  }>;
}

const resolveImage = (url?: string | null, fallback: string = FALLBACK_ARTIST_IMAGE) => {
  return resolveImageUrl(url, fallback) || fallback;
};

export function ArtistView({ onBack, artist }: ArtistViewProps) {
  const { currentTrack, setCurrentTrack, isPlaying, togglePlay, openPlaylist, artistReturnTab, seek, shuffle, toggleShuffle, setCurrentPlaylistTracks } = usePlayer();
  const { animations, t } = useSettings();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("tracks");
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [artistData, setArtistData] = useState<ArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (artistReturnTab) {
      setActiveTab(artistReturnTab);
    }
  }, [artistReturnTab]);

  useEffect(() => {
    let cancelled = false;

    const fetchArtist = async () => {
      const fallbackName = artist?.name || currentTrack?.artist;
      if (!artist?.id && !fallbackName) {
        setArtistData(null);
        setError("Артист не выбран");
        return;
      }

      setIsLoading(true);
      try {
        let resolvedId = artist?.id;
        let resolvedName = fallbackName || "";

        if (!resolvedId && resolvedName) {
          const matches = await apiClient.getArtists({ search: resolvedName, limit: 1 });
          resolvedId = matches[0]?.id;
          resolvedName = matches[0]?.name || resolvedName;

          if (!resolvedId) {
            throw new Error("Артист не найден");
          }
        }

        if (!resolvedId) {
          throw new Error("Артист не найден");
        }

        const details = await apiClient.getArtistById(resolvedId);

        if (cancelled) {
          return;
        }

        const transformed: ArtistDetails = {
          id: details.id,
          name: details.name ?? resolvedName,
          bio: details.bio,
          image: resolveImage(details.imageUrl || details.imagePath),
          coverImage: resolveImage(details.imageUrl || details.imagePath),
          verified: details.verified ?? false,
          monthlyListeners: details.monthlyListeners,
          tracks: (details.tracks ?? []).map((track: any) => ({
            id: track.id,
            title: track.title,
            duration: track.duration,
            playsCount: track.playsCount,
            image: resolveImage(track.coverUrl || track.coverPath, resolveImage(details.imageUrl || details.imagePath)),
            audioUrl: resolveAudioUrl(track.audioUrl || track.audioPath),
            lyricsUrl: undefined,
          })),
          albums: (details.albums ?? []).map((album: any) => {
            // Убеждаемся, что тип альбома правильно установлен
            // Проверяем тип альбома из API и нормализуем его
            let albumType = album.type;
            if (!albumType || typeof albumType !== 'string') {
              albumType = 'single'; // По умолчанию single, если тип не указан
            } else {
              albumType = albumType.toLowerCase().trim();
              if (albumType !== 'album' && albumType !== 'single') {
                albumType = 'single'; // Если тип невалидный, используем single
              }
            }
            return {
            id: album.id,
            title: album.title,
            year: album.year,
              type: albumType,
            image: resolveImage(album.coverUrl || album.coverPath),
            tracksCount: album._count?.tracks ?? 0,
            };
          }),
        };

        setArtistData(transformed);
        setError(null);
        
        // Сохраняем треки в контекст для nextTrack
        const tracksForContext = transformed.tracks.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: transformed.name,
          image: track.image || transformed.image,
          genre: 'Unknown',
          duration: track.duration || 0,
          audioUrl: track.audioUrl,
          playlistTitle: `${transformed.name} • ${t('popularTracks')}`,
        }));
        setCurrentPlaylistTracks(tracksForContext);
        
        // Проверяем, подписан ли пользователь на артиста
        try {
          const followingStatus = await apiClient.checkFollowing(resolvedId);
          if (!cancelled) {
            setIsFollowing(followingStatus.isFollowing);
          }
        } catch (err) {
          // Если ошибка, считаем что не подписан
          if (!cancelled) {
            setIsFollowing(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setArtistData(null);
          setError(err instanceof Error ? err.message : "Не удалось загрузить артиста");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchArtist();

    return () => {
      cancelled = true;
    };
  }, [artist?.id, artist?.name, currentTrack?.artist, setCurrentPlaylistTracks, t]);

  const displayArtistName = artistData?.name || artist?.name || currentTrack?.artist || "Unknown artist";

  const filteredTracks = useMemo(() => {
    if (!artistData?.tracks) return [];
    if (!trackSearch.trim()) return artistData.tracks;

    const query = trackSearch.toLowerCase();
    return artistData.tracks.filter((track) => track.title.toLowerCase().includes(query));
  }, [artistData?.tracks, trackSearch]);

  const visibleTracks = showAllTracks ? filteredTracks : filteredTracks.slice(0, 5);

  const filteredAlbums = useMemo(() => {
    if (!artistData?.albums) return [];
    if (activeTab === "albums") {
      return artistData.albums.filter((album) => {
        const albumType = album.type?.toLowerCase() || 'single';
        return albumType === 'album';
      });
    }
    if (activeTab === "singles") {
      return artistData.albums.filter((album) => {
        const albumType = album.type?.toLowerCase() || 'single';
        return albumType === 'single';
      });
    }
    return artistData.albums;
  }, [artistData?.albums, activeTab]);

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

  const handleSelectTrack = (track: ArtistDetails["tracks"][number]) => {
    // Одинарный клик - только выделяем трек
    const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === displayArtistName;
    if (!isCurrentTrack) {
      setCurrentTrack({
        id: track.id,
        title: track.title,
        artist: displayArtistName,
        image: track.image || artistData?.image || FALLBACK_ARTIST_IMAGE,
        genre: "Unknown",
        duration: track.duration ?? 0,
        audioUrl: track.audioUrl,
        lyricsUrl: track.lyricsUrl,
        playlistTitle: `${displayArtistName} • ${t('popularTracks')}`,
      });
    }
  };

  const handlePlayTrack = (track: ArtistDetails["tracks"][number]) => {
    // Двойной клик или прямой запуск - всегда начинаем трек заново
    const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === displayArtistName;
    
    if (isCurrentTrack && isPlaying) {
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
        id: track.id,
        title: track.title,
        artist: displayArtistName,
        image: track.image || artistData?.image || FALLBACK_ARTIST_IMAGE,
        genre: "Unknown",
        duration: track.duration ?? 0,
        audioUrl: track.audioUrl,
        lyricsUrl: track.lyricsUrl,
        playlistTitle: `${displayArtistName} • ${t('popularTracks')}`,
      });
    }
  };

  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;

    // Формируем полный список треков для плейлиста
    const playlistTitle = `${displayArtistName} • ${t('popularTracks')}`;
    const tracksForPlaylist = filteredTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: displayArtistName,
      image: track.image || artistData?.image || FALLBACK_ARTIST_IMAGE,
      genre: "Unknown",
      duration: track.duration ?? 0,
      audioUrl: track.audioUrl,
      lyricsUrl: track.lyricsUrl,
      playlistTitle,
    }));

    // Сохраняем треки в контекст для правильной работы nextTrack
    setCurrentPlaylistTracks(tracksForPlaylist);

    // Выбираем трек для воспроизведения
    let trackToPlay;
    
    if (shuffle && tracksForPlaylist.length > 1) {
      // Если shuffle включен, выбираем случайный трек
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomIndex = Math.floor((randomArray[0] / (0xFFFFFFFF + 1)) * tracksForPlaylist.length);
      trackToPlay = tracksForPlaylist[randomIndex];
    } else {
      // Если shuffle выключен, начинаем с первого трека
      trackToPlay = tracksForPlaylist[0];
    }

    // Проверяем, является ли выбранный трек текущим
    const isCurrentTrack = currentTrack?.id === trackToPlay.id && 
                          currentTrack?.title === trackToPlay.title && 
                          currentTrack?.playlistTitle === playlistTitle;

    if (isCurrentTrack && isPlaying) {
      // Если трек уже играет, ничего не делаем
      return;
    } else if (isCurrentTrack && !isPlaying) {
      // Если трек на паузе, просто запускаем
      togglePlay();
    } else {
      // Устанавливаем новый трек - setCurrentTrack автоматически запустит воспроизведение
      setCurrentTrack(trackToPlay, playlistTitle);
    }
  };

  const handleFollowToggle = async () => {
    if (!artistData?.id || isLoadingFollow) return;
    
    setIsLoadingFollow(true);
    try {
      if (isFollowing) {
        await apiClient.unfollowArtist(artistData.id);
        setIsFollowing(false);
      } else {
        await apiClient.followArtist(artistData.id);
        setIsFollowing(true);
      }
      // Обновляем список артистов в библиотеке
      window.dispatchEvent(new CustomEvent('artists:refresh'));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleAlbumClick = (album: ArtistDetails["albums"][number]) => {
    const albumType = (album.type === 'album' ? 'album' : 'single') as 'album' | 'single';
    openPlaylist({
      title: album.title,
      artist: `${album.year || ""} • ${displayArtistName}`,
      image: album.image,
      type: albumType,
      albumId: album.id, // Передаем ID альбома для загрузки треков
      albumType: albumType, // Передаем тип альбома
      returnToArtistTab: activeTab,
    });
  };

  const handleAlbumPlay = (e: React.MouseEvent, album: ArtistDetails["albums"][number]) => {
    e.stopPropagation();
    const track = filteredTracks.find((t) => t.title.toLowerCase().includes(album.title.toLowerCase()));
    if (track) {
      handlePlayTrack(track);
    } else if (filteredTracks.length > 0) {
      handlePlayTrack(filteredTracks[0]);
    }
  };

  const monthlyListenersLabel = useMemo(() => {
    if (!artistData?.monthlyListeners) return "0";
    return artistData.monthlyListeners.toLocaleString("ru-RU");
  }, [artistData?.monthlyListeners]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !artistData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-white/80 text-lg">{error || "Артист не найден"}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {t('back')}
          </button>
          <button
            onClick={() => {
              setArtistData(null);
              setError(null);
              setTrackSearch("");
            }}
            className="px-4 py-2 rounded-lg bg-[#1ED760] text-black font-semibold hover:bg-[#1DB954]"
          >
            {t('refreshStats')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl h-full overflow-hidden flex flex-col">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#121212] to-[#0a0a0a]" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors w-fit"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('back')}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-8">
            <div className="flex-shrink-0">
              <ImageWithFallback
                src={artistData.image}
                alt={artistData.name}
                className="w-32 h-32 sm:w-48 sm:h-48 rounded-full shadow-2xl object-cover border-4 border-white/20"
              />
            </div>

            <div className="flex-1 mt-4 sm:mt-0">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{t('verifiedArtist')}</span>
                {artistData.verified && (
                  <div className="w-5 h-5 rounded-full bg-[#1ED760] text-black flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              <motion.h1
                {...getMotionProps(0.1)}
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mt-2 mb-4"
              >
                {artistData.name}
              </motion.h1>

              <div className="flex flex-col gap-2 text-white/70 text-sm sm:text-base">
                <span>
                  {monthlyListenersLabel} {t('monthlyListeners')}
                </span>
                {artistData.bio && (
                  <span className="text-white/60">{artistData.bio}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-10 flex-1 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayAll}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1ED760] flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
            >
              <Play className="w-6 h-6 ml-1 text-black fill-black" />
            </button>
            <button 
              onClick={toggleShuffle}
              className={`rounded-full border px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                shuffle 
                  ? 'border-[#1ED760] bg-[#1ED760]/10 text-[#1ED760]' 
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              {t('shuffle')}
            </button>
            <button 
              onClick={handleFollowToggle}
              disabled={isLoadingFollow}
              className={`rounded-full border px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                isFollowing 
                  ? 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10' 
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              {isFollowing && <Check className="w-4 h-4 fill-white/70" />}
              {isLoadingFollow ? t('loadingArtists') : (isFollowing ? t('following') : t('follow'))}
            </button>
          </div>
        </div>

        <section>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('popularTracks')}</h2>
              <p className="text-white/60 text-sm">
                {artistData.name} • {t('topTracksDescription')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none"
                  placeholder={t('searchTracks')}
                />
              </div>
              <button
                onClick={() => setShowAllTracks(!showAllTracks)}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {showAllTracks ? t('showLess') : t('showAll')}
              </button>
            </div>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="text-center text-white/60 py-6">{t('nothingFound')}</div>
          ) : (
            <div className="space-y-2">
              {visibleTracks.map((track, index) => {
                const isCurrentTrack = currentTrack?.title === track.title && currentTrack?.artist === displayArtistName;
                
                return (
                <motion.div
                  key={track.id}
                  {...getMotionProps(index * 0.05)}
                  className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => handleSelectTrack(track)}
                  onDoubleClick={() => handlePlayTrack(track)}
                  style={isCurrentTrack ? {
                    backgroundColor: 'rgba(30, 215, 96, 0.1)',
                  } : {}}
                >
                  <span className="w-6 text-sm text-white/60">{index + 1}</span>
                  <div className="w-14 h-14 rounded-lg overflow-hidden">
                    <img
                      src={track.image || artistData.image}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <p className="text-sm text-white/60 truncate">{displayArtistName}</p>
                  </div>

                  <div className="hidden md:block w-32 text-sm text-white/60">
                    {track.playsCount?.toLocaleString("ru-RU") ?? "—"}
                  </div>

                  <div className="w-20 text-sm text-white/60 flex items-center gap-6">
                    <span>
                      {track.duration
                        ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}`
                        : "--:--"}
                    </span>
                    <TrackMenu
                      track={{
                        id: track.id,
                        title: track.title,
                        artist: displayArtistName,
                        image: track.image || artistData.image,
                        audioUrl: track.audioUrl,
                        duration: track.duration || 0,
                        genre: 'Unknown',
                        playlistTitle: `${displayArtistName} • ${t('popularTracks')}`,
                      }}
                    />
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('discography')}</h2>
              <p className="text-white/60 text-sm">{t('discographyDescription')}</p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
              {(["tracks", "albums", "singles"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    activeTab === tab ? "bg-white text-black font-medium" : "text-white/70 hover:text-white"
                  }`}
                >
                  {tab === "tracks" ? t('all') : (tab === "albums" ? t('albums') : t('singles'))}
                </button>
              ))}
            </div>
          </div>

          {filteredAlbums.length === 0 ? (
            <div className="text-center text-white/60 py-6">{t('nothingFound')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAlbums.map((album, index) => (
                <motion.div
                  key={album.id}
                  {...getMotionProps(index * 0.05)}
                  className="group relative rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-3 cursor-pointer hover:from-white/10 transition-all"
                  onClick={() => handleAlbumClick(album)}
                >
                  <div className="relative rounded-2xl overflow-hidden mb-3">
                    <img src={album.image} alt={album.title} className="w-full aspect-square object-cover" />
                    <button
                      onClick={(e) => handleAlbumPlay(e, album)}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Play className="w-4 h-4 ml-1" />
                    </button>
                  </div>

                  <h3 className="text-white font-medium truncate">{album.title}</h3>
                  <p className="text-sm text-white/60">
                    {album.year || "—"} • {album.type === "single" ? t('singleType') : t('albumType')}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
