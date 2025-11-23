import { motion } from "motion/react";
import { Play, Shuffle, Check, MoreHorizontal, ChevronLeft, Clock } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useSettings } from "./SettingsContext";
import { ImageWithFallback } from "@/components/timurgenii/ImageWithFallback";
import { useState, useEffect } from "react";

interface Track {
  id: number;
  title: string;
  album?: string;
  plays: string;
  duration: string;
  image?: string;
}

interface Album {
  title: string;
  year: number;
  image: string;
  type?: "album" | "single";
}

interface Artist {
  name: string;
  image: string;
  coverImage: string;
  verified: boolean;
  monthlyListeners: string;
  topTracks: Track[];
  albums: Album[];
}

interface ArtistViewProps {
  onBack: () => void;
  artistName?: string;
}

type TabType = "tracks" | "albums" | "singles";

const mockArtists: { [key: string]: Artist } = {
  "Travis Scott": {
    name: "Travis Scott",
    image: "https://images.unsplash.com/photo-1546405524-5714e4492a01?w=400",
    coverImage: "https://images.unsplash.com/flagged/photo-1557286249-08f5bc2ef21d?w=1200",
    verified: true,
    monthlyListeners: "61,297,892",
    topTracks: [
      { id: 1, title: "goosebumps", album: "UTOPIA", plays: "2,969,966,425", duration: "4:03", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" },
      { id: 2, title: "FEIN (feat. Playboi Carti)", album: "UTOPIA", plays: "1,437,289,547", duration: "3:11", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" },
      { id: 3, title: "HIGHEST IN THE ROOM", album: "JACKBOYS 2", plays: "2,131,704,845", duration: "2:55", image: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400" },
      { id: 4, title: "SICKO MODE", album: "ASTROWORLD", plays: "1,892,445,321", duration: "5:13", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 5, title: "Butterfly Effect", album: "ASTROWORLD", plays: "1,234,567,890", duration: "3:10", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 6, title: "STARGAZING", album: "ASTROWORLD", plays: "987,654,321", duration: "4:30", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" },
      { id: 7, title: "Antidote", album: "Rodeo", plays: "876,543,210", duration: "4:21", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400" },
      { id: 8, title: "90210", album: "Rodeo", plays: "765,432,109", duration: "5:38", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400" },
      { id: 9, title: "YOSEMITE", album: "ASTROWORLD", plays: "654,321,098", duration: "2:30", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 10, title: "NO BYSTANDERS", album: "ASTROWORLD", plays: "543,210,987", duration: "3:38", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
    ],
    albums: [
      { title: "UTOPIA", year: 2023, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400", type: "album" },
      { title: "ASTROWORLD", year: 2018, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", type: "album" },
      { title: "Birds In The Trap Sing McKnight", year: 2016, image: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400", type: "album" },
      { title: "Rodeo", year: 2015, image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400", type: "album" },
      { title: "JACKBOYS 2", year: 2025, image: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=400", type: "album" },
      { title: "Pipe Down (feat. Travis Scott)", year: 2021, image: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400", type: "single" },
      { title: "HIGHEST IN THE ROOM", year: 2019, image: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400", type: "single" },
    ],
  },
  "Gaviin": {
    name: "Gaviin",
    image: "https://images.unsplash.com/photo-1675099348165-1c9056e5e492?w=400",
    coverImage: "https://images.unsplash.com/photo-1633119216068-12d17b878451?w=1200",
    verified: true,
    monthlyListeners: "42,156,783",
    topTracks: [
      { id: 1, title: "Back Cooking", album: "Latest", plays: "856,234,120", duration: "3:45", image: "https://images.unsplash.com/photo-1601643157091-ce5c665179ab?w=400" },
      { id: 2, title: "Only Time", album: "Singles", plays: "734,892,456", duration: "3:22", image: "https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?w=400" },
      { id: 3, title: "I Need You", album: "Latest", plays: "623,445,789", duration: "4:01", image: "https://images.unsplash.com/photo-1624703307604-744ec383cbf4?w=400" },
      { id: 4, title: "LICKS", album: "Latest", plays: "512,334,667", duration: "2:58", image: "https://images.unsplash.com/photo-1692271931628-adc2b16670dd?w=400" },
      { id: 5, title: "Voices / Psycho", album: "Singles", plays: "445,223,891", duration: "3:34", image: "https://images.unsplash.com/photo-1651597035515-36e4b2722fcb?w=400" },
      { id: 6, title: "Night Drive", album: "Latest", plays: "398,765,432", duration: "3:52", image: "https://images.unsplash.com/photo-1601643157091-ce5c665179ab?w=400" },
      { id: 7, title: "Sunrise", album: "Singles", plays: "345,678,901", duration: "4:15", image: "https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?w=400" },
      { id: 8, title: "Lost in Time", album: "Latest", plays: "298,765,432", duration: "3:28", image: "https://images.unsplash.com/photo-1624703307604-744ec383cbf4?w=400" },
      { id: 9, title: "Midnight City", album: "Singles", plays: "267,543,210", duration: "3:47", image: "https://images.unsplash.com/photo-1692271931628-adc2b16670dd?w=400" },
      { id: 10, title: "Dreams", album: "Latest", plays: "234,567,890", duration: "4:05", image: "https://images.unsplash.com/photo-1651597035515-36e4b2722fcb?w=400" },
    ],
    albums: [
      { title: "Latest Album", year: 2025, image: "https://images.unsplash.com/photo-1601643157091-ce5c665179ab?w=400", type: "album" },
      { title: "Singles Collection", year: 2024, image: "https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?w=400", type: "single" },
    ],
  },
  "The Weeknd": {
    name: "The Weeknd",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    coverImage: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200",
    verified: true,
    monthlyListeners: "95,432,109",
    topTracks: [
      { id: 1, title: "Blinding Lights", album: "After Hours", plays: "3,876,234,567", duration: "3:20", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400" },
      { id: 2, title: "Starboy", album: "Starboy", plays: "2,945,123,456", duration: "3:50", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 3, title: "Save Your Tears", album: "After Hours", plays: "2,345,678,901", duration: "3:35", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400" },
      { id: 4, title: "Die For You", album: "Starboy", plays: "1,987,654,321", duration: "4:20", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 5, title: "The Hills", album: "Beauty Behind The Madness", plays: "1,765,432,109", duration: "4:02", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" },
      { id: 6, title: "Sacrifice", album: "Dawn FM", plays: "1,234,567,890", duration: "3:08", image: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400" },
      { id: 7, title: "Can't Feel My Face", album: "Beauty Behind The Madness", plays: "1,123,456,789", duration: "3:35", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" },
      { id: 8, title: "I Feel It Coming", album: "Starboy", plays: "987,654,321", duration: "4:29", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" },
      { id: 9, title: "Take My Breath", album: "Dawn FM", plays: "876,543,210", duration: "5:40", image: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400" },
      { id: 10, title: "Out of Time", album: "Dawn FM", plays: "765,432,109", duration: "3:34", image: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400" },
    ],
    albums: [
      { title: "After Hours", year: 2020, image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400", type: "album" },
      { title: "Dawn FM", year: 2022, image: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400", type: "album" },
      { title: "Starboy", year: 2016, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", type: "album" },
      { title: "Beauty Behind The Madness", year: 2015, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400", type: "album" },
    ],
  },
};

export function ArtistView({ onBack, artistName }: ArtistViewProps) {
  const { currentTrack, setCurrentTrack, isPlaying, togglePlay, openPlaylist, artistReturnTab } = usePlayer();
  const { animations, t } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("tracks");
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null);

  // When returning from a playlist opened from artist view, restore the correct tab
  useEffect(() => {
    if (artistReturnTab) {
      setActiveTab(artistReturnTab);
    }
  }, [artistReturnTab]);

  // Get current artist from props or track
  const currentArtist = artistName || currentTrack?.artist || "Travis Scott";
  const artist = mockArtists[currentArtist] || mockArtists["Travis Scott"];

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

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack({
      title: track.title,
      artist: artist.name,
      image: track.image || artist.image,
      genre: "Hip-Hop",
      duration: 180,
    });
    if (!isPlaying) {
      togglePlay();
    }
  };

  const handlePlayAll = () => {
    if (artist.topTracks.length > 0) {
      handlePlayTrack(artist.topTracks[0]);
    }
  };

  const handleAlbumClick = (album: Album) => {
    // Open album as a playlist and remember which tab we're on
    openPlaylist({ 
      title: album.title, 
      artist: `${album.year} • ${artist.name}`, 
      image: album.image,
      type: 'playlist',
      returnToArtistTab: activeTab // Pass current tab so we can return to it
    });
  };

  const handleAlbumPlay = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    // Get random tracks for this album (since we don't have real album data)
    const tracks = artist.topTracks.filter(track => track.album === album.title);
    if (tracks.length === 0) {
      // If no tracks match, use first track from artist
      if (artist.topTracks.length > 0) {
        handlePlayTrack(artist.topTracks[0]);
      }
    } else {
      handlePlayTrack(tracks[0]);
    }
  };

  const filteredAlbums = artist.albums.filter((album) => {
    if (activeTab === "albums") return album.type === "album";
    if (activeTab === "singles") return album.type === "single";
    return true;
  });

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl h-full overflow-hidden">
      {/* Back button - positioned on artist cover */}
      <button
        onClick={onBack}
        className="fixed top-8 left-6 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 fast-transition"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Scrollable content - everything scrolls together */}
      <div 
        className="h-full overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
        }}
      >
        {/* Header with artist cover */}
        <div className="relative h-[280px] sm:h-[340px]">
          {/* Background image with gradient overlay */}
          <div className="absolute inset-0 rounded-t-2xl sm:rounded-t-3xl overflow-hidden">
            <ImageWithFallback
              src={artist.coverImage}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(18,18,18,0) 0%, rgba(18,18,18,0.5) 70%, rgba(18,18,18,1) 100%)",
              }}
            />
          </div>

          {/* Artist info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <motion.div {...getMotionProps(0.1)} className="flex items-center gap-2 mb-2">
              {artist.verified && (
                <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: "#1ED760" }}>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center" style={{ background: "#1ED760" }}>
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
                  </div>
                  <span style={{ fontWeight: "700" }}>{t('verifiedArtist')}</span>
                </div>
              )}
            </motion.div>

            <motion.h1
              {...getMotionProps(0.15)}
              className="playlist-title-spotify"
              style={{
                fontSize: "clamp(2rem, 6vw, 4rem)",
                color: "#ffffff",
                textShadow: "0 4px 20px rgba(0,0,0,0.8)",
                marginBottom: "0.5rem",
              }}
            >
              {artist.name}
            </motion.h1>

            <motion.p {...getMotionProps(0.2)} className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {artist.monthlyListeners} {t('monthlyListeners')}
            </motion.p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="px-4 sm:px-6 py-4 sm:py-6" style={{ background: "rgba(18,18,18,0.4)" }}>
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.button
              {...getMotionProps(0.25)}
              onClick={handlePlayAll}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:scale-110 fast-transition gpu-accelerated"
              style={{
                background: "#1ED760",
                color: "#000",
              }}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />
            </motion.button>

            <motion.button
              {...getMotionProps(0.28)}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:scale-110 fast-transition"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>

            <motion.button
              {...getMotionProps(0.31)}
              className="hidden sm:block px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border hover:scale-105 fast-transition"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.875rem",
                fontWeight: "700",
              }}
            >
              {t('following')}
            </motion.button>

            <motion.button
              {...getMotionProps(0.34)}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:scale-110 fast-transition"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setActiveTab("tracks")}
                className={`px-4 py-2 rounded-full text-sm sm:text-base whitespace-nowrap fast-transition ${
                  activeTab === "tracks" ? "bg-white/10" : "hover:bg-white/5"
                }`}
                style={{
                  color: activeTab === "tracks" ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontWeight: activeTab === "tracks" ? "700" : "400",
                }}
              >
                {t('popularTracks')}
              </button>
              <button
                onClick={() => setActiveTab("albums")}
                className={`px-4 py-2 rounded-full text-sm sm:text-base whitespace-nowrap fast-transition ${
                  activeTab === "albums" ? "bg-white/10" : "hover:bg-white/5"
                }`}
                style={{
                  color: activeTab === "albums" ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontWeight: activeTab === "albums" ? "700" : "400",
                }}
              >
                {t('albums')}
              </button>
              <button
                onClick={() => setActiveTab("singles")}
                className={`px-4 py-2 rounded-full text-sm sm:text-base whitespace-nowrap fast-transition ${
                  activeTab === "singles" ? "bg-white/10" : "hover:bg-white/5"
                }`}
                style={{
                  color: activeTab === "singles" ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontWeight: activeTab === "singles" ? "700" : "400",
                }}
              >
                {t('singlesAndEP')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Main content area */}
              <div className="lg:col-span-2">
                {activeTab === "tracks" && (
                  <div>
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="section-heading-spotify text-xl sm:text-2xl" style={{ color: "#ffffff" }}>
                        {t('popularTracks')}
                      </h2>
                    </div>

                    {/* Table header */}
                    <div className="hidden sm:grid grid-cols-[50px_1fr_120px_80px] gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 mb-2 text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <div className="text-center">#</div>
                      <div>{t('title')}</div>
                      <div className="hidden md:block text-right">{t('plays')}</div>
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    </div>
                    
                    {/* Tracks list */}
                    <div className="space-y-1">
                    {artist.topTracks.slice(0, showAllTracks ? 10 : 5).map((track, index) => {
                      const isCurrentTrack = currentTrack?.title === track.title;
                      return (
                        <motion.button
                          key={track.id}
                          {...getMotionProps(0.05 * index)}
                          onClick={() => handlePlayTrack(track)}
                          className={`w-full flex items-center gap-3 sm:gap-4 p-2 rounded-lg hover:bg-white/5 fast-transition group ${
                            isCurrentTrack ? "bg-white/10" : ""
                          }`}
                        >
                          {/* Track number / play icon */}
                          <div className="w-6 sm:w-8 text-center flex-shrink-0">
                            <span 
                              className="group-hover:hidden text-sm"
                              style={{ color: isCurrentTrack ? "#1ED760" : "rgba(255,255,255,0.6)" }}
                            >
                              {index + 1}
                            </span>
                            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden group-hover:inline-block mx-auto" style={{ color: "#fff" }} fill="#fff" />
                          </div>

                          {/* Track image */}
                          {track.image && (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden flex-shrink-0">
                              <ImageWithFallback
                                src={track.image}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Track info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div 
                              className="truncate text-sm sm:text-base"
                              style={{ 
                                color: isCurrentTrack ? "#1ED760" : "#ffffff",
                                fontWeight: isCurrentTrack ? "700" : "400",
                              }}
                            >
                              {track.title}
                            </div>
                            {track.album && (
                              <div className="text-xs sm:text-sm truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                                {track.album}
                              </div>
                            )}
                          </div>

                          {/* Plays count */}
                          <div className="hidden md:block text-xs sm:text-sm flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>
                            {track.plays}
                          </div>

                          {/* Duration */}
                          <div className="text-xs sm:text-sm flex-shrink-0 w-10 sm:w-12 text-right" style={{ color: "rgba(255,255,255,0.6)" }}>
                            {track.duration}
                          </div>
                        </motion.button>
                      );
                    })}
                    </div>

                    {/* See more / Show less button */}
                    {artist.topTracks.length > 5 && (
                      <motion.button
                        {...getMotionProps(0.3)}
                        onClick={() => setShowAllTracks(!showAllTracks)}
                        className="mt-4 px-6 py-2.5 text-sm rounded-lg hover:bg-white/5 fast-transition"
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: "700",
                        }}
                      >
                        {showAllTracks ? t('showLess') : t('seeMore')}
                      </motion.button>
                    )}
                  </div>
                )}

                {(activeTab === "albums" || activeTab === "singles") && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {filteredAlbums.map((album, index) => {
                      const isHovered = hoveredAlbum === album.title;

                      return (
                        <motion.div
                          key={index}
                          {...getMotionProps(0.05 * index)}
                          onClick={() => handleAlbumClick(album)}
                          onMouseEnter={() => setHoveredAlbum(album.title)}
                          onMouseLeave={() => setHoveredAlbum(null)}
                          className="group cursor-pointer relative overflow-hidden"
                        >
                          <div className="glass-card rounded-lg p-3 sm:p-4 hover:bg-white/5 hover:scale-105 hover:-translate-y-1 fast-transition gpu-accelerated relative">
                            {/* Hover glow effect */}
                            <div
                              className="absolute inset-0 pointer-events-none fast-transition gpu-accelerated"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.15) 0%, rgba(29, 185, 84, 0.10) 100%)',
                                opacity: isHovered ? 1 : 0
                              }}
                            />

                            <div className="aspect-square rounded overflow-hidden mb-3 relative">
                              <ImageWithFallback
                                src={album.image}
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
                                  onClick={(e) => handleAlbumPlay(e, album)}
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
                            
                            <div className="relative z-10">
                              <div className="text-sm truncate" style={{ color: "#ffffff", fontWeight: "700" }}>
                                {album.title}
                              </div>
                              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                                {album.year} • {album.type === "album" ? t('album') : "Single"}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar with liked tracks */}
              <div className="space-y-6 sm:space-y-8">
                {/* Liked tracks */}
                <div>
                  <h3 className="text-sm sm:text-base mb-3 sm:mb-4" style={{ color: "#ffffff", fontWeight: "700" }}>
                    {t('likedTracks')}
                  </h3>
                  <div className="glass-card rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={artist.image}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                          {t('youLiked')} 12 {t('tracks')}
                        </div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                          {t('by')} {artist.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
