/**
 * Утилиты для форматирования времени
 */

/**
 * Форматирует секунды в формат MM:SS
 * @param seconds - время в секундах
 * @returns строка в формате "M:SS" или "MM:SS"
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Форматирует длительность трека (поддерживает string и number)
 * @param duration - длительность в секундах (string или number)
 * @returns строка в формате "M:SS" или "MM:SS"
 */
export const formatDuration = (duration: number | string | undefined): string => {
  if (!duration) return '0:00';
  
  const secs = typeof duration === 'string' ? parseInt(duration, 10) : duration;
  if (isNaN(secs) || secs <= 0) return '0:00';
  
  return formatTime(secs);
};

