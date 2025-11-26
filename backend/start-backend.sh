#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск Sip&Sound Backend...${NC}"

# Экспорт переменных окружения
export DATABASE_URL="postgresql://postgres:22893@localhost:5432/sipandsound_db?schema=public"
export PORT=3001
export NODE_ENV=development
export FRONTEND_URL=http://localhost:3000
export JWT_SECRET=your-secret-key-change-this-in-production-12345
export JWT_EXPIRES_IN=7d
export MAX_FILE_SIZE=100000000
export UPLOAD_DIR=./storage

echo -e "${GREEN}✅ Переменные окружения установлены${NC}"

# Проверяем, не занят ли порт 3001
EXISTING_PIDS=$(lsof -ti tcp:${PORT})
if [ -n "$EXISTING_PIDS" ]; then
  echo -e "${BLUE}⚠️ Порт ${PORT} уже используется (PID: ${EXISTING_PIDS}). Завершаю процесс(ы) перед перезапуском...${NC}"
  kill -9 $EXISTING_PIDS
  sleep 1
fi

echo -e "${BLUE}📡 Запуск сервера на http://localhost:${PORT}${NC}"

# Запуск сервера
npm run dev

