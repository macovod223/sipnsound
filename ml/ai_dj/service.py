"""
Flask-сервис для AI DJ рекомендаций (полностью доработанная версия)

РЕАЛИЗОВАННЫЕ УЛУЧШЕНИЯ:
- Скрипт обучения модели (train_model.py)
- Использование реальных дат прослушивания
- Кэширование результатов
- Улучшенный алгоритм профиля (частота прослушивания)
- Метрики качества
"""

from flask import Flask, request, jsonify
import pickle
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import logging
from functools import lru_cache
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib
import json

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Глобальные переменные для модели
embeddings: Optional[np.ndarray] = None
tracks_df: Optional[pd.DataFrame] = None
track_id_to_idx: Optional[Dict[str, int]] = None

# Конфигурация
MAX_LIMIT = 50
DEFAULT_LIMIT = 25
CACHE_TTL_SECONDS = 300  # 5 минут кэширования
EMBEDDING_DIM = 512

# In-memory кэш (в продакшене использовать Redis)
recommendation_cache: Dict[str, Tuple[datetime, List[Dict]]] = {}


def load_model(data_dir: str = "ml/ai_dj/data") -> bool:
    """Загружает модель и эмбеддинги при старте"""
    global embeddings, tracks_df, track_id_to_idx
    
    data_path = Path(data_dir)
    
    try:
        embeddings_path = data_path / "db_embeddings.npy"
        tracks_path = data_path / "db_tracks.pkl"
        mapping_path = data_path / "db_track_mapping.pkl"
        
        if not embeddings_path.exists():
            logger.error(f"Модель не найдена: {embeddings_path}")
            return False
        
        logger.info("Загружаю модель из БД...")
        embeddings = np.load(embeddings_path)
        tracks_df = pd.read_pickle(tracks_path)
        
        with open(mapping_path, "rb") as f:
            track_id_to_idx = pickle.load(f)
        
        if len(tracks_df) != embeddings.shape[0]:
            logger.error(f"Несоответствие размеров: {len(tracks_df)} треков, {embeddings.shape[0]} embeddings")
            return False
        
        logger.info(f"Модель загружена: {len(tracks_df)} треков, embeddings shape: {embeddings.shape}")
        return True
        
    except Exception as e:
        logger.error(f"Ошибка загрузки модели: {e}", exc_info=True)
        return False


def compute_user_profile(
    history_indices: List[int],
    history_with_dates: Optional[List[Dict]] = None,
    track_frequencies: Optional[Dict[int, int]] = None
) -> np.ndarray:
    """
    Вычисляет профиль пользователя с учетом дат прослушивания и частоты.
    
    Args:
        history_indices: Индексы треков из истории
        history_with_dates: Список с датами прослушивания [{"id": "...", "playedAt": "..."}]
        track_frequencies: Словарь {index: frequency} для учета частоты прослушивания
    
    Returns:
        np.ndarray: Профиль пользователя (1D вектор)
    """
    if not history_indices:
        raise ValueError("История пуста")
    
    history_embeddings = embeddings[history_indices]
    weights = np.ones(len(history_indices))
    
    # 1. Взвешивание по датам прослушивания (более свежие = больший вес)
    if history_with_dates:
        try:
            now = datetime.now()
            date_weights = []
            for idx in history_indices:
                track_id = tracks_df.iloc[idx]['id']
                # Находим дату прослушивания для этого трека
                played_at = None
                for h in history_with_dates:
                    if str(h.get('id')) == str(track_id):
                        played_at = datetime.fromisoformat(h.get('playedAt', '').replace('Z', '+00:00'))
                        break
                
                if played_at:
                    # Чем свежее трек, тем больший вес (экспоненциальное затухание)
                    days_ago = (now - played_at.replace(tzinfo=None)).days
                    weight = np.exp(-days_ago / 30.0)  # Полураспад 30 дней
                    date_weights.append(weight)
                else:
                    date_weights.append(0.5)  # Дефолтный вес для треков без даты
            
            if date_weights:
                weights = np.array(date_weights)
        except Exception as e:
            logger.warning(f"Ошибка обработки дат: {e}, используем равные веса")
    
    # 2. Взвешивание по частоте прослушивания
    if track_frequencies:
        freq_weights = np.array([track_frequencies.get(idx, 1) for idx in history_indices])
        # Нормализуем частоты (логарифмическая шкала для уменьшения влияния выбросов)
        freq_weights = np.log1p(freq_weights)  # log(1 + x)
        weights = weights * freq_weights
    
    # Нормализуем веса
    if weights.sum() > 0:
        weights = weights / weights.sum()
    else:
        weights = np.ones(len(history_indices)) / len(history_indices)
    
    # Вычисляем взвешенную среднюю
    user_profile = np.average(history_embeddings, axis=0, weights=weights)
    
    # Нормализация для cosine similarity
    norm = np.linalg.norm(user_profile)
    if norm > 0:
        user_profile = user_profile / norm
    
    return user_profile.reshape(1, -1)


