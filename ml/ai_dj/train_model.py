import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
import pickle
from datetime import datetime
import logging
from typing import Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def connect_to_db(database_url: str):
    try:
        clean_url = database_url.split('?')[0] if '?' in database_url else database_url
        conn = psycopg2.connect(clean_url)
        logger.info("Подключение к БД установлено")
        return conn
    except Exception as e:
        logger.error(f"Ошибка подключения к БД: {e}")
        raise


def extract_tracks_from_db(conn) -> pd.DataFrame:
    """
    Извлекает треки из БД и создает DataFrame.
    
    Returns:
        pd.DataFrame: DataFrame с колонками: id, title, artist, genre, plays
    """
    query = """
    SELECT 
        t.id,
        t.title,
        COALESCE(a.name, 'Unknown Artist') as artist,
        COALESCE(g.name, 'Unknown') as genre,
        COALESCE(t.plays_count, 0) as plays,
        COALESCE(t.duration, 0) as duration,
        COALESCE(alb.year, 0) as album_year,
        (SELECT COUNT(*) FROM liked_tracks lt WHERE lt.track_id = t.id) as likes_count
    FROM tracks t
    LEFT JOIN artists a ON t.artist_id = a.id
    LEFT JOIN genres g ON t.genre_id = g.id
    LEFT JOIN albums alb ON t.album_id = alb.id
    WHERE t.is_published = true
    ORDER BY t.plays_count DESC
    """
    
    logger.info("Извлекаю треки из БД...")
    logger.info(f"SQL запрос: {query[:200]}...")
    
    try:
        df = pd.read_sql_query(query, conn)
        logger.info(f"Извлечено {len(df)} треков")
        if len(df) > 0:
            logger.info(f"Примеры треков: {df[['id', 'title', 'artist']].head(3).to_dict('records')}")
        return df
    except Exception as e:
        logger.error(f"Ошибка извлечения треков: {e}")
        raise


def create_text_features(df: pd.DataFrame) -> List[str]:
    """
    Создает текстовые признаки для каждого трека.
    Объединяет название, артиста, жанр и год альбома.
    
    Args:
        df: DataFrame с треками
    
    Returns:
        List[str]: Список текстовых признаков
    """
    logger.info("Создаю текстовые признаки...")
    
    # Объединяем название, артиста, жанр и год альбома
    text_features = []
    for _, row in df.iterrows():
        # Добавляем год альбома для лучшей контекстуализации
        year = int(row.get('album_year', 0)) if pd.notna(row.get('album_year')) else 0
        year_text = f"year{year}" if year > 0 else ""
        text = f"{row['title']} {row['artist']} {row['genre']} {year_text}".strip()
        text_features.append(text.lower())
    
    logger.info(f"Создано {len(text_features)} текстовых признаков")
    return text_features


def create_embeddings(text_features: List[str], df: pd.DataFrame, embedding_dim: int = 512) -> np.ndarray:
    """
    Создает embeddings для треков используя TF-IDF + PCA.
    
    Args:
        text_features: Список текстовых признаков
        df: DataFrame с треками
        embedding_dim: Размерность embeddings (по умолчанию 128)
    
    Returns:
        np.ndarray: Матрица embeddings (N треков × embedding_dim)
    """
    logger.info(f"Создаю embeddings (размерность: {embedding_dim})...")
    
    # TF-IDF векторизация с улучшенными параметрами
    vectorizer = TfidfVectorizer(
        max_features=2000,  # Увеличено до 2000 признаков для лучшего качества
        min_df=1,  # Минимум 1 вхождение (для малых датасетов)
        max_df=0.85,  # Максимум 85% документов (более строгий фильтр)
        ngram_range=(1, 4),  # Униграммы, биграммы, триграммы и 4-граммы
        stop_words='english',  # Удаляем стоп-слова
        sublinear_tf=True,  # Логарифмическое масштабирование TF
        analyzer='word',  # Анализ по словам
        norm='l2'  # L2 нормализация для лучшей стабильности
    )
    
    tfidf_matrix = vectorizer.fit_transform(text_features)
    logger.info(f"TF-IDF матрица: {tfidf_matrix.shape}")
    
    # Добавляем числовые признаки (популярность, длительность, лайки)
    numeric_features = []
    
    # Популярность (логарифмическая шкала для уменьшения влияния выбросов)
    plays_log = np.log1p(df['plays'].fillna(0).values).reshape(-1, 1)
    numeric_features.append(plays_log)
    
    # Длительность трека (нормализованная)
    duration = df['duration'].fillna(0).values.reshape(-1, 1)
    if duration.max() > 0:
        duration_normalized = StandardScaler().fit_transform(duration)
    else:
        duration_normalized = duration
    numeric_features.append(duration_normalized)
    
    # Количество лайков (логарифмическая шкала)
    likes = df.get('likes_count', pd.Series([0] * len(df))).fillna(0).values.reshape(-1, 1)
    likes_log = np.log1p(likes)
    numeric_features.append(likes_log)
    
    # Объединяем все числовые признаки
    numeric_combined = np.hstack(numeric_features)
    numeric_normalized = StandardScaler().fit_transform(numeric_combined)
    
    # Объединяем TF-IDF и числовые признаки
    # Используем PCA для уменьшения размерности
    numeric_dim = numeric_normalized.shape[1]
    pca_dim = embedding_dim - numeric_dim
    
    # Ограничиваем размерность PCA количеством доступных признаков и треков
    max_pca_components = min(tfidf_matrix.shape[0] - 1, tfidf_matrix.shape[1], pca_dim)
    
    if tfidf_matrix.shape[1] > max_pca_components and max_pca_components > 0:
        pca = PCA(n_components=max_pca_components, random_state=42)
        tfidf_reduced = pca.fit_transform(tfidf_matrix.toarray())
        logger.info(f"PCA применен: {tfidf_reduced.shape} (запрошено {pca_dim}, доступно {max_pca_components})")
    else:
        # Если треков мало, используем все доступные признаки
        tfidf_reduced = tfidf_matrix.toarray()
        logger.info(f"PCA пропущен: используем все {tfidf_reduced.shape[1]} TF-IDF признаков")
    
    # Объединяем TF-IDF и числовые признаки
    embeddings = np.hstack([tfidf_reduced, numeric_normalized])
    
    # L2 нормализация для лучшей работы cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1  # Избегаем деления на ноль
    embeddings = embeddings / norms
    
    logger.info(f"Embeddings созданы: {embeddings.shape}")
    logger.info(f"Embeddings нормализованы (L2): min_norm={norms.min():.4f}, max_norm={norms.max():.4f}")
    return embeddings


