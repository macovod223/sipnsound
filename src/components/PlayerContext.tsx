import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useSettings } from './SettingsContext';
import { apiClient } from '../api/client';

interface LyricLine {
  time: number;
  text: string;
}

interface Track {
  title: string;
  artist: string;
  image: string;
  genre: string;
  duration?: number;
  lyrics?: LyricLine[];
  playlistTitle?: string; // Add playlist context
}

export interface Playlist {
  title: string;
  artist: string;
  image: string;
  type?: 'liked' | 'playlist';
  returnTo?: 'playlists' | 'albums' | 'browse'; // Track where to return to
  returnToArtistTab?: 'tracks' | 'albums' | 'singles'; // Track which artist tab to return to
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isFullscreen: boolean;
  dominantColor: string;
  colorPalette: string[];
  textColor: string;
  textShadow: string;
  currentTime: number;
  duration: number;
  selectedPlaylist: Playlist | null;
  likedTracks: Set<string>;
  selectedArtist: string | null;
  libraryReturnCategory: 'browse' | 'playlists' | 'albums' | null;
  artistReturnTab: 'tracks' | 'albums' | 'singles' | null;
  setCurrentTrack: (track: Track, playlistName?: string) => void;
  togglePlay: () => void;
  toggleFullscreen: () => void;
  extractColorFromImage: (imageUrl: string) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  openPlaylist: (playlist: Playlist) => void;
  closePlaylist: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleLike: (trackTitle: string) => void;
  isLiked: (trackTitle: string) => boolean;
  openArtistView: (artistName: string) => void;
  closeArtistView: () => void;
  apiTracks: Track[];
  isLoadingTracks: boolean;
  loadTracksFromAPI: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Mock lyrics data для демонстрации
const mockLyrics: { [key: string]: LyricLine[] } = {
  'Daily Mix 1': [
    { time: 0, text: 'In the silence of the night' },
    { time: 3.5, text: 'I hear the whispers calling' },
    { time: 7, text: 'Through the shadows and the light' },
    { time: 10.5, text: 'Feel the rhythm slowly falling' },
    { time: 14, text: '' },
    { time: 15, text: 'Every beat inside my chest' },
    { time: 18.5, text: 'Reminds me of the moment' },
    { time: 22, text: 'When we danced until the rest' },
    { time: 25.5, text: 'Of the world just disappeared' },
    { time: 29, text: '' },
    { time: 30, text: 'Take me higher, take me there' },
    { time: 33.5, text: 'To the place where music lives' },
    { time: 37, text: 'In the atmosphere we share' },
    { time: 40.5, text: 'Where the melody just gives' },
    { time: 44, text: '' },
    { time: 45, text: 'Lost in sound and lost in you' },
    { time: 48.5, text: 'Nothing else matters now' },
    { time: 52, text: 'Every note feels so true' },
    { time: 55.5, text: 'In this moment, here and now' },
  ],
  'Peaceful Piano': [
    { time: 0, text: 'Gentle keys in morning light' },
    { time: 4, text: 'Paint the canvas of the day' },
    { time: 8, text: 'Every note so soft and bright' },
    { time: 12, text: 'Guides my soul along the way' },
    { time: 16, text: '' },
    { time: 18, text: 'In the quiet, I can hear' },
    { time: 22, text: 'Melodies of peace unfold' },
    { time: 26, text: 'Every chord so crystal clear' },
    { time: 30, text: 'Stories waiting to be told' },
  ],
  'This Is Yeat': [
    { time: 0, text: 'Yeah, we taking off' },
    { time: 2, text: 'No looking back now' },
    { time: 4, text: 'Living life fast' },
    { time: 6, text: 'In the moment right now' },
    { time: 8, text: '' },
    { time: 9, text: 'Energy so high' },
    { time: 11, text: 'Reaching for the sky' },
    { time: 13, text: 'Nothing can stop us' },
    { time: 15, text: 'Watch us as we fly' },
  ],
};

// Playlists with their tracks
export const playlistsData: { [key: string]: Track[] } = {
  'LyfeStyle': [
    { title: 'LyfeStyle Track 1', artist: 'Artist 1', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Pop', duration: 205 },
    { title: 'LyfeStyle Track 2', artist: 'Artist 2', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Pop', duration: 192 },
    { title: 'LyfeStyle Track 3', artist: 'Artist 3', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Pop', duration: 208 },
    { title: 'LyfeStyle Track 4', artist: 'Artist 4', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Pop', duration: 195 },
    { title: 'LyfeStyle Track 5', artist: 'Artist 5', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Pop', duration: 212 },
    { title: 'LyfeStyle Track 6', artist: 'Artist 6', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Pop', duration: 198 },
    { title: 'LyfeStyle Track 7', artist: 'Artist 7', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Pop', duration: 203 },
    { title: 'LyfeStyle Track 8', artist: 'Artist 8', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Pop', duration: 210 },
  ],
  'Liked Songs': [
    { title: 'Favorite Song 1', artist: 'Popular Artist', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Various', duration: 218 },
    { title: 'Favorite Song 2', artist: 'Top Artist', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Various', duration: 203 },
    { title: 'Favorite Song 3', artist: 'Best Artist', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Various', duration: 195 },
    { title: 'Favorite Song 4', artist: 'Amazing Artist', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Various', duration: 210 },
    { title: 'Favorite Song 5', artist: 'Great Artist', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Various', duration: 198 },
    { title: 'Favorite Song 6', artist: 'Star Artist', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Various', duration: 205 },
    { title: 'Favorite Song 7', artist: 'Famous Artist', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Various', duration: 213 },
  ],
  'This Is Yeat': [
    { title: 'Sorry Bout That', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 162 },
    { title: 'Mad bout that', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 148 },
    { title: 'Poppin', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 135 },
    { title: 'Talk', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 154 },
    { title: 'Get Busy', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 165 },
    { title: 'Money Twerk', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 172 },
    { title: 'Géëk high', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 158 },
    { title: 'Turban', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 143 },
    { title: 'Out thë way', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 152 },
    { title: 'Up 2 Më', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Hip Hop', duration: 168 },
  ],
  'DJ': [
    { title: 'One More Time', artist: 'Daft Punk', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'House', duration: 320 },
    { title: 'Around The World', artist: 'Daft Punk', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'House', duration: 429 },
    { title: 'Levels', artist: 'Avicii', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'EDM', duration: 198 },
    { title: 'Wake Me Up', artist: 'Avicii', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'EDM', duration: 249 },
    { title: 'Animals', artist: 'Martin Garrix', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Big Room', duration: 302 },
    { title: 'Titanium', artist: 'David Guetta ft. Sia', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'EDM', duration: 245 },
    { title: 'Don\'t You Worry Child', artist: 'Swedish House Mafia', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Progressive House', duration: 403 },
    { title: 'Clarity', artist: 'Zedd ft. Foxes', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'EDM', duration: 272 },
    { title: 'Summer', artist: 'Calvin Harris', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'EDM', duration: 223 },
    { title: 'This Is What You Came For', artist: 'Calvin Harris ft. Rihanna', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'EDM', duration: 222 },
  ],
  'Daily Mix 1': [
    { title: 'SICKO MODE', artist: 'Travis Scott', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 225 },
    { title: 'Praise The Lord', artist: 'A$AP Rocky', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 211 },
    { title: 'HUMBLE.', artist: 'Kendrick Lamar', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 177 },
    { title: 'goosebumps', artist: 'Travis Scott', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 243 },
    { title: 'DNA.', artist: 'Kendrick Lamar', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 185 },
    { title: 'L$D', artist: 'A$AP Rocky', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 238 },
    { title: 'Butterfly Effect', artist: 'Travis Scott', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 190 },
    { title: 'ELEMENT.', artist: 'Kendrick Lamar', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Hip Hop', duration: 208 },
  ],
  'Daily Mix 2': [
    { title: 'Superhero', artist: 'Metro Boomin', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 198 },
    { title: 'Mask Off', artist: 'Future', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 204 },
    { title: 'Bank Account', artist: '21 Savage', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 220 },
    { title: 'Life Is Good', artist: 'Future ft. Drake', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 238 },
    { title: 'a lot', artist: '21 Savage', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 288 },
    { title: 'Creepin', artist: 'Metro Boomin', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 221 },
    { title: 'Low Life', artist: 'Future ft. The Weeknd', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Trap', duration: 311 },
  ],
  'Daily Mix 3': [
    { title: 'Yale', artist: 'Ken Carson', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 210 },
    { title: 'Sky', artist: 'Playboi Carti', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 193 },
    { title: 'Money So Big', artist: 'Yeat', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 168 },
    { title: 'M3tamorphosis', artist: 'Playboi Carti', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 204 },
    { title: 'Rock N Roll', artist: 'Ken Carson', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 162 },
    { title: 'Stop Breathing', artist: 'Playboi Carti', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 158 },
    { title: 'Freestyle 2', artist: 'Ken Carson', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Rage', duration: 175 },
  ],
  'Peaceful Piano': [
    { title: 'Moonlight Sonata', artist: 'Classical Piano', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400', genre: 'Classical', duration: 240 },
    { title: 'Clair de Lune', artist: 'Piano Masters', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400', genre: 'Classical', duration: 255 },
    { title: 'Nocturne', artist: 'Calm Piano', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400', genre: 'Classical', duration: 228 },
  ],
  'Tea Lovers': [
    { title: 'Lofi Hip Hop Beat 1', artist: 'ChilledCow', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Lofi', duration: 165 },
    { title: 'Coffee Shop Jazz', artist: 'Jazz Vibes', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Jazz', duration: 192 },
    { title: 'Rainy Day', artist: 'Lofi Beats', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Lofi', duration: 178 },
    { title: 'Study Time', artist: 'Focus Music', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Ambient', duration: 200 },
    { title: 'Green Tea Dreams', artist: 'Ambient Sounds', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Ambient', duration: 245 },
    { title: 'Morning Brew', artist: 'Chill Beats', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Lofi', duration: 168 },
    { title: 'Afternoon Delight', artist: 'Relax Master', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Chill', duration: 215 },
    { title: 'Evening Meditation', artist: 'Zen Music', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Meditation', duration: 262 },
  ],
  'From Sparta to Padre': [
    { title: 'Epic Journey', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Epic', duration: 248 },
    { title: 'Victory', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Epic', duration: 235 },
    { title: 'Heart of Courage', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Epic', duration: 200 },
    { title: 'Protectors of the Earth', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Epic', duration: 228 },
    { title: 'To Glory', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Epic', duration: 215 },
    { title: 'Archangel', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Epic', duration: 242 },
    { title: 'Strength of a Thousand Men', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Epic', duration: 195 },
    { title: 'Star Sky', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', genre: 'Epic', duration: 268 },
    { title: 'United We Stand', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', genre: 'Epic', duration: 222 },
    { title: 'Black Blade', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Epic', duration: 255 },
    { title: 'Immortal', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Epic', duration: 238 },
    { title: 'Rebirth', artist: 'Two Steps From Hell', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', genre: 'Epic', duration: 262 },
  ],
  'Daily Mix 4': [
    { title: 'No Idea', artist: 'Don Toliver', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Hip Hop', duration: 213 },
    { title: 'XO Tour Llif3', artist: 'Lil Uzi Vert', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Hip Hop', duration: 183 },
    { title: 'Dark Knight Dummo', artist: 'Trippie Redd', image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', genre: 'Hip Hop', duration: 178 },
  ],
  'Daily Mix 5': [
    { title: 'Flex', artist: 'Toxis', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Rap', duration: 195 },
    { title: 'Gimme The Loot', artist: 'Big Baby Tape', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Rap', duration: 202 },
    { title: 'Slatt', artist: 'FRIENDLY THUG 52 NG', image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400', genre: 'Rap', duration: 188 },
  ],
  'Daily Mix 6': [
    { title: 'Положение', artist: 'Skryptonite', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', genre: 'Rap', duration: 215 },
    { title: 'Не Ангел', artist: 'MACAN', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', genre: 'Rap', duration: 198 },
    { title: 'Сансара', artist: 'Basta', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', genre: 'Rap', duration: 227 },
  ],
  'Deep Focus': [
    { title: 'Ambient Study', artist: 'Focus Music', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', genre: 'Ambient', duration: 268 },
    { title: 'Concentration Flow', artist: 'Study Beats', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', genre: 'Ambient', duration: 255 },
    { title: 'Deep Work', artist: 'Productivity Sounds', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', genre: 'Ambient', duration: 242 },
  ],
  'Jazz Vibes': [
    { title: 'Smooth Jazz', artist: 'Jazz Ensemble', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', genre: 'Jazz', duration: 278 },
    { title: 'Blue Note', artist: 'Jazz Masters', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', genre: 'Jazz', duration: 265 },
    { title: 'Night Jazz', artist: 'Cool Jazz', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', genre: 'Jazz', duration: 248 },
  ],
  'Chill Hits': [
    { title: 'Chill Vibes', artist: 'Modern Pop', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=400', genre: 'Pop', duration: 195 },
    { title: 'Relaxing Pop', artist: 'Pop Artist', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=400', genre: 'Pop', duration: 208 },
    { title: 'Easy Listening', artist: 'Chill Band', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=400', genre: 'Pop', duration: 213 },
  ],
  'All Out 2010s': [
    { title: '2010s Hit 1', artist: 'Pop Star', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', genre: 'Pop', duration: 228 },
    { title: '2010s Hit 2', artist: 'Chart Topper', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', genre: 'Pop', duration: 215 },
    { title: '2010s Hit 3', artist: 'Popular Artist', image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', genre: 'Pop', duration: 205 },
  ],
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings();
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string>('LyfeStyle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dominantColor, setDominantColor] = useState('#000000');
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textShadow, setTextShadow] = useState('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 default
  const [volume, setVolume] = useState(60);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [libraryReturnCategory, setLibraryReturnCategory] = useState<'browse' | 'playlists' | 'albums' | null>(null);
  const [artistReturnTab, setArtistReturnTab] = useState<'tracks' | 'albums' | 'singles' | null>(null);
  const [apiTracks, setApiTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  
  const timeIntervalRef = useRef<number | null>(null);
  const lastVolumeToastRef = useRef<number>(60);

  // Загрузка треков из API
  const loadTracksFromAPI = useCallback(async () => {
    setIsLoadingTracks(true);
    try {
      const tracks = await apiClient.getTracks();
      if (tracks && tracks.length > 0) {
        const formattedTracks: Track[] = tracks.map((apiTrack: any) => ({
          title: apiTrack.title,
          artist: apiTrack.artistName || apiTrack.artist,
          image: apiTrack.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          genre: apiTrack.genre || 'Unknown',
          duration: apiTrack.duration,
          lyrics: apiTrack.lyrics || [],
          playlistTitle: 'API Tracks'
        }));
        setApiTracks(formattedTracks);
      }
    } catch (error) {
      console.error('Error loading tracks from API:', error);
      toast.error('Ошибка загрузки треков');
    } finally {
      setIsLoadingTracks(false);
    }
  }, []);

  const setCurrentTrack = (track: Track, playlistName?: string) => {
    const trackWithLyrics = {
      ...track,
      lyrics: mockLyrics[track.title] || track.lyrics || [],
      duration: track.duration || 225,
      playlistTitle: playlistName || track.playlistTitle,
    };
    setCurrentTrackState(trackWithLyrics);
    
    // Set playlist context if provided
    if (playlistName && playlistsData[playlistName]) {
      setCurrentPlaylistName(playlistName);
      const index = playlistsData[playlistName].findIndex(t => t.title === track.title);
      if (index !== -1) {
        setCurrentTrackIndex(index);
      }
    } else if (playlistName === 'API Tracks') {
      setCurrentPlaylistName('API Tracks');
      const index = apiTracks.findIndex(t => t.title === track.title);
      if (index !== -1) {
        setCurrentTrackIndex(index);
      }
    }
    
    setCurrentTime(0);
    setDuration(trackWithLyrics.duration || 225);
    setIsPlaying(true);
  };

  const extractColorFromImage = (_imageUrl: string) => {
    // Simplified - always use default Spotify colors
    setDominantColor('#121212');
    setColorPalette([]);
    setTextColor('#FFFFFF');
    setTextShadow('none');
  };

  const nextTrack = useCallback(() => {
    let currentPlaylistTracks: Track[] = [];
    
    if (currentPlaylistName === 'API Tracks') {
      currentPlaylistTracks = apiTracks;
    } else {
      currentPlaylistTracks = playlistsData[currentPlaylistName] || [];
    }
    
    if (currentPlaylistTracks.length === 0) return;
    
    let nextIndex: number;
    
    if (shuffle) {
      // Random track from current playlist
      nextIndex = Math.floor(Math.random() * currentPlaylistTracks.length);
    } else {
      // Next track in playlist order
      nextIndex = (currentTrackIndex + 1) % currentPlaylistTracks.length;
    }
    
    const nextTrack = currentPlaylistTracks[nextIndex];
    setCurrentTrack(nextTrack, currentPlaylistName);
  }, [currentTrackIndex, currentPlaylistName, shuffle, apiTracks]);

  const previousTrack = useCallback(() => {
    if (currentTime > 3) {
      // If track playing more than 3 seconds, restart current track
      setCurrentTime(0);
    } else {
      // Go to previous track in current playlist
      let currentPlaylistTracks: Track[] = [];
      
      if (currentPlaylistName === 'API Tracks') {
        currentPlaylistTracks = apiTracks;
      } else {
        currentPlaylistTracks = playlistsData[currentPlaylistName] || [];
      }
      
      if (currentPlaylistTracks.length === 0) return;
      
      const prevIndex = currentTrackIndex === 0 
        ? currentPlaylistTracks.length - 1 
        : currentTrackIndex - 1;
      const prevTrack = currentPlaylistTracks[prevIndex];
      setCurrentTrack(prevTrack, currentPlaylistName);
    }
  }, [currentTime, currentTrackIndex, currentPlaylistName, apiTracks]);

  useEffect(() => {
    // Always use default Spotify colors
    setDominantColor('#121212');
    setColorPalette([]);
    setTextColor('#FFFFFF');
    setTextShadow('none');
  }, [currentTrack]);

  // Auto-play next track when current ends
  useEffect(() => {
    if (currentTime >= duration && isPlaying && !repeat) {
      // Track ended, play next
      nextTrack();
    }
  }, [currentTime, duration, isPlaying, repeat]);

  // Simulate time progression
  useEffect(() => {
    if (isPlaying) {
      timeIntervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            // Track ended
            if (repeat) {
              return 0; // Restart current track
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    }
    
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [isPlaying, duration, repeat]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => !prev);
  }, []);

  const openPlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    // Store where to return to in library
    if (playlist.returnTo) {
      setLibraryReturnCategory(playlist.returnTo);
    }
    // Store which artist tab to return to
    if (playlist.returnToArtistTab) {
      setArtistReturnTab(playlist.returnToArtistTab);
    }
  }, []);

  const closePlaylist = useCallback(() => {
    setSelectedPlaylist(null);
    // Keep libraryReturnCategory and artistReturnTab so views can use them
  }, []);

  const toggleLike = useCallback((trackTitle: string) => {
    setLikedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackTitle)) {
        newSet.delete(trackTitle);
      } else {
        newSet.add(trackTitle);
      }
      return newSet;
    });
  }, []);

  const isLiked = useCallback((trackTitle: string) => {
    return likedTracks.has(trackTitle);
  }, [likedTracks]);

  const openArtistView = useCallback((artistName: string) => {
    setSelectedArtist(artistName);
  }, []);

  const closeArtistView = useCallback(() => {
    setSelectedArtist(null);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
        case 'л': // Russian layout: К -> Л
          // Space or K - Play/Pause
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
        case 'в': // Russian layout: Right arrow alternative (В)
          // Right arrow - Next track
          e.preventDefault();
          nextTrack();
          break;
        case 'arrowleft':
        case 'а': // Russian layout: Left arrow alternative (А)
          // Left arrow - Previous track
          e.preventDefault();
          previousTrack();
          break;
        case 'arrowup':
        case 'ц': // Russian layout: Up arrow alternative (Ц)
          // Up arrow - Volume up
          e.preventDefault();
          if (volume < 100) {
            const newVolumeUp = Math.min(100, volume + 5);
            setVolume(newVolumeUp);
            // Only show toast if volume changed significantly (every 10%)
            if (Math.abs(newVolumeUp - lastVolumeToastRef.current) >= 10 || newVolumeUp === 100) {
              toast.success(`Volume: ${newVolumeUp}%`, { duration: 800 });
              lastVolumeToastRef.current = newVolumeUp;
            }
          }
          break;
        case 'arrowdown':
        case 'н': // Russian layout: Down arrow alternative (Н)
          // Down arrow - Volume down
          e.preventDefault();
          if (volume > 0) {
            const newVolumeDown = Math.max(0, volume - 5);
            setVolume(newVolumeDown);
            // Only show toast if volume changed significantly (every 10%)
            if (Math.abs(newVolumeDown - lastVolumeToastRef.current) >= 10 || newVolumeDown === 0) {
              toast.success(`Volume: ${newVolumeDown}%`, { duration: 800 });
              lastVolumeToastRef.current = newVolumeDown;
            }
          }
          break;
        case 'f':
        case 'а': // Russian layout: F -> А
          // F - Toggle fullscreen
          if (currentTrack) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'ь': // Russian layout: M -> Ь
          // M - Mute/Unmute
          e.preventDefault();
          const isMuted = volume > 0;
          setVolume(isMuted ? 0 : 50);
          toast.success(isMuted ? 'Muted' : 'Unmuted', { duration: 1000 });
          break;
        case 'l':
        case 'д': // Russian layout: L -> Д
          // L - Like current track
          if (currentTrack) {
            e.preventDefault();
            const wasLiked = isLiked(currentTrack.title);
            toggleLike(currentTrack.title);
            toast.success(wasLiked ? t('trackRemoved') : t('trackAdded'), { duration: 1500 });
          }
          break;
        case 's':
        case 'ы': // Russian layout: S -> Ы
          // S - Toggle shuffle
          e.preventDefault();
          setShuffle((prev) => {
            const newShuffle = !prev;
            toast.success(newShuffle ? 'Shuffle on' : 'Shuffle off', { duration: 1000 });
            return newShuffle;
          });
          break;
        case 'r':
        case 'к': // Russian layout: R -> К
          // R - Toggle repeat
          e.preventDefault();
          setRepeat((prev) => {
            const newRepeat = !prev;
            toast.success(newRepeat ? 'Repeat on' : 'Repeat off', { duration: 1000 });
            return newRepeat;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTrack, volume, nextTrack, previousTrack, togglePlay, toggleFullscreen, toggleLike, isLiked]);

  // Меморизация контекста для оптимизации производительности
  const contextValue = {
    currentTrack,
    isPlaying,
    isFullscreen,
    dominantColor,
    colorPalette,
    textColor,
    textShadow,
    currentTime,
    duration,
    selectedPlaylist,
    likedTracks,
    selectedArtist,
    libraryReturnCategory,
    artistReturnTab,
    setCurrentTrack,
    togglePlay,
    toggleFullscreen,
    extractColorFromImage,
    seek,
    setVolume,
    volume,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    openPlaylist,
    closePlaylist,
    nextTrack,
    previousTrack,
    toggleLike,
    isLiked,
    openArtistView,
    closeArtistView,
    apiTracks,
    isLoadingTracks,
    loadTracksFromAPI,
  };

  // Загружаем треки из API при инициализации
  useEffect(() => {
    loadTracksFromAPI();
  }, [loadTracksFromAPI]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