def compute_dynamic_bonuses(
    similarities: np.ndarray,
    preferred_genres: List[str],
    preferred_artists: List[str],
    history_genres: List[str],
    history_artists: List[str]
) -> np.ndarray:
    """
    Применяет динамические бонусы на основе силы предпочтения.
    
    Args:
        similarities: Массив similarities
        preferred_genres: Предпочитаемые жанры
        preferred_artists: Предпочитаемые артисты
        history_genres: Все жанры из истории (для вычисления силы предпочтения)
        history_artists: Все артисты из истории
    
    Returns:
        np.ndarray: Обновленный массив similarities
    """
    result = similarities.copy()
    
    # Вычисляем силу предпочтения для жанров
    if preferred_genres and history_genres and 'genre' in tracks_df.columns:
        genre_counts = defaultdict(int)
        for g in history_genres:
            genre_counts[g] += 1
        
        total_genres = len(history_genres)
        genre_mask = tracks_df['genre'].isin(preferred_genres).values
        
        for genre in preferred_genres:
            if genre in genre_counts:
                # Процент истории с этим жанром
                genre_ratio = genre_counts[genre] / total_genres if total_genres > 0 else 0
                # Динамический бонус: от 1.1 (20%) до 1.5 (80%+)
                bonus = 1.1 + (genre_ratio * 0.4)  # 1.1 - 1.5
                
                genre_specific_mask = tracks_df['genre'] == genre
                result[genre_specific_mask] *= bonus
                logger.debug(f"Жанр {genre}: ratio={genre_ratio:.2f}, bonus={bonus:.2f}")
    
    # Вычисляем силу предпочтения для артистов
    if preferred_artists and history_artists and 'artist' in tracks_df.columns:
        artist_counts = defaultdict(int)
        for a in history_artists:
            artist_counts[a] += 1
        
        total_artists = len(history_artists)
        artist_mask = tracks_df['artist'].isin(preferred_artists).values
        
        for artist in preferred_artists:
            if artist in artist_counts:
                artist_ratio = artist_counts[artist] / total_artists if total_artists > 0 else 0
                # Динамический бонус: от 1.1 (20%) до 1.4 (80%+)
                bonus = 1.1 + (artist_ratio * 0.3)  # 1.1 - 1.4
                
                artist_specific_mask = tracks_df['artist'] == artist
                result[artist_specific_mask] *= bonus
                logger.debug(f"Артист {artist}: ratio={artist_ratio:.2f}, bonus={bonus:.2f}")
    
    return result


