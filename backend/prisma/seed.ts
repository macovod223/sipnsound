import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создаем тестового пользователя
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@sipsound.com',
      passwordHash,
      displayName: 'Admin User',
    },
  });

  console.log('✅ Created user:', user.username);

  // Создаем тестовых артистов
  const artist1 = await prisma.artist.upsert({
    where: { name: 'Test Artist' },
    update: {},
    create: {
      name: 'Test Artist',
      bio: 'Тестовый артист для демонстрации функциональности Sip&Sound',
      verified: true,
      monthlyListeners: 1000000,
    },
  });
  console.log('✅ Created artist:', artist1.name);

  const artist2 = await prisma.artist.upsert({
    where: { name: 'SoundHelix' },
    update: {},
    create: {
      name: 'SoundHelix',
      bio: 'Музыкальный проект, создающий инструментальную музыку',
      verified: false,
      monthlyListeners: 500000,
    },
  });
  console.log('✅ Created artist:', artist2.name);

  // Создаем тестовый трек с локальными файлами
  const track1 = await prisma.track.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Test Song with Lyrics',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      genre: 'Electronic',
      duration: 180, // 3 минуты
      // Для начала используем внешний URL (потом замените на локальный)
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      audioPath: 'storage/tracks/test-song.mp3', // Путь к вашему MP3
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      coverPath: 'storage/covers/test-cover.jpg', // Путь к вашей обложке
      lyricsPath: 'storage/lyrics/test-song.lrc', // Путь к LRC файлу
      uploadedById: user.id,
      artistId: artist1.id,
    },
  });

  console.log('✅ Created track:', track1.title);

  // Создаем еще один трек только с внешним URL (без локальных файлов)
  const track2 = await prisma.track.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'SoundHelix Song 2',
      artistName: 'SoundHelix',
      albumName: 'Demo Collection',
      genre: 'Ambient',
      duration: 240,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      uploadedById: user.id,
      artistId: artist2.id,
    },
  });

  console.log('✅ Created track:', track2.title);

  // Создаем тестовые плейлисты из хардкода
  const playlists = [
    {
      title: 'This Is Yeat',
      description: 'Лучшие треки Yeat',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      isPublic: true,
    },
    {
      title: 'DJ',
      description: 'DJ миксы и ремиксы',
      coverUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
      isPublic: true,
    },
    {
      title: 'LyfeStyle',
      description: 'Музыка для образа жизни',
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      isPublic: true,
    },
    {
      title: 'Tea Lovers',
      description: 'Спокойная музыка для чаепития',
      coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      isPublic: true,
    },
    {
      title: 'From Sparta to Padre',
      description: 'Эпическая музыка',
      coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 1',
      description: 'Travis Scott, A$AP Rocky, Kendrick Lamar and more',
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 2',
      description: 'Metro Boomin, Future, 21 Savage and more',
      coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 3',
      description: 'Ken Carson, Yeat, Playboi Carti and more',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 4',
      description: 'Don Toliver, Lil Uzi Vert, Trippie Redd and more',
      coverUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 5',
      description: 'Toxis, Big Baby Tape, FRIENDLY THUG 52 NG and more',
      coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400',
      isPublic: true,
    },
    {
      title: 'Daily Mix 6',
      description: 'Skryptonite, MACAN, Basta and more',
      coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
      isPublic: true,
    },
    {
      title: 'Peaceful Piano',
      description: 'Расслабьтесь и насладитесь красивыми фортепианными композициями',
      coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      isPublic: true,
    },
    {
      title: 'Deep Focus',
      description: 'Сохраняйте спокойствие и сосредоточенность с эмбиентом и пост-роком',
      coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      isPublic: true,
    },
    {
      title: 'Jazz Vibes',
      description: 'Оригинальный плейлист с инструментальными чилл-битами',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      isPublic: true,
    },
    {
      title: 'Chill Hits',
      description: 'Расслабьтесь под лучшие новые и недавние чилл-хиты',
      coverUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
      isPublic: true,
    },
    {
      title: 'All Out 2010s',
      description: 'Самые популярные песни 2010-х',
      coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=400',
      isPublic: true,
    },
  ];

  for (const playlistData of playlists) {
    const playlist = await prisma.playlist.create({
      data: {
        ...playlistData,
        userId: user.id,
      },
    });
    console.log('✅ Created playlist:', playlist.title);
  }

  // Создаем основной плейлист с треками
  const mainPlaylist = await prisma.playlist.create({
    data: {
      title: 'My Test Playlist',
      description: 'Playlist with test tracks',
      userId: user.id,
      isPublic: true,
      tracks: {
        create: [
          {
            trackId: track1.id,
            position: 0,
          },
          {
            trackId: track2.id,
            position: 1,
          },
        ],
      },
    },
  });

  console.log('✅ Created main playlist:', mainPlaylist.title);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

