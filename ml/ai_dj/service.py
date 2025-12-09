"""
Flask-сервис для AI DJ рекомендаций V2.
Использует модель, обученную на треках из БД.
"""

from flask import Flask, request, jsonify
import pickle
import numpy as np
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd

app = Flask(__name__)

# Глобальные переменные для модели
embeddings = None
tracks_df = None
track_id_to_idx = None

def load_model(data_dir: str = "ml/ai_dj/data"):
    """Загружает модель и эмбеддинги при старте"""
    global embeddings, tracks_df, track_id_to_idx
    
    data_path = Path(data_dir)
    
    try:
        # Пытаемся загрузить модель на основе БД
        if (data_path / "db_embeddings.npy").exists():
            print("📦 Загружаю модель из БД...")
            embeddings = np.load(data_path / "db_embeddings.npy")
            tracks_df = pd.read_pickle(data_path / "db_tracks.pkl")
            with open(data_path / "db_track_mapping.pkl", "rb") as f:
                track_id_to_idx = pickle.load(f)
            
            print(f"✓ Модель из БД загружена: {len(tracks_df)} треков, embeddings shape: {embeddings.shape}")
            return True
        
        # Fallback: старая модель Kaggle
        if (data_path / "embeddings.npy").exists():
            print("📦 Загружаю модель Kaggle (fallback)...")
            embeddings = np.load(data_path / "embeddings.npy")
            tracks_df = pd.read_pickle(data_path / "tracks_df.pkl")
            track_id_to_idx = None
            
            print(f"✓ Модель Kaggle загружена: {len(tracks_df)} треков")
            return True
        
        print("✗ Модель не найдена")
        return False
        
    except Exception as e:
        print(f"✗ Ошибка загрузки модели: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """Проверка работоспособности сервиса"""
    return jsonify({
        "status": "ok",
        "model_loaded": embeddings is not None,
        "tracks_count": len(tracks_df) if tracks_df is not None else 0,
        "model_type": "db" if track_id_to_idx is not None else "kaggle"
    })

@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Получает историю пользователя и возвращает рекомендации.
    
    Request body:
    {
        "history": ["track_id_1", "track_id_2"],  // UUID треков из БД
        "genres": ["Hip-Hop", "Rap"],  // предпочитаемые жанры
        "artists": ["artist1"],  // предпочитаемые артисты
        "limit": 25
    }
    """
    if embeddings is None or tracks_df is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    try:
        data = request.get_json()
        history_ids = data.get('history', [])
        preferred_genres = data.get('genres', [])
        preferred_artists = data.get('artists', [])
        limit = min(data.get('limit', 25), 50)
        
        # Если модель из БД и есть история с UUID
        if track_id_to_idx is not None and history_ids:
            # Находим индексы треков по UUID
            history_indices = [
                track_id_to_idx[tid] 
                for tid in history_ids 
                if tid in track_id_to_idx
            ]
            
            if history_indices:
                # Вычисляем профиль пользователя
                user_profile = embeddings[history_indices].mean(axis=0, keepdims=True)
                
                # Косинусная близость
                similarities = cosine_similarity(user_profile, embeddings)[0]
                
                # Бонусы за жанры и артистов
                if preferred_genres and 'genre' in tracks_df.columns:
                    genre_mask = tracks_df['genre'].isin(preferred_genres)
                    similarities[genre_mask] *= 1.3
                
                if preferred_artists and 'artist' in tracks_df.columns:
                    artist_mask = tracks_df['artist'].isin(preferred_artists)
                    similarities[artist_mask] *= 1.2
                
                # Исключаем треки из истории
                similarities[history_indices] = -1
                
                # Топ рекомендации
                top_indices = np.argsort(-similarities)[:limit]
                recommended_tracks = tracks_df.iloc[top_indices]
                
                recommendations = []
                for _, row in recommended_tracks.iterrows():
                    recommendations.append({
                        "id": row['id'],
                        "artist": str(row.get('artist', 'Unknown')),
                        "title": str(row.get('title', 'Unknown')),
                        "genre": str(row.get('genre', 'Unknown')),
                        "plays": int(row.get('plays', 0)),
                    })
                
                return jsonify({
                    "recommendations": recommendations,
                    "count": len(recommendations),
                    "method": "ml_db_embeddings"
                })
        
        # Если нет истории или fallback Kaggle
        # Возвращаем популярные с фильтром по жанрам/артистам
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
        
        sampled = top_tracks.sample(n=min(limit, len(top_tracks)))
        
        recommendations = []
        for _, row in sampled.iterrows():
            rec = {
                "artist": str(row.get('artist', 'Unknown')),
                "title": str(row.get('title', row.get('song', 'Unknown'))),
            }
            if 'id' in row:
                rec['id'] = row['id']
            if 'genre' in row:
                rec['genre'] = str(row['genre'])
            if 'plays' in row:
                rec['plays'] = int(row['plays'])
            recommendations.append(rec)
        
        return jsonify({
            "recommendations": recommendations,
            "count": len(recommendations),
            "method": "filtered_popular"
        })
        
    except Exception as e:
        print(f"Ошибка рекомендации: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    import sys
    
    # Загружаем модель при старте
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "ml/ai_dj/data"
    if load_model(data_dir):
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 5001
        print(f"🎵 AI DJ сервис V2 запущен на порту {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print("Не удалось загрузить модель.")
        print("Запустите: python ml/ai_dj/db_integration.py <DATABASE_URL>")
        sys.exit(1)

