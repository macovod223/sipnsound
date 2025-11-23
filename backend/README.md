# 🎵 Sip&Sound Backend API

Backend сервер для музыкального стриминг-сервиса Sip&Sound.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
npm install
```

### 2. Настройка окружения

Создайте `.env` файл на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - секретный ключ для JWT (сгенерируйте случайную строку)
- Другие параметры по необходимости

### 3. Настройка PostgreSQL

Убедитесь что PostgreSQL установлен и запущен:

```bash
# macOS (через Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Или через Docker
docker run --name sipsound-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sipsound \
  -p 5432:5432 \
  -d postgres:15
```

### 4. Prisma миграции

Примените миграции БД:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Откройте Prisma Studio для просмотра данных:

```bash
npm run prisma:studio
```

### 5. Запуск сервера

Development режим (hot reload):

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Сервер запустится на `http://localhost:3001`

---

## 📚 API Endpoints

### Authentication

#### POST /api/auth/register
Регистрация нового пользователя

**Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "john_doe",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

#### POST /api/auth/login
Вход в систему

**Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "jwt-token-here"
}
```

#### GET /api/auth/me
Получить текущего пользователя (требуется токен)

**Headers:**
```
Authorization: Bearer jwt-token-here
```

---

### Tracks

#### GET /api/tracks
Список треков

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)
- `genre` - фильтр по жанру
- `artist` - поиск по исполнителю
- `search` - поиск по названию/исполнителю/альбому
- `sortBy` (default: createdAt)
- `order` (default: desc)

**Response:**
```json
{
  "tracks": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET /api/tracks/:id
Детали трека

#### GET /api/tracks/:id/stream
Получить URL для стриминга аудио

**Response:**
```json
{
  "url": "https://cdn.example.com/track.mp3",
  "title": "Track Title",
  "artist": "Artist Name"
}
```

---

### Playlists

#### GET /api/playlists
Список плейлистов пользователя (требуется токен)

#### GET /api/playlists/:id
Детали плейлиста с треками

#### POST /api/playlists
Создать плейлист (требуется токен)

**Body:**
```json
{
  "title": "My Playlist",
  "description": "Description",
  "coverUrl": "https://...",
  "isPublic": true
}
```

#### PUT /api/playlists/:id
Обновить плейлист (требуется токен)

#### DELETE /api/playlists/:id
Удалить плейлист (требуется токен)

---

### Users

#### GET /api/users/:id
Профиль пользователя

---

## 🗄️ База данных

Схема БД находится в `prisma/schema.prisma`

### Основные таблицы:
- `users` - Пользователи
- `tracks` - Треки
- `playlists` - Плейлисты
- `playlist_tracks` - Связь плейлистов и треков
- `liked_tracks` - Лайкнутые треки
- `play_history` - История прослушивания

### Миграции:

Создать новую миграцию:
```bash
npx prisma migrate dev --name migration_name
```

Применить миграции в продакшне:
```bash
npm run prisma:migrate:deploy
```

---

## 🧪 Тестирование

Запуск тестов:
```bash
npm test
```

---

## 📦 Деплой

### Railway / Render

1. Подключите репозиторий
2. Добавьте PostgreSQL addon
3. Установите environment variables из `.env.example`
4. Deploy!

### Docker

```bash
# Build
docker build -t sipsound-backend .

# Run
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  sipsound-backend
```

---

## 📝 TODO

- [ ] Загрузка и стриминг аудиофайлов
- [ ] Парсинг метаданных (FFmpeg)
- [ ] Интеграция с S3/MinIO
- [ ] Обработка обложек (Sharp)
- [ ] Добавление треков в плейлисты
- [ ] Лайки треков
- [ ] История прослушивания
- [ ] Поиск с автодополнением
- [ ] Rate limiting
- [ ] Unit и integration тесты
- [ ] Swagger документация

---

## 🛠️ Технологии

- **Node.js** + **TypeScript**
- **Express.js** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Winston** - Logging

---

## 📄 Лицензия

MIT

