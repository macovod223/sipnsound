# Sip&Sound - Музыкальный стриминг сервис

Современный стриминг-сервис музыки в стиле Spotify с темным дизайном и адаптивным интерфейсом.

## Технологический стек

### Backend
- **Node.js** + **Express 5** - серверная платформа
- **TypeScript** - типизация
- **Prisma ORM** - работа с базой данных
- **PostgreSQL** - база данных
- **JWT** - аутентификация (jsonwebtoken)
- **Multer** - загрузка файлов
- **Winston** - логирование
- **Helmet** - безопасность
- **Morgan** - логирование HTTP запросов

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик
- **Motion (Framer Motion)** - анимации
- **Tailwind CSS** - стилизация
- **Sonner** - уведомления
- **Lucide React** - иконки

---

## Быстрый запуск

### Требования
- Node.js 18+
- PostgreSQL
- npm или yarn

---

## Установка зависимостей

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ..
npm install
```

---

## Настройка

### 1. Создайте файл `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
PORT=3001
FRONTEND_URL="http://localhost:3000"
NODE_ENV=development
```

**Замените данные подключения к БД на свои!**

---

## Запуск проекта

### ВАЖНО: Нужно запустить ОБА сервера одновременно!

### Терминал 1 - Backend:
```bash
cd backend
npm run dev
```

Дождитесь: `Server is running on http://localhost:3001`

### Терминал 2 - Frontend:
```bash
npm run dev
```

Должно быть: `Local:   http://localhost:3000/`

---

## Проверка работы

- **Backend:** `http://localhost:3001/health` → должен вернуть `{"status":"ok"}`
- **Frontend:** `http://localhost:3000` → должен открыться интерфейс

---

## Полезные команды

### Backend:
```bash
cd backend
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка проекта
npm start            # Запуск собранного проекта
npx prisma studio    # Открыть Prisma Studio (просмотр БД)
npx prisma generate  # Генерация Prisma Client
npx prisma migrate dev  # Создание миграций
```

### Frontend:
```bash
npm run dev      # Запуск в режиме разработки
npm run build    # Сборка проекта
npm start        # Просмотр собранного проекта
```

---

## Решение проблем

### Порт 3000 занят:
```bash
lsof -i :3000
kill -9 <PID>
```

### "Network error" при авторизации:
- Убедитесь, что Backend запущен на порту 3001
- Проверьте: `http://localhost:3001/health`

### Оба сервера должны работать одновременно!

---

## Структура проекта

```
Sip&Sound Concept/
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── controllers/  # Контроллеры API
│   │   ├── routes/       # Маршруты
│   │   ├── middlewares/  # Промежуточное ПО
│   │   └── utils/        # Утилиты
│   ├── prisma/       # Схема БД и миграции
│   ├── storage/      # Файлы (треки, обложки, плейлисты)
│   └── logs/         # Логи приложения
└── src/              # React фронтенд
    ├── components/   # React компоненты
    ├── api/          # API клиент
    └── utils/        # Утилиты
```

---

## Основные возможности

- Воспроизведение музыки с синхронизированными текстами
- Создание и управление плейлистами
- Профили артистов с популярными треками
- Поиск по трекам, артистам, альбомам
- Избранные треки

---

**Готово!**
