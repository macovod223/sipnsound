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
- **Morgan** – логирование HTTP запросов

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite 6** - сборщик
- **Motion (Framer Motion)** - анимации
- **Tailwind CSS** - стилизация
- **Sonner** - уведомления
- **Lucide React** - иконки
- **Radix UI** - UI компоненты

### ML Service (AI DJ)
- **Python 3.12+** - язык программирования
- **Flask** - веб-фреймворк для API
- **scikit-learn** - машинное обучение (TF-IDF, PCA, cosine similarity)
- **numpy** - численные вычисления
- **pandas** - работа с данными
- **psycopg2** - подключение к PostgreSQL

---

## Быстрый запуск

### Требования
- Node.js 18+
- PostgreSQL 12+
- Python 3.12+ (для ML сервиса)
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

# ML Service (AI DJ)
pip3 install -r ml/requirements.txt
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

### 2. Настройка ML сервиса (AI DJ):

ML сервис использует ту же `DATABASE_URL` из `backend/.env`. Убедитесь, что переменная окружения установлена:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

Или передайте URL напрямую при обучении модели (см. раздел "Обучение AI DJ модели").

---

## Запуск проекта

### ВАЖНО: Нужно запустить ВСЕ ТРИ сервиса одновременно!

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

### Терминал 3 - ML Service (AI DJ):
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
python3 ml/ai_dj/service.py
```

Должно быть: `Running on http://127.0.0.1:5001`

**Примечание:** ML сервис можно запустить в фоне:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
python3 ml/ai_dj/service.py > /tmp/ml_service.log 2>&1 &
```

---

## Проверка работы

- **Backend:** `http://localhost:3001/health` → должен вернуть `{"status":"ok"}`
- **Frontend:** `http://localhost:3000` → должен открыться интерфейс
- **ML Service:** `http://localhost:5001/health` → должен вернуть `{"status":"ok","model_loaded":true}`

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

### ML Service (AI DJ):
```bash
# Обучение модели (выполняется один раз или при добавлении новых треков)
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
python3 ml/ai_dj/train_model.py "$DATABASE_URL" ml/ai_dj/data

# Запуск ML сервиса
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
python3 ml/ai_dj/service.py

# Запуск в фоне с логами
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
python3 ml/ai_dj/service.py > /tmp/ml_service.log 2>&1 &

# Просмотр логов ML сервиса
tail -f /tmp/ml_service.log
```

---

## Решение проблем

### Порт 3000 занят:

**macOS/Linux - Освободить порт:**
```bash
# Способ 1: Найти и убить процесс одной командой
lsof -ti:3000 | xargs kill -9

# Способ 2: Если первый не работает
kill -9 $(lsof -ti:3000)

# Способ 3: Найти PID вручную и убить
lsof -i :3000  # Показать процесс
kill -9 <PID>  # Заменить <PID> на номер процесса из первого столбца

# Способ 4: Убить все процессы Node.js (если порт использует Node)
pkill -9 node
```

**Windows:**
```bash
# Найти PID процесса
netstat -ano | findstr :3000
# Убить процесс (заменить <PID> на номер)
taskkill /PID <PID> /F
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
├── ml/               # ML Service (AI DJ)
│   └── ai_dj/
│       ├── service.py        # Flask API сервис
│       ├── train_model.py    # Скрипт обучения модели
│       ├── data/             # Обученные данные модели
│       │   ├── db_embeddings.npy      # Векторные представления треков (512 dim)
│       │   ├── db_tracks.pkl          # Метаданные треков
│       │   ├── db_track_mapping.pkl   # Маппинг UUID → индекс
│       │   └── db_vectorizer.pkl     # TF-IDF векторizer (не используется в runtime)
│       └── requirements.txt  # Python зависимости
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
- **AI DJ** - персонализированные рекомендации на основе ML модели
- Полноэкранный плеер с анимацией текстов
- Кроссфейд между треками (в текущий момент на доработке)
- Управление с клавиатуры и аппаратных кнопок

---

## AI DJ - Машинное обучение для рекомендаций

### Что хранится в `ml/ai_dj/data/`:

- **db_embeddings.npy** - векторные представления всех треков (размерность 512)
- **db_tracks.pkl** - метаданные треков (название, артист, жанр, популярность, длительность, год альбома, лайки)
- **db_track_mapping.pkl** - маппинг UUID треков на индексы в матрице embeddings
- **db_vectorizer.pkl** - TF-IDF векторizer (не используется в runtime, сохранен для справки)

Эти файлы содержат только публичные метаданные треков и обученные векторы. Личные данные пользователей (пароли, токены) НЕ хранятся в этих файлах.

### Обучение модели

Модель нужно обучить перед первым запуском или после добавления новых треков в БД:

```bash
# Установите DATABASE_URL
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Обучите модель
python3 ml/ai_dj/train_model.py "$DATABASE_URL" ml/ai_dj/data
```

После обучения модель будет сохранена в `ml/ai_dj/data/` и автоматически загрузится при запуске ML сервиса.

### Как работает AI DJ

1. **Обучение модели:**
   - Извлекает все опубликованные треки из БД
   - Создает текстовые признаки (название + артист + жанр + год альбома)
   - Применяет TF-IDF векторизацию (2000 признаков, n-grams 1-4)
   - Добавляет числовые признаки (популярность, длительность, лайки)
   - Создает embeddings размерностью 512 с L2 нормализацией

2. **Рекомендации:**
   - Вычисляет профиль пользователя на основе истории прослушиваний
   - Взвешивает треки по датам (свежие важнее) и частоте прослушивания
   - Находит похожие треки через cosine similarity
   - Применяет динамические бонусы за предпочитаемые жанры/артистов
   - Добавляет разнообразие через MMR (Maximal Marginal Relevance)
   - Перемешивает рекомендации (топ-3 сохраняются, остальные перемешиваются)

3. **Когда переобучать:**
   - При добавлении новых треков в БД
   - При изменении метаданных треков (название, артист, жанр)
   - После улучшения параметров модели
   - **НЕ нужно** переобучать при добавлении новой истории прослушиваний (используется динамически)

### Логи ML сервиса

Логи ML сервиса сохраняются в `/tmp/ml_service.log` (при запуске в фоне) или выводятся в консоль.

Для просмотра логов:
```bash
tail -f /tmp/ml_service.log
```

Логи содержат информацию о:
- Загрузке модели
- Входящих запросах
- Вычислении профиля пользователя
- Результатах cosine similarity
- Применении бонусов и разнообразия
- Финальных рекомендациях