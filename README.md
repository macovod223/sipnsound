# 🎵☕ Sip&Sound

Современный music streaming сервис с элегантным Spotify-подобным дизайном.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%3E%3D14.0-blue)

## ✨ Особенности

- 🎵 **Полноценный музыкальный плеер** с поддержкой очереди воспроизведения
- 📝 **Синхронизированные тексты песен** (LRC формат)
- 🎨 **Современный UI** в стиле Spotify с glassmorphism эффектами
- 🌓 **Темная тема** оптимизированная для 120Hz дисплеев
- ⚡ **Высокая производительность** с GPU ускорением анимаций
- 🔐 **Безопасная аутентификация** с JWT токенами
- 🎹 **Горячие клавиши** для управления плеером
- 📱 **Адаптивный дизайн** для всех устройств
- 🌐 **Мультиязычность** (RU/EN)

## 🛠️ Технологии

### Frontend
- **React 18** + **TypeScript**
- **Vite** для быстрой сборки
- **Tailwind CSS v4** для стилизации
- **Motion** для плавных анимаций
- **Radix UI** компоненты

### Backend
- **Node.js** + **Express**
- **TypeScript** для типобезопасности
- **Prisma ORM** для работы с БД
- **PostgreSQL** база данных
- **JWT** аутентификация
- **bcrypt** для хеширования паролей

## 🚀 Быстрый старт

### Требования
- Node.js 20+
- PostgreSQL 14+
- npm или yarn

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/macovod223/sipnsound.git
cd sipnsound
```

2. **Настройте Backend**
```bash
cd backend

# Создайте .env файл
cp .env.example .env
# Отредактируйте DATABASE_URL в .env

# Установите зависимости
npm install

# Настройте базу данных
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

3. **Настройте Frontend**
```bash
cd ..

# Создайте .env файл
cp .env.example .env

# Установите зависимости
npm install
```

4. **Запустите проект**

Терминал 1 - Backend:
```bash
cd backend
npm run dev
```

Терминал 2 - Frontend:
```bash
npm run dev
```

5. **Откройте браузер**
```
http://localhost:5173
```

### 🔐 Тестовые данные

После выполнения `npm run prisma:seed`:

- **Username:** `admin`
- **Password:** `admin123`

## 📁 Структура проекта

```
sipnsound/
├── backend/                  # Node.js + Express API
│   ├── prisma/              # Prisma схема и миграции
│   ├── src/
│   │   ├── controllers/     # Контроллеры API
│   │   ├── middlewares/     # Middleware (auth, error)
│   │   ├── routes/          # API роуты
│   │   ├── utils/           # Утилиты
│   │   └── index.ts         # Точка входа
│   └── storage/             # Локальное хранилище файлов
├── src/                      # React Frontend
│   ├── api/                 # API клиент
│   ├── components/          # React компоненты
│   ├── config/              # Конфигурация
│   └── main.tsx             # Точка входа
└── README.md
```

## 🎨 Скриншоты

<details>
<summary>Посмотреть скриншоты</summary>

*Скриншоты будут добавлены позже*

</details>

## 📝 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Треки
- `GET /api/tracks` - Список треков
- `GET /api/tracks/:id` - Детали трека
- `GET /api/tracks/:id/stream` - Стриминг аудио
- `GET /api/tracks/:id/lyrics` - Текст песни

### Плейлисты
- `GET /api/playlists` - Список плейлистов
- `POST /api/playlists` - Создать плейлист
- `GET /api/playlists/:id` - Детали плейлиста
- `PUT /api/playlists/:id` - Обновить плейлист
- `DELETE /api/playlists/:id` - Удалить плейлист

## 🛠️ Разработка

### Backend
```bash
npm run dev              # Запуск dev сервера
npm run build            # Production сборка
npm run prisma:studio    # GUI для базы данных
npm run prisma:seed      # Заполнить тестовыми данными
```

### Frontend
```bash
npm run dev              # Запуск dev сервера
npm run build            # Production сборка
npm run preview          # Предпросмотр production
```

## 🔒 Переменные окружения

### Backend `.env`
```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3001
```

## 🤝 Вклад в проект

Contributions are welcome! Feel free to open issues and pull requests.

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 👨‍💻 Автор

**Timur Macovod**

- GitHub: [@macovod223](https://github.com/macovod223)

## 🙏 Благодарности

- Дизайн вдохновлен [Figma Sip&Sound Concept](https://www.figma.com/design/uFQRflcZc1fq2p3Lkb43II/Sip-Sound-Concept)
- Используемые библиотеки и их авторы

---

⭐ Если проект понравился, поставьте звезду!