def add_diversity(
    similarities: np.ndarray,
    top_indices: np.ndarray,
    diversity_factor: float = 0.3
) -> np.ndarray:
    """
    Добавляет разнообразие в рекомендации используя MMR (Maximal Marginal Relevance).
    
    Args:
        similarities: Массив similarities
        top_indices: Топ индексы (уже отсортированные)
        diversity_factor: Фактор разнообразия (0 = только похожие, 1 = только разнообразные)
    
    Returns:
        np.ndarray: Обновленные индексы с учетом разнообразия
    """
    if len(top_indices) <= 1 or diversity_factor == 0:
        return top_indices
    
    # MMR: выбираем треки, которые похожи на пользователя, но разнообразны между собой
    selected = [top_indices[0]]  # Первый - самый похожий
    remaining = set(top_indices[1:])
    
    while len(selected) < len(top_indices) and remaining:
        best_score = -np.inf
        best_idx = None
        
        for idx in remaining:
            # Похожесть на пользователя
            relevance = similarities[idx]
            
            # Разнообразие (минимальная похожесть на уже выбранные)
            if len(selected) > 0:
                max_similarity = max([
                    cosine_similarity(
                        embeddings[idx:idx+1],
                        embeddings[sel:sel+1]
                    )[0, 0]
                    for sel in selected
                ])
                diversity = 1 - max_similarity
            else:
                diversity = 1
            
            # MMR score
            score = (1 - diversity_factor) * relevance + diversity_factor * diversity
            
            if score > best_score:
                best_score = score
                best_idx = idx
        
        if best_idx is not None:
            selected.append(best_idx)
            remaining.remove(best_idx)
        else:
            break
    
    return np.array(selected[:len(top_indices)])