def save_model(
    embeddings: np.ndarray,
    tracks_df: pd.DataFrame,
    track_id_to_idx: Dict[str, int],
    output_dir: str
):
    """
    Сохраняет модель в файлы.
    
    Args:
        embeddings: Матрица embeddings
        tracks_df: DataFrame с треками
        track_id_to_idx: Маппинг UUID – индекс
        output_dir: Директория для сохранения
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Сохраняю модель в {output_path}...")
    
    # Сохраняем эмбеддинги
    embeddings_path = output_path / "db_embeddings.npy"
    np.save(embeddings_path, embeddings)
    logger.info(f"Embeddings сохранены: {embeddings_path}")
    
    # Сохраняем датафрейм
    tracks_path = output_path / "db_tracks.pkl"
    tracks_df.to_pickle(tracks_path)
    logger.info(f"DataFrame сохранен: {tracks_path}")
    
    # Сохраняем маппинг
    mapping_path = output_path / "db_track_mapping.pkl"
    with open(mapping_path, "wb") as f:
        pickle.dump(track_id_to_idx, f)
    logger.info(f"Маппинг сохранен: {mapping_path}")
    
    # Сохраняем векторизатор (для будущего использования)
    vectorizer_path = output_path / "db_vectorizer.pkl"
    # Векторизатор не сохраняем, т.к. он не используется в runtime
    logger.info(f"Модель сохранена успешно!")


def main():
    """Основная функция обучения модели"""
    # Пытаемся получить DATABASE_URL из переменных окружения или аргументов
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        if len(sys.argv) < 2:
            logger.error("Использование: python train_model.py <DATABASE_URL> [output_dir]")
            logger.error('Или установите переменную окружения: export DATABASE_URL="postgresql://..."')
            logger.error('Пример: python train_model.py "postgresql://user:pass@localhost:5432/db" ml/ai_dj/data')
            sys.exit(1)
        database_url = sys.argv[1]
    
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "ml/ai_dj/data"
    
    logger.info("Начало обучения модели AI DJ...")
    logger.info(f"DATABASE_URL: {database_url[:30]}...")
    logger.info(f"Output dir: {output_dir}")
    
    try:
        # Подключаемся к БД
        conn = connect_to_db(database_url)
        
        # Извлекаем треки
        tracks_df = extract_tracks_from_db(conn)
        conn.close()
        
        if len(tracks_df) == 0:
            logger.error("В БД нет опубликованных треков!")
            sys.exit(1)
        
        # Создаем текстовые признаки
        text_features = create_text_features(tracks_df)
        
        # Создаем embeddings
        embeddings = create_embeddings(text_features, tracks_df, embedding_dim=512)
        
        # Создаем маппинг UUID – индекс
        track_id_to_idx = {str(track_id): idx for idx, track_id in enumerate(tracks_df['id'])}
        logger.info(f"Маппинг создан: {len(track_id_to_idx)} треков")
        
        # Сохраняем модель
        save_model(embeddings, tracks_df, track_id_to_idx, output_dir)
        
        logger.info("Обучение модели завершено успешно!")
        logger.info(f"Статистика:")
        logger.info(f"   - Треков: {len(tracks_df)}")
        logger.info(f"   - Размерность embeddings: {embeddings.shape[1]}")
        logger.info(f"   - Размер модели: {embeddings.nbytes / 1024 / 1024:.2f} MB")
        
    except Exception as e:
        logger.error(f"Ошибка обучения: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

