# -*- coding: utf-8 -*-
"""
Script d'entraînement du modèle LightGBM.
------------------------------------------
Source : MySQL rentcar_db (tables cars / car_categories / reservations / reviews).
Le script construit un dataset de couples (voiture, préférences simulées) et entraîne
un régresseur LGBM dont la cible match_score est dérivée des réservations COMPLETED
et des notes moyennes. Le modèle améliore constamment le scoring content-based.

Usage :
  python train.py                  # Train + sauvegarde dans models/lgbm_recommender.pkl
  python train.py --from-api /path # Optionnel : dataset construit à partir d'un export JSON

En production, Spring peut appeler `python train.py` après chaque réservation COMPLETED
(en tâche de fond via ProcessBuilder) pour un apprentissage incrémental léger.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from recommender import (
    BASE_DIR, FEATURE_COLUMNS, LGBM_MODEL_PATH, WEIGHTS_PATH,
    MODELS_DIR, UserPrefs, CarRow, car_to_feature_row,
    OBJECTIVE_TO_FEATURES, DEFAULT_FEATURE_WEIGHTS,
    _normalize_category_name,
)

load_dotenv(BASE_DIR / ".env")


def _read_cars_from_db() -> list[dict]:
    """Lit les voitures + catégorie + notes moyennes + popularity depuis MySQL."""
    try:
        import mysql.connector  # type: ignore
    except ImportError:
        return []

    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "root")
    pwd = os.getenv("DB_PASSWORD", "")
    db = os.getenv("DB_NAME", "rentcar_db")

    try:
        conn = mysql.connector.connect(host=host, port=port, user=user, password=pwd, database=db)
    except Exception as exc:
        print(f"[train] Impossible de se connecter à MySQL : {exc}")
        return []

    sql = """
        SELECT
            c.id                                     AS car_id,
            c.brand,
            c.model,
            c.daily_rate,
            c.seats,
            c.transmission,
            c.fuel_type,
            c.category_id,
            COALESCE(cat.name,'')                    AS category_name,
            c.status,
            COALESCE(c.`year`, NULL)                 AS year_car,
            c.mileage,
            c.description,
            c.is_active,
            COALESCE(AVG(r.rating), 0)               AS rating_avg,
            COUNT(DISTINCT res.id)                   AS reservation_count
        FROM cars c
        LEFT JOIN car_categories cat ON cat.id = c.category_id
        LEFT JOIN reviews r         ON r.car_id = c.id
        LEFT JOIN reservations res  ON res.car_id = c.id
        WHERE c.is_active = TRUE
        GROUP BY c.id, c.brand, c.model, c.daily_rate, c.seats, c.transmission,
                 c.fuel_type, c.category_id, cat.name, c.status, c.`year`, c.mileage,
                 c.description, c.is_active
    """
    cars = []
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql)
        for row in cur.fetchall():
            cars.append({
                "car_id": row["car_id"],
                "brand": row["brand"] or "",
                "model": row["model"] or "",
                "daily_rate": float(row["daily_rate"] or 0.0),
                "seats": int(row["seats"] or 5),
                "transmission": (row["transmission"] or "MANUAL").strip().upper(),
                "fuel_type": (row["fuel_type"] or "GASOLINE").strip().upper(),
                "category_id": row["category_id"],
                "category_name": row["category_name"] or "",
                "status": (row["status"] or "AVAILABLE").strip().upper(),
                "rating_avg": float(row["rating_avg"] or 0.0),
                "reservation_count": int(row["reservation_count"] or 0),
                "description": row["description"] or "",
                "year": int(row["year_car"]) if row["year_car"] else None,
                "mileage": int(row["mileage"]) if row["mileage"] else None,
            })
    finally:
        conn.close()
    return cars


def _simulate_prefs_from_reservation(res: dict) -> list[dict]:
    """
    À partir d'une réservation COMPLETED (ou en cours), on génère 2-3 profils
    utilisateurs plausibles qui auraient choisi cette voiture.
    C'est notre ground-truth faible car nous n'avons pas de préférences saisies
    à l'origine. Plus tard, on pourra remplacer par les préférences réelles.
    """
    daily_rate = float(res.get("daily_rate") or 0.0)
    seats = int(res.get("seats") or 5)
    duration_days = int(res.get("duration_days") or 3)
    transmission = (res.get("transmission") or "MANUAL").upper()
    cat_norm = _normalize_category_name(res.get("category_name") or "")

    profiles = []
    # 1. Profil le plus probable
    obj = "QUOTIDIEN"
    if cat_norm == "SUV / SPACIEUX":
        obj = "FAMILLE" if seats >= 6 else "AVENTURE"
    elif cat_norm == "BERLINE / CONFORT":
        obj = "CONFORT" if seats <= 5 else "PROFESSIONNEL"
    elif cat_norm == "ECONOMIQUE":
        fuel = (res.get("fuel_type") or "GASOLINE").upper()
        obj = "ECOLOGIQUE" if fuel in {"HYBRID", "ELECTRIC"} else "QUOTIDIEN"

    profiles.append({
        "objective": obj,
        "budget": round(daily_rate * 1.25, 2),
        "passengers": min(7, max(1, seats)),
        "duration": max(1, duration_days),
        "transmission": transmission if np.random.random() > 0.2 else "ANY",
    })
    # 2. Légère variation
    profiles.append({
        "objective": obj,
        "budget": round(daily_rate * 1.45, 2),
        "passengers": min(7, max(1, seats - (1 if seats > 2 else 0))),
        "duration": max(1, duration_days),
        "transmission": "ANY",
    })
    return profiles


def _read_reservations_from_db(cars_index: dict[int, dict]) -> list[dict]:
    try:
        import mysql.connector  # type: ignore
    except ImportError:
        return []

    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "root")
    pwd = os.getenv("DB_PASSWORD", "")
    db = os.getenv("DB_NAME", "rentcar_db")
    try:
        conn = mysql.connector.connect(host=host, port=port, user=user, password=pwd, database=db)
    except Exception as exc:
        print(f"[train] MySQL indisponible pour les réservations : {exc}")
        return []

    sql = """
        SELECT
            res.id,
            res.car_id,
            res.start_date,
            res.end_date,
            res.price_per_day_snapshot AS daily_rate,
            res.status,
            res.total_amount,
            c.seats,
            c.transmission,
            c.fuel_type,
            cat.name AS category_name,
            COALESCE(AVG(rv.rating), 0) AS rating
        FROM reservations res
        JOIN cars c         ON c.id = res.car_id
        LEFT JOIN car_categories cat ON cat.id = c.category_id
        LEFT JOIN reviews rv ON rv.reservation_id = res.id
        WHERE res.status IN ('COMPLETED','IN_PROGRESS','CONFIRMED')
        GROUP BY res.id, res.car_id, res.start_date, res.end_date,
                 res.price_per_day_snapshot, res.status, res.total_amount,
                 c.seats, c.transmission, c.fuel_type, cat.name
    """
    rows = []
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql)
        for row in cur.fetchall():
            sd, ed = row["start_date"], row["end_date"]
            dur = 3
            try:
                if sd and ed:
                    dur = (pd.Timestamp(ed) - pd.Timestamp(sd)).days
                    dur = max(1, int(dur))
            except Exception:
                dur = 3
            rows.append({
                "car_id": row["car_id"],
                "daily_rate": float(row["daily_rate"] or cars_index.get(row["car_id"], {}).get("daily_rate", 0.0)),
                "seats": int(row["seats"] or 5),
                "transmission": (row["transmission"] or "MANUAL").strip().upper(),
                "fuel_type": (row["fuel_type"] or "GASOLINE").strip().upper(),
                "category_name": row["category_name"] or "",
                "duration_days": dur,
                "rating_avg": float(row["rating"] or cars_index.get(row["car_id"], {}).get("rating_avg", 0.0)),
                "reservation_count": 1,
            })
    finally:
        conn.close()
    return rows


def _build_target(car: CarRow, prefs: UserPrefs, reservation_count: int, rating_avg: float) -> float:
    """
    Cible 0..100.
    - +80pts si cette voiture a été réellement réservée par un profil équivalent
    - +/- ajustements selon rating, popularité, cohérence avec préférences
    """
    base = 80.0
    base += min(10.0, rating_avg * 2.0)                      # 4.5/5 → +9
    base += min(5.0, reservation_count * 0.5)                 # populaire → +jusqu'à 5
    # Si cohérent avec préférences objectives → bonus
    profile = OBJECTIVE_TO_FEATURES.get(
        str(prefs.objective).strip().upper(), OBJECTIVE_TO_FEATURES["QUOTIDIEN"]
    )
    if str(car.fuel_type).upper() in profile["fuel_pref"]:
        base += 3.0
    if _normalize_category_name(car.category_name) in [
        _normalize_category_name(x) for x in profile["categories"]
    ]:
        base += 2.0
    return float(np.clip(base, 0.0, 100.0))


def build_dataset(cars: list[dict], reservations: list[dict]) -> tuple[pd.DataFrame, np.ndarray]:
    cars_objs = [CarRow(**c) for c in cars]
    cars_index = {c.car_id: c for c in cars_objs}

    rows: list[dict] = []
    labels: list[float] = []

    # Cas 1 — Voitures avec réservations → label élevé (profil plausibles)
    #         + Échantillons négatifs (voitures alternatives non choisies)
    for res in reservations:
        car_id = int(res.get("car_id") or 0)
        car = cars_index.get(car_id)
        if not car:
            continue
        prefs_list = _simulate_prefs_from_reservation(res)
        for p in prefs_list:
            prefs = UserPrefs(**p)
            feat = car_to_feature_row(car, prefs)
            rows.append(feat)
            labels.append(_build_target(
                car, prefs,
                reservation_count=int(res.get("reservation_count") or 1),
                rating_avg=float(res.get("rating_avg") or 0.0),
            ))
            # Négatif : 2 voitures de catégories différentes avec tarifs éloignés
            others = [c for c in cars_objs if c.car_id != car.car_id]
            np.random.default_rng().shuffle(others)
            for neg in others[:2]:
                feat_neg = car_to_feature_row(neg, prefs)
                # label plus faible
                rate_alt = float(neg.daily_rate or 0.0)
                budget = float(prefs.budget or 1.0)
                penalty = 0.0
                if rate_alt > budget:
                    penalty = min(25.0, (rate_alt - budget) / budget * 50.0)
                seat_gap = max(0, (int(prefs.passengers or 0) - int(neg.seats or 0)) * 6)
                fuel_match = (str(neg.fuel_type).upper() in OBJECTIVE_TO_FEATURES.get(
                    str(prefs.objective).upper(), {}
                ).get("fuel_pref", []))
                cat_match = _normalize_category_name(neg.category_name) in [
                    _normalize_category_name(c)
                    for c in OBJECTIVE_TO_FEATURES.get(str(prefs.objective).upper(), {}).get("categories", [])
                ]
                bonus = (3 if fuel_match else 0) + (5 if cat_match else 0)
                base_neg = float(np.clip(40.0 + bonus - penalty - seat_gap, 0.0, 75.0))
                rows.append(feat_neg)
                labels.append(base_neg)

    # Cas 2 — Voitures sans réservations (échantillons exploratoires)
    if reservations:
        pass  # dataset déjà construit
    else:
        # Pas de réservations : labels tirés du content-scoring
        from recommender import content_score, _load_weights
        w = _load_weights()
        for car in cars_objs:
            for obj in list(OBJECTIVE_TO_FEATURES.keys())[:3]:
                prefs = UserPrefs(
                    objective=obj,
                    budget=max(15.0, float(car.daily_rate or 40.0)) * 1.25,
                    passengers=min(7, max(1, car.seats or 5)),
                    duration=3,
                    transmission=car.transmission or "ANY",
                )
                feat = car_to_feature_row(car, prefs)
                rows.append(feat)
                labels.append(float(content_score(car, prefs, w)))

    df = pd.DataFrame(rows)
    for c in FEATURE_COLUMNS:
        if c not in df.columns:
            df[c] = 0
    return df[FEATURE_COLUMNS].astype(float), np.asarray(labels, dtype=float)


def train(dataset_path: str | None = None) -> dict:
    cars = _read_cars_from_db()
    reservations: list[dict] = []
    if dataset_path and Path(dataset_path).exists():
        data = json.loads(Path(dataset_path).read_text(encoding="utf-8"))
        cars = data.get("cars", cars)
        reservations = data.get("reservations", reservations)

    if not cars:
        print("[train] Aucune voiture disponible — entraînement annulé.")
        return {"success": False, "reason": "no_cars"}

    cars_index = {int(c["car_id"]): c for c in cars}
    if not reservations:
        reservations = _read_reservations_from_db(cars_index)

    X, y = build_dataset(cars, reservations)
    if len(X) < 8:
        print(f"[train] Dataset trop petit ({len(X)} échantillons) — entraînement sauté.")
        # Même sans entraînement, on enregistre des poids par défaut pour garantir un démarrage
        if not WEIGHTS_PATH.exists():
            WEIGHTS_PATH.write_text(
                json.dumps(DEFAULT_FEATURE_WEIGHTS, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        return {"success": False, "reason": "dataset_too_small", "n_samples": len(X)}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.22, random_state=42
    )

    model = LGBMRegressor(
        objective="regression",
        n_estimators=350,
        learning_rate=0.05,
        num_leaves=31,
        min_child_samples=5,
        feature_fraction=0.9,
        bagging_fraction=0.9,
        bagging_freq=5,
        random_state=42,
        verbose=-1,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)])

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"[train] MAE = {mae:.2f} pts (jeu test : {len(X_test)} échantillons)")
    print(f"[train] Prédiction moyenne = {float(preds.mean()):.2f} / 100")

    # Feature importance → ajustement des poids content-based (learning feedback)
    try:
        fi = dict(zip(FEATURE_COLUMNS, model.feature_importances_))
        mapping_groups = {
            "objective":    ["objective_encoded", "category_match"],
            "budget":       ["budget", "daily_rate", "rate_budget_ratio"],
            "passengers":   ["passengers", "seats", "seats_needed_gap"],
            "duration":     ["duration"],
            "transmission": ["transmission_match"],
            "rating":       ["rating_avg"],
            "popularity":   ["popularity"],
        }
        grouped = {g: sum(fi.get(f, 0.0) for f in fts) for g, fts in mapping_groups.items()}
        total = sum(grouped.values()) or 1.0
        new_weights = {g: round(v / total * 100.0, 2) for g, v in grouped.items()}
        # Mélange 60/40 avec les poids initiaux pour ne pas déstabiliser le contenu
        merged = {
            k: round(0.6 * DEFAULT_FEATURE_WEIGHTS[k] + 0.4 * new_weights.get(k, DEFAULT_FEATURE_WEIGHTS[k]), 2)
            for k in DEFAULT_FEATURE_WEIGHTS
        }
        WEIGHTS_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[train] Feature weights mis à jour : {merged}")
    except Exception as exc:
        print(f"[train] Màj weights ignorée : {exc}")

    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model, LGBM_MODEL_PATH)
    print(f"[train] Modèle sauvegardé → {LGBM_MODEL_PATH}")
    return {
        "success": True,
        "n_samples": int(len(X)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae": float(round(mae, 3)),
        "model_path": str(LGBM_MODEL_PATH),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Entraîner LightGBM pour RentCar")
    parser.add_argument("--from-api", help="Chemin JSON d'un export {cars, reservations}")
    args = parser.parse_args()
    out = train(args.from_api)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0 if out.get("success") or out.get("reason") == "dataset_too_small" else 1


if __name__ == "__main__":
    sys.exit(main())