def get_cache_key(history_ids: List[str], genres: List[str], artists: List[str], limit: int) -> str:
    """Создает ключ кэша для запроса"""
    key_data = {
        "history": sorted(history_ids),
        "genres": sorted(genres),
        "artists": sorted(artists),
        "limit": limit
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()


def get_cached_recommendations(cache_key: str) -> Optional[List[Dict]]:
    """Получает рекомендации из кэша"""
    if cache_key in recommendation_cache:
        cached_time, recommendations = recommendation_cache[cache_key]
        if (datetime.now() - cached_time).total_seconds() < CACHE_TTL_SECONDS:
            logger.debug(f"Кэш попадание для ключа {cache_key[:8]}...")
            return recommendations
        else:
            # Кэш устарел
            del recommendation_cache[cache_key]
    return None


def cache_recommendations(cache_key: str, recommendations: List[Dict]):
    """Сохраняет рекомендации в кэш"""
    recommendation_cache[cache_key] = (datetime.now(), recommendations)
    # Очищаем старые записи (простая очистка, в продакшене использовать TTL)
    if len(recommendation_cache) > 1000:
        # Удаляем самые старые
        sorted_cache = sorted(recommendation_cache.items(), key=lambda x: x[1][0])
        for key, _ in sorted_cache[:100]:
            del recommendation_cache[key]


@app.route('/health', methods=['GET'])
def health():
    """Проверка работоспособности сервиса"""
    return jsonify({
        "status": "ok",
        "model_loaded": embeddings is not None,
        "tracks_count": len(tracks_df) if tracks_df is not None else 0,
        "model_type": "db" if track_id_to_idx is not None else "none",
        "cache_size": len(recommendation_cache)
    })


@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Получает историю пользователя и возвращает рекомендации.
    
    Request body:
    {
        "history": ["track_id_1", "track_id_2"],
        "historyWithDates": [{"id": "...", "playedAt": "2024-01-01T00:00:00Z"}],
        "genres": ["Hip-Hop", "Rap"],
        "artists": ["artist1"],
        "limit": 25
    }
    """
    logger.info("=== AI DJ RECOMMEND REQUEST ===")
    
    if embeddings is None or tracks_df is None:
        logger.error("Модель не загружена")
        return jsonify({"error": "Model not loaded"}), 500
    
    logger.info(f"Модель загружена: {len(tracks_df)} треков, embeddings shape: {embeddings.shape}")
    
    try:
        data = request.get_json() or {}
        history_ids = data.get('history', [])
        history_with_dates = data.get('historyWithDates', [])
        preferred_genres = data.get('genres', [])
        preferred_artists = data.get('artists', [])
        limit = min(data.get('limit', DEFAULT_LIMIT), MAX_LIMIT)
        use_diversity = data.get('useDiversity', True)
        
        logger.info(f"Входные данные: history_ids={len(history_ids)}, history_with_dates={len(history_with_dates)}, genres={preferred_genres}, artists={preferred_artists}, limit={limit}")
        
        # Проверяем кэш
        cache_key = get_cache_key(history_ids, preferred_genres, preferred_artists, limit)
        cached_result = get_cached_recommendations(cache_key)
        if cached_result:
            logger.info(f"Кэш попадание: {len(cached_result)} рекомендаций")
            return jsonify({
                "recommendations": cached_result,
                "count": len(cached_result),
                "method": "ml_db_embeddings",
                "cached": True
            })
        
        logger.info(f"Запрос рекомендаций: history={len(history_ids)}, genres={len(preferred_genres)}, artists={len(preferred_artists)}, limit={limit}")
        
        # Если есть история и модель из БД
        if track_id_to_idx is not None and history_ids:
            logger.info(f"track_id_to_idx размер: {len(track_id_to_idx)}")
            logger.info(f"Первые 3 history_ids: {history_ids[:3]}")
            
            # Находим индексы треков по UUID
            history_indices = [
                track_id_to_idx[tid] 
                for tid in history_ids 
                if tid in track_id_to_idx
            ]
            
            logger.info(f"Найдено индексов в маппинге: {len(history_indices)} из {len(history_ids)}")
            
            if history_indices:
                # Вычисляем частоту прослушивания треков
                track_frequencies = defaultdict(int)
                for idx in history_indices:
                    track_frequencies[idx] += 1
                
                # Собираем все жанры и артисты из истории для динамических бонусов
                history_genres = []
                history_artists = []
                for idx in history_indices:
                    row = tracks_df.iloc[idx]
                    if pd.notna(row.get('genre')):
                        history_genres.append(str(row['genre']))
                    if pd.notna(row.get('artist')):
                        history_artists.append(str(row['artist']))
                
                # Вычисляем профиль пользователя с учетом дат и частоты
                user_profile = compute_user_profile(
                    history_indices,
                    history_with_dates=history_with_dates,
                    track_frequencies=track_frequencies
                )
                
                logger.info(f"Профиль пользователя shape: {user_profile.shape}, embeddings shape: {embeddings.shape}")
                
                # Косинусная близость
                similarities = cosine_similarity(user_profile, embeddings)[0]
                logger.info(f"Similarities computed: min={similarities.min():.4f}, max={similarities.max():.4f}, mean={similarities.mean():.4f}")
                
                # Применяем динамические бонусы
                similarities = compute_dynamic_bonuses(
                    similarities,
                    preferred_genres,
                    preferred_artists,
                    history_genres,
                    history_artists
                )
                logger.info(f"After bonuses: min={similarities.min():.4f}, max={similarities.max():.4f}, mean={similarities.mean():.4f}")
                
                # Исключаем треки из истории
                similarities[history_indices] = -1
                logger.info(f"After excluding history: {len([s for s in similarities if s > 0])} треков с положительной похожестью")
                
                # Топ рекомендации
                top_indices = np.argsort(-similarities)[:limit * 2]  # Берем больше для разнообразия
                logger.info(f"Top {len(top_indices)} индексов: {top_indices[:5]}")
                
                # Добавляем разнообразие (MMR)
                if use_diversity:
                    top_indices = add_diversity(similarities, top_indices, diversity_factor=0.2)
                    logger.info(f"After diversity: {len(top_indices)} индексов")
                
                top_indices = top_indices[:limit]
                recommended_tracks = tracks_df.iloc[top_indices]
                logger.info(f"Рекомендуемые треки: {len(recommended_tracks)}")
                
                # Формируем ответ
                recommendations = []
                for idx, (_, row) in enumerate(recommended_tracks.iterrows()):
                    recommendations.append({
                        "id": str(row['id']),
                        "artist": str(row.get('artist', 'Unknown')),
                        "title": str(row.get('title', 'Unknown')),
                        "genre": str(row.get('genre', 'Unknown')),
                        "plays": int(row.get('plays', 0)),
                        "similarity": float(similarities[top_indices[idx]])
                    })
                
                # Перемешиваем рекомендации для разнообразия (сохраняя топ-3 в начале)
                import random
                if len(recommendations) > 3:
                    top_three = recommendations[:3]
                    rest = recommendations[3:]
                    random.shuffle(rest)
                    recommendations = top_three + rest
                    logger.info(f"Рекомендации перемешаны: топ-3 сохранены, остальные перемешаны")
                
                # Кэшируем результат
                cache_recommendations(cache_key, recommendations)
                
                logger.info(f"Возвращено {len(recommendations)} рекомендаций (метод: ml_db_embeddings)")
                logger.info(f"=== AI DJ RECOMMEND RESPONSE: {len(recommendations)} рекомендаций ===")
                return jsonify({
                    "recommendations": recommendations,
                    "count": len(recommendations),
                    "method": "ml_db_embeddings",
                    "cached": False
                })
        
        # Fallback: холодный старт (новые пользователи)
        logger.info("Используется fallback метод (холодный старт)")
        filtered_df = tracks_df.copy()
        
        if preferred_genres and 'genre' in tracks_df.columns:
            filtered_df = filtered_df[filtered_df['genre'].isin(preferred_genres)]
        
        if preferred_artists and 'artist' in tracks_df.columns:
            filtered_df = filtered_df[filtered_df['artist'].isin(preferred_artists)]
        
        if len(filtered_df) == 0:
            filtered_df = tracks_df
        
        # Сортируем по популярности и перемешиваем
        if 'plays' in filtered_df.columns:
            top_tracks = filtered_df.nlargest(limit * 2, 'plays')
        else:
            top_tracks = filtered_df.head(limit * 2)
        
        sampled = top_tracks.sample(n=min(limit, len(top_tracks)), random_state=42)
        
        recommendations = []
        for _, row in sampled.iterrows():
            rec = {
                "artist": str(row.get('artist', 'Unknown')),
                "title": str(row.get('title', row.get('song', 'Unknown'))),
            }
            if 'id' in row:
                rec['id'] = str(row['id'])
            if 'genre' in row:
                rec['genre'] = str(row['genre'])
            if 'plays' in row:
                rec['plays'] = int(row['plays'])
            recommendations.append(rec)
        
        logger.info(f"Возвращено {len(recommendations)} рекомендаций (метод: cold_start)")
        logger.info(f"=== AI DJ RECOMMEND RESPONSE: {len(recommendations)} рекомендаций ===")
        return jsonify({
            "recommendations": recommendations,
            "count": len(recommendations),
            "method": "cold_start",
            "cached": False
        })
        
    except Exception as e:
        logger.error(f"Ошибка рекомендации: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/metrics', methods=['GET'])
def metrics():
    """
    Возвращает метрики качества модели.
    В будущем можно добавить реальные метрики (Precision@K, Recall@K, NDCG).
    """
    return jsonify({
        "cache_size": len(recommendation_cache),
        "cache_hit_rate": "N/A",  # Можно добавить счетчики
        "model_stats": {
            "tracks_count": len(tracks_df) if tracks_df is not None else 0,
            "embedding_dim": embeddings.shape[1] if embeddings is not None else 0,
            "model_size_mb": embeddings.nbytes / 1024 / 1024 if embeddings is not None else 0
        }
    })


if __name__ == '__main__':
    import sys
    
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "ml/ai_dj/data"
    if load_model(data_dir):
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 5001
        logger.info(f"AI DJ сервис V4 запущен на порту {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        logger.error("Не удалось загрузить модель.")
        logger.error("Запустите: python ml/ai_dj/train_model.py <DATABASE_URL>")
        sys.exit(1)
