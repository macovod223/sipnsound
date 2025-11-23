import fs from 'fs';
import path from 'path';

// Интерфейс для строки лирики
export interface LyricLine {
  time: number;      // Время в секундах
  text: string;      // Текст строки
  original?: string; // Оригинальная строка из LRC
}

// Метаданные LRC файла
export interface LrcMetadata {
  title?: string;
  artist?: string;
  album?: string;
  by?: string;      // Автор LRC файла
  offset?: number;  // Смещение времени в мс
}

// Полный результат парсинга
export interface ParsedLrc {
  metadata: LrcMetadata;
  lyrics: LyricLine[];
}

/**
 * Парсит время из строки LRC формата [mm:ss.xx]
 * @param timeStr - строка времени, например "01:23.45"
 * @returns время в секундах
 */
function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  const minutes = parseInt(parts[0], 10);
  const seconds = parseFloat(parts[1]);
  return minutes * 60 + seconds;
}

/**
 * Парсит LRC файл
 * @param lrcPath - путь к LRC файлу
 * @returns объект с метаданными и строками лирики
 */
export function parseLrcFile(lrcPath: string): ParsedLrc | null {
  try {
    // Проверка существования файла
    if (!fs.existsSync(lrcPath)) {
      console.error(`LRC file not found: ${lrcPath}`);
      return null;
    }

    const content = fs.readFileSync(lrcPath, 'utf-8');
    return parseLrcContent(content);
  } catch (error) {
    console.error(`Error parsing LRC file: ${error}`);
    return null;
  }
}

/**
 * Парсит содержимое LRC строки
 * @param content - содержимое LRC файла
 * @returns объект с метаданными и строками лирики
 */
export function parseLrcContent(content: string): ParsedLrc {
  const lines = content.split('\n');
  const metadata: LrcMetadata = {};
  const lyrics: LyricLine[] = [];

  // Регулярные выражения
  const tagRegex = /\[([a-z]+):([^\]]+)\]/i;
  const timeRegex = /\[(\d{2}:\d{2}(?:\.\d{2,3})?)\]/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Парсинг метаданных (теги)
    const tagMatch = trimmedLine.match(tagRegex);
    if (tagMatch && !trimmedLine.match(/\d{2}:\d{2}/)) {
      const [, key, value] = tagMatch;
      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'ti') metadata.title = value;
      else if (lowerKey === 'ar') metadata.artist = value;
      else if (lowerKey === 'al') metadata.album = value;
      else if (lowerKey === 'by') metadata.by = value;
      else if (lowerKey === 'offset') metadata.offset = parseInt(value, 10);
      
      continue;
    }

    // Парсинг строк с временными метками
    const times: string[] = [];
    let match;
    while ((match = timeRegex.exec(trimmedLine)) !== null) {
      times.push(match[1]);
    }

    if (times.length > 0) {
      // Получаем текст после всех временных меток
      const text = trimmedLine.replace(timeRegex, '').trim();
      
      // Одна строка может иметь несколько временных меток
      for (const timeStr of times) {
        lyrics.push({
          time: parseTime(timeStr),
          text,
          original: trimmedLine,
        });
      }
    }
  }

  // Сортировка по времени
  lyrics.sort((a, b) => a.time - b.time);

  // Применение смещения если есть
  if (metadata.offset) {
    const offsetSeconds = metadata.offset / 1000;
    lyrics.forEach(line => {
      line.time += offsetSeconds;
    });
  }

  return { metadata, lyrics };
}

/**
 * Получает текущую строку лирики по времени
 * @param lyrics - массив строк лирики
 * @param currentTime - текущее время в секундах
 * @returns текущая строка или null
 */
export function getCurrentLyric(lyrics: LyricLine[], currentTime: number): LyricLine | null {
  if (!lyrics || lyrics.length === 0) return null;

  // Находим последнюю строку, время которой <= currentTime
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (lyrics[i].time <= currentTime) {
      return lyrics[i];
    }
  }

  return null;
}

/**
 * Получает следующую строку лирики
 * @param lyrics - массив строк лирики
 * @param currentTime - текущее время в секундах
 * @returns следующая строка или null
 */
export function getNextLyric(lyrics: LyricLine[], currentTime: number): LyricLine | null {
  if (!lyrics || lyrics.length === 0) return null;

  for (const line of lyrics) {
    if (line.time > currentTime) {
      return line;
    }
  }

  return null;
}

/**
 * Конвертирует parsed lyrics в JSON формат для хранения в БД
 * @param parsed - распарсенный LRC
 * @returns JSON объект
 */
export function lrcToJson(parsed: ParsedLrc): object {
  return {
    metadata: parsed.metadata,
    lines: parsed.lyrics.map(line => ({
      time: line.time,
      text: line.text,
    })),
  };
}

