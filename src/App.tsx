/**
 * Sip&Sound - Streaming Service
 * 
 * Features:
 * - Unified Spotify-style play buttons for all playlists
 * - 120Hz optimized animations with GPU acceleration
 * - Spotify-inspired dark glassmorphism design (#1ED760 green accent)
 * - Queue panel that slides content (Spotify-like behavior)
 * - Ambient glow effects on playlist hover
 * - Fullscreen player with synced lyrics
 * - Global keyboard shortcuts
 * - Responsive and mobile-optimized
 */
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CompactSidebar } from "./components/CompactSidebar";
import { SearchBar } from "./components/SearchBar";
import { PlaylistCard } from "./components/PlaylistCard";
import { QuickAccessCard } from "./components/QuickAccessCard";
import { NowPlaying } from "./components/NowPlaying";
import { QueuePanel } from "./components/QueuePanel";
import { Logo } from "./components/Logo";
import {
  PlayerProvider,
  usePlayer,
} from "./components/PlayerContext";
import { SettingsProvider, useSettings } from "./components/SettingsContext";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { LoginView } from "./components/LoginView";
import { RegisterView } from "./components/RegisterView";
import { lazy, Suspense } from "react";
import { LibraryView } from "./components/LibraryView";
import { SettingsView } from "./components/SettingsView";
import { ShowAllView } from "./components/ShowAllView";
import { ArtistView } from "./components/ArtistView";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { SearchView } from "./components/SearchView";
import { CreatePlaylistView } from "./components/CreatePlaylistView";
import { ProfileView } from "./components/ProfileView";

// Lazy loading для больших компонентов
const PlaylistView = lazy(() => import("./components/PlaylistView").then(m => ({ default: m.PlaylistView })));
const AdminPanel = lazy(() => import("./components/AdminPanel").then(m => ({ default: m.AdminPanel })));
const FullscreenPlayer = lazy(() => import("./components/FullscreenPlayer").then(m => ({ default: m.FullscreenPlayer })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
  </div>
);
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { apiClient } from "./api/client";
import { resolveImageUrl } from "./utils/media";

// Quick access data - will be loaded from database

type PlaylistCardData = {
  id: string;
  title: string;
  artist: string;
  image: string;
};

const FALLBACK_PLAYLIST_IMAGE = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';
const LIKED_SONGS_KEY = 'Liked Songs';
const DJ_PLAYLIST_NAME = 'DJ';

const normalizePlaylistCard = (playlist: { id: string; title: string; description?: string; coverUrl?: string }): PlaylistCardData => ({
  id: playlist.id,
  title: playlist.title,
  artist: playlist.description || 'Sip&Sound Playlist',
  image: resolveImageUrl(playlist.coverUrl, FALLBACK_PLAYLIST_IMAGE) || FALLBACK_PLAYLIST_IMAGE,
});

function MainContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    currentTrack,
    dominantColor,
    selectedPlaylist,
    closePlaylist,
    selectedArtist,
    closeArtistView,
    apiTracks,
    isLoadingTracks,
    setCurrentTrack,
  } = usePlayer();
  
  const { compactView, animations, t } = useSettings();

  // All hooks must be called before any conditional returns
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'library' | 'settings' | 'profile' | 'admin'>('home');
  const [showAllSection, setShowAllSection] = useState<'made' | 'recommended' | 'apiTracks' | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  // State for playlists from database
  const [playlists, setPlaylists] = useState<PlaylistCardData[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistReloadKey, setPlaylistReloadKey] = useState(0);
  
  // State for quick access items (artists and albums from database)
  const [quickAccess, setQuickAccess] = useState<Array<{ title: string; image: string; type: 'liked' | 'playlist' | 'artist' | 'album' | 'dj'; id?: string }>>([
    { title: LIKED_SONGS_KEY, image: "", type: "liked" },
    { title: DJ_PLAYLIST_NAME, image: "", type: "dj" },
  ]);
  const [loadingQuickAccess, setLoadingQuickAccess] = useState(false);

  useEffect(() => {
    const handleRefresh = () => setPlaylistReloadKey((prev) => prev + 1);
    window.addEventListener('playlists:refresh', handleRefresh);
    return () => window.removeEventListener('playlists:refresh', handleRefresh);
  }, []);

  // Load playlists from database
  useEffect(() => {
    if (!isAuthenticated) {
      setPlaylists([]);
      setLoadingPlaylists(false);
      return;
    }

    let isCancelled = false;

    const loadPlaylists = async () => {
      setLoadingPlaylists(true);
      try {
        const response = await apiClient.getPlaylists();
        if (isCancelled) {
          return;
        }

        const normalized =
          response.map((playlist) =>
            normalizePlaylistCard({
              id: playlist.id,
              title: playlist.title,
              description: playlist.description ?? undefined,
              coverUrl: playlist.coverUrl ?? undefined,
            })
          );

        setPlaylists(normalized);
      } catch (error) {
        console.error('Error loading playlists:', error);
        if (!isCancelled) {
          setPlaylists([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingPlaylists(false);
        }
      }
    };

    loadPlaylists();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, playlistReloadKey]);

  // Load quick access items (top artists and albums) from database
  useEffect(() => {
    if (!isAuthenticated) {
      setQuickAccess([
        { title: LIKED_SONGS_KEY, image: "", type: "liked" },
        { title: DJ_PLAYLIST_NAME, image: "", type: "dj" },
      ]);
      setLoadingQuickAccess(false);
      return;
    }

    let isCancelled = false;

    const loadQuickAccess = async () => {
      setLoadingQuickAccess(true);
      try {
        // Загружаем топ артистов и альбомы
        const [artistsResponse, albumsResponse] = await Promise.all([
          apiClient.getArtists({ limit: 3 }),
          apiClient.getAlbums({ limit: 3 }),
        ]);

        if (isCancelled) return;

        const quickAccessItems: Array<{ title: string; image: string; type: 'liked' | 'playlist' | 'artist' | 'album' | 'dj'; id?: string }> = [
          { title: LIKED_SONGS_KEY, image: "", type: "liked" },
          { title: DJ_PLAYLIST_NAME, image: "", type: "dj" },
        ];

        // Добавляем топ артистов
        artistsResponse.slice(0, 2).forEach((artist) => {
          quickAccessItems.push({
            title: artist.name,
            image: resolveImageUrl(artist.imageUrl || artist.imagePath) || '',
            type: 'artist',
            id: artist.id,
          });
        });

        // Добавляем топ альбомы
        albumsResponse.slice(0, 3).forEach((album) => {
          quickAccessItems.push({
            title: album.title,
            image: resolveImageUrl(album.coverUrl || album.coverPath) || '',
            type: 'album',
            id: album.id,
          });
        });

        // Если не хватает до 6 элементов, добавляем плейлисты
        if (quickAccessItems.length < 6 && playlists.length > 0) {
          const needed = 6 - quickAccessItems.length;
          playlists.slice(0, needed).forEach((playlist) => {
            quickAccessItems.push({
              title: playlist.title,
              image: playlist.image,
              type: 'playlist',
              id: playlist.id,
            });
          });
        }

        // Перемешиваем все, кроме закреплённых (Liked + DJ), и ограничиваем 6
        const pinned = quickAccessItems.filter((item) => item.type === 'liked' || item.type === 'dj');
        const rest = quickAccessItems.filter((item) => item.type !== 'liked' && item.type !== 'dj');
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        const finalItems = [...pinned, ...rest].slice(0, 6);

        setQuickAccess(finalItems);
      } catch (error: any) {
        // Ошибка обрабатывается через toast в apiClient
        if (!isCancelled) {
          setQuickAccess([
            { title: LIKED_SONGS_KEY, image: "", type: "liked" },
            { title: DJ_PLAYLIST_NAME, image: "", type: "dj" },
          ]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingQuickAccess(false);
        }
      }
    };

    loadQuickAccess();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, playlists]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#121212] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth view if not authenticated
  if (!isAuthenticated) {
    return authView === 'login' ? (
      <LoginView onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterView onSwitchToLogin={() => setAuthView('login')} />
    );
  }
  
  // Playlists with localized descriptions
  const madeForYou = playlists.slice(0, 6); // First 6 playlists as "Made for You"
  const recommendedPlaylists = playlists.length > 1 ? playlists.slice(1) : playlists; // Always show something

  // Get top glow color based on hovered playlist - enhanced with stronger glow
  const getTopGlowColor = () => {
    if (!hoveredPlaylist) {
      return "rgba(0, 0, 0, 0)";
    }

    // Enhanced playlist colors with stronger, more vibrant gradients
    const playlistColors: Record<string, string> = {
      [LIKED_SONGS_KEY]: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(167, 139, 250, 0.45) 0%, rgba(236, 72, 153, 0.25) 40%, transparent 80%)",
      [DJ_PLAYLIST_NAME]: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(34, 197, 94, 0.45) 0%, rgba(16, 185, 129, 0.25) 40%, transparent 80%)",
      'This Is Yeat': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(139, 92, 246, 0.45) 0%, rgba(99, 102, 241, 0.25) 40%, transparent 80%)",
      'LyfeStyle': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.25) 40%, transparent 80%)",
      'Tea Lovers': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.25) 40%, transparent 80%)",
      'From Sparta to Padre': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(239, 68, 68, 0.45) 0%, rgba(220, 38, 38, 0.25) 40%, transparent 80%)",
      'Daily Mix 1': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(99, 102, 241, 0.40) 0%, rgba(79, 70, 229, 0.22) 40%, transparent 80%)",
      'Daily Mix 2': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(236, 72, 153, 0.40) 0%, rgba(219, 39, 119, 0.22) 40%, transparent 80%)",
      'Daily Mix 3': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(16, 185, 129, 0.40) 0%, rgba(5, 150, 105, 0.22) 40%, transparent 80%)",
      'Daily Mix 4': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(251, 146, 60, 0.40) 0%, rgba(249, 115, 22, 0.22) 40%, transparent 80%)",
      'Daily Mix 5': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(139, 92, 246, 0.40) 0%, rgba(124, 58, 237, 0.22) 40%, transparent 80%)",
      'Daily Mix 6': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(59, 130, 246, 0.40) 0%, rgba(37, 99, 235, 0.22) 40%, transparent 80%)",
      'Peaceful Piano': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(239, 68, 68, 0.40) 0%, rgba(220, 38, 38, 0.22) 40%, transparent 80%)",
      'Deep Focus': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(251, 191, 36, 0.40) 0%, rgba(245, 158, 11, 0.22) 40%, transparent 80%)",
      'Jazz Vibes': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(20, 184, 166, 0.40) 0%, rgba(13, 148, 136, 0.22) 40%, transparent 80%)",
      'Chill Hits': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(217, 70, 239, 0.40) 0%, rgba(192, 38, 211, 0.22) 40%, transparent 80%)",
      'All Out 2010s': "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(132, 204, 22, 0.40) 0%, rgba(101, 163, 13, 0.22) 40%, transparent 80%)",
    };

    return playlistColors[hoveredPlaylist] || "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(30, 215, 96, 0.35) 0%, rgba(167, 139, 250, 0.2) 40%, transparent 80%)";
  };

  return (
    <>
      <div className="min-h-screen w-full relative overflow-hidden gpu-accelerated bg-[#121212]">
        {/* Enhanced ambient effect with Spotify-style top glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top area glow - enhanced and more vibrant */}
        <div
          className="absolute w-full h-[600px]"
          style={{
            background: getTopGlowColor(),
            opacity: hoveredPlaylist ? 1 : 0,
            filter: "blur(40px)",
            top: "-15%",
            left: "0",
            transition: "opacity 0.15s ease",
            pointerEvents: "none",
            willChange: "opacity",
          }}
        />
        
        {/* Subtle ambient accent */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(30, 215, 96, 0.05) 0%, transparent 65%)",
            opacity: 0.3,
            filter: "blur(50px)",
            left: "-15%",
            top: "20%",
          }}
        />
      </div>

      {/* Main content */}
      <div className={`relative z-10 h-screen flex flex-col gap-2 sm:gap-4 md:gap-6 ${compactView ? 'p-2 sm:p-2 md:p-3' : 'p-2 sm:p-4 md:p-6'}`}>
        {/* Top row: Sidebar and Main content */}
        <div className={`flex-1 flex min-h-0 ${compactView ? 'gap-2 sm:gap-2 md:gap-3' : 'gap-2 sm:gap-4 md:gap-6'}`}>
          {/* Compact Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-20 flex-shrink-0">
            <CompactSidebar 
              activeView={activeView}
              onViewChange={(view) => {
                setActiveView(view);
                setShowAllSection(null);
                setShowCreatePlaylist(false);
                closePlaylist(); // Close playlist when switching views
                closeArtistView(); // Close artist view when switching views
              }}
              onCreatePlaylist={() => {
                setShowCreatePlaylist(true);
                setActiveView('home');
                setShowAllSection(null);
                closePlaylist();
                closeArtistView();
              }}
            />
          </div>

          {/* Main content area with Queue panel */}
          <div className="flex-1 flex min-w-0 overflow-hidden gap-0">
            {/* Main scrollable content */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200 ${selectedPlaylist || activeView !== 'home' || showAllSection || selectedArtist || showCreatePlaylist ? '' : compactView ? 'gap-2 sm:gap-3 md:gap-4' : 'gap-4 sm:gap-5 md:gap-7'}`}>
            {selectedPlaylist ? (
              <Suspense fallback={<LoadingSpinner />}>
              <PlaylistView />
              </Suspense>
            ) : selectedArtist ? (
              <ArtistView onBack={closeArtistView} artist={selectedArtist} />
            ) : showCreatePlaylist ? (
              <CreatePlaylistView onBack={() => setShowCreatePlaylist(false)} />
            ) : showAllSection === 'made' ? (
              <ShowAllView
                title={t('madeForYou')}
                playlists={madeForYou}
                onBack={() => setShowAllSection(null)}
              />
            ) : showAllSection === 'recommended' ? (
              <ShowAllView
                title={t('recommendedPlaylists')}
                playlists={recommendedPlaylists}
                onBack={() => setShowAllSection(null)}
              />
            ) : showAllSection === 'apiTracks' ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 pl-2 pt-8 space-y-6 sm:space-y-8 md:space-y-10">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <motion.h2
                    className="section-heading-spotify text-2xl sm:text-3xl md:text-4xl gpu-accelerated"
                    style={{ color: '#ffffff' }}
                  >
                    Треки из базы данных
                  </motion.h2>
                  <motion.button
                    onClick={() => setShowAllSection(null)}
                    className="show-all-button-spotify glass px-4 sm:px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm opacity-70 hover:opacity-100 fast-transition hover:scale-105 gpu-accelerated"
                    style={{ color: '#ffffff' }}
                  >
                    {t('back') ?? 'Назад'}
                  </motion.button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                  {apiTracks.map((track, index) => (
                    <div
                      key={`${track.id || track.title}-${index}`}
                      className="relative group cursor-pointer"
                      onClick={() => setCurrentTrack(track, 'API Tracks')}
                    >
                      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900">
                        <img
                          src={track.image}
                          alt={track.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/12 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-[#1ED760] rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-white font-medium text-sm truncate">{track.title}</h3>
                        <p className="text-gray-300 text-xs truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeView === 'library' ? (
              <LibraryView />
            ) : activeView === 'settings' ? (
              <SettingsView />
            ) : activeView === 'profile' ? (
              <ProfileView />
            ) : activeView === 'admin' ? (
              <div className="flex-1 min-h-0 overflow-hidden rounded-3xl">
                <Suspense fallback={<LoadingSpinner />}>
              <AdminPanel />
                </Suspense>
              </div>
            ) : (
              <>
              {/* Top bar with greeting and centered search */}
              <div className="flex-shrink-0 grid items-center gap-3 sm:gap-4 lg:gap-6" style={{ gridTemplateColumns: 'minmax(auto, 1fr) minmax(auto, 32rem) minmax(auto, 1fr)' }}>
                {/* Logo - left side */}
                <div className="flex justify-start">
                  <Logo />
                </div>

                {/* Search bar - centered via grid */}
                <motion.div
                  className="gpu-accelerated"
                  {...(animations ? {
                    initial: { opacity: 0, y: -20 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] },
                  } : {
                    initial: false,
                    animate: false,
                  })}
                >
                  <div className="w-full sm:w-80 md:w-96 lg:w-[28rem] xl:w-[32rem] mx-auto">
                    <SearchBar 
                      value={searchQuery}
                      onChange={setSearchQuery}
                    />
                  </div>
                </motion.div>

                {/* Keyboard shortcuts button - right side */}
                <div className="flex justify-end items-center gap-3">
                  <KeyboardShortcuts />
                </div>
              </div>

              {/* Search View or Scrollable content */}
              {searchQuery ? (
                <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 pl-2 pt-6">
                  <SearchView 
                    searchQuery={searchQuery}
                    onClose={() => setSearchQuery('')}
                  />
                </div>
              ) : (
              <div
                className={`flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 pl-2 ${compactView ? 'pt-4 space-y-3 sm:space-y-4 md:space-y-5' : 'pt-8 space-y-5 sm:space-y-6 md:space-y-8'}`}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: currentTrack
                    ? `${dominantColor}40 transparent`
                    : "rgba(255, 255, 255, 0.2) transparent",
                }}
              >
                {/* Quick access grid - 2 rows x 3 columns on wide screens */}
                <section>
                  <div 
                    className={`grid ${isQueueOpen ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} ${compactView ? 'gap-1.5 sm:gap-2 md:gap-2 lg:gap-3' : 'gap-2 sm:gap-3 md:gap-4'}`}
                  >
                    {loadingQuickAccess ? (
                      <div className="col-span-full flex justify-center items-center py-8">
                        <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
                      </div>
                    ) : (
                      quickAccess.map((item, index) => (
                      <QuickAccessCard
                          key={item.id || item.title || index}
                        {...item}
                        index={index}
                        onHoverChange={setHoveredPlaylist}
                      />
                      ))
                    )}
                  </div>
                </section>

                {/* Made For section */}
                <section>
                  <div className={`flex items-center justify-between ${compactView ? 'mb-2 sm:mb-2 md:mb-3' : 'mb-3 sm:mb-4 md:mb-5'}`}>
                    <motion.h2
                      {...(animations ? {
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        transition: { delay: 0.1, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                      } : {
                        initial: false,
                        animate: false,
                      })}
                      className="section-heading-spotify text-xl sm:text-2xl md:text-3xl gpu-accelerated"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      {t('madeForYou')}
                    </motion.h2>
                    <motion.button
                      {...(animations ? {
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        transition: { delay: 0.15, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                      } : {
                        initial: false,
                        animate: false,
                      })}
                      onClick={() => setShowAllSection('made')}
                      className="show-all-button-spotify hidden sm:block glass px-4 sm:px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm opacity-70 hover:opacity-100 fast-transition hover:scale-105 gpu-accelerated"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      {t('showAll')}
                    </motion.button>
                  </div>
                  <div className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4'}`}>
                    {loadingPlaylists ? (
                      <div className="col-span-full flex justify-center items-center py-8">
                        <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
                      </div>
                    ) : (
                      madeForYou.slice(0, 5).map((playlist, index) => (
                        <PlaylistCard
                          key={index}
                          {...playlist}
                          index={index}
                          onHoverChange={setHoveredPlaylist}
                        />
                      ))
                    )}
                  </div>
                </section>

                {/* API Tracks section */}
                {apiTracks.length > 0 && (
                  <section>
                    <div className={`flex items-center justify-between ${compactView ? 'mb-2 sm:mb-2 md:mb-3' : 'mb-3 sm:mb-4 md:mb-5'}`}>
                      <motion.h2
                        {...(animations ? {
                          initial: { opacity: 0, y: 20 },
                          animate: { opacity: 1, y: 0 },
                          transition: { delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                        } : {
                          initial: false,
                          animate: false,
                        })}
                        className="section-heading-spotify text-xl sm:text-2xl md:text-3xl gpu-accelerated"
                        style={{
                          color: "#ffffff",
                        }}
                      >
                        Треки из базы данных
                      </motion.h2>
                      <motion.button
                        {...(animations ? {
                          initial: { opacity: 0 },
                          animate: { opacity: 1 },
                          transition: { delay: 0.15, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                        } : {
                          initial: false,
                          animate: false,
                        })}
                        onClick={() => setShowAllSection('apiTracks')}
                        className="show-all-button-spotify hidden sm:block glass px-4 sm:px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm opacity-70 hover:opacity-100 fast-transition hover:scale-105 gpu-accelerated"
                        style={{
                          color: "#ffffff",
                        }}
                      >
                        {t('showAll')}
                      </motion.button>
                    </div>
                    <div className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4'}`}>
                      {isLoadingTracks ? (
                        <div className="col-span-full flex justify-center items-center py-8">
                          <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
                        </div>
                      ) : (
                        apiTracks.slice(0, 5).map((track, index) => (
                          <div
                            key={index}
                            className="relative group cursor-pointer"
                            onClick={() => {
                              // Воспроизводим трек из API
                              setCurrentTrack(track, 'API Tracks');
                            }}
                          >
                            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900">
                              <img
                                src={track.image}
                                alt={track.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-white/6 group-hover:bg-white/12 transition-colors" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 bg-[#1ED760] rounded-full flex items-center justify-center shadow-lg">
                                  <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <h3 className="text-white font-medium text-sm truncate">{track.title}</h3>
                              <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {/* Playlists section */}
                <section>
                  <div className={`flex items-center justify-between ${compactView ? 'mb-2 sm:mb-2 md:mb-3' : 'mb-3 sm:mb-4 md:mb-5'}`}>
                    <motion.h2
                      {...(animations ? {
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        transition: { delay: 0.2, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                      } : {
                        initial: false,
                        animate: false,
                      })}
                      className="section-heading-spotify text-xl sm:text-2xl md:text-3xl gpu-accelerated"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      {t('recommendedPlaylists')}
                    </motion.h2>
                    <motion.button
                      {...(animations ? {
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        transition: { delay: 0.25, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                      } : {
                        initial: false,
                        animate: false,
                      })}
                      onClick={() => setShowAllSection('recommended')}
                      className="show-all-button-spotify hidden sm:block glass px-4 sm:px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm opacity-70 hover:opacity-100 fast-transition hover:scale-105 gpu-accelerated"
                      style={{
                        color: "#ffffff",
                      }}
                    >
                      {t('showAll')}
                    </motion.button>
                  </div>
                  <div className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4'}`}>
                    {loadingPlaylists ? (
                      <div className="col-span-full flex justify-center items-center py-8">
                        <div className="w-8 h-8 border-4 border-[#1ED760]/20 border-t-[#1ED760] rounded-full animate-spin" />
                      </div>
                    ) : (
                      recommendedPlaylists.slice(0, 5).map((playlist, index) => (
                        <PlaylistCard
                          key={index}
                          {...playlist}
                          index={index + 6}
                          onHoverChange={setHoveredPlaylist}
                        />
                      ))
                    )}
                  </div>
                </section>

                {/* Spacer for bottom player */}
                <div className="h-4" />
              </div>
              )}
            </>
            )}
            </div>

            {/* Queue Panel - only visible when open and track is playing */}
            {isQueueOpen && currentTrack && (
              <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
            )}
          </div>
        </div>

        {/* Now playing bar */}
        <div className="flex-shrink-0">
          <NowPlaying 
            onQueueToggle={() => setIsQueueOpen(!isQueueOpen)}
            isQueueOpen={isQueueOpen}
          />
        </div>
      </div>

      {/* Fullscreen Player */}
      <Suspense fallback={null}>
      <FullscreenPlayer />
      </Suspense>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <SettingsProvider>
      <AuthProvider>
        <PlayerProvider>
          <MainContent />
          <Toaster />
        </PlayerProvider>
      </AuthProvider>
    </SettingsProvider>
    </ErrorBoundary>
  );
}