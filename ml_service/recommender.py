# -*- coding: utf-8 -*-
"""
RentCar — Recommendation engine
-------------------------------
Hybrid model :
  1. Contented-based weighted scoring (toujours actif, ne nécessite aucun entraînement)
  2. Ajustements fins via un régresseur LightGBM si un modèle entraîné est présent
Le score final (match_score) est renvoyé sur 100.
"""
from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

LGBM_MODEL_PATH = MODELS_DIR / "lgbm_recommender.pkl"
WEIGHTS_PATH = MODELS_DIR / "feature_weights.json"
LABEL_ENCODERS_PATH = MODELS_DIR / "label_encoders.pkl"

# ---------------------------------------------------------------------------
# Mappings vers le référentiel du projet
# ---------------------------------------------------------------------------

OBJECTIVE_TO_FEATURES: dict[str, dict[str, Any]] = {
    "QUOTIDIEN": {
        "categories": ["ECONOMIQUE"],
        "fuel_pref": ["GASOLINE", "HYBRID", "ELECTRIC"],
        "seat_ideal": 5,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["ville", "citadine", "economique", "quotidien"],
    },
    "FAMILLE": {
        "categories": ["SUV / SPACIEUX", "BERLINE / CONFORT"],
        "fuel_pref": ["DIESEL", "HYBRID", "GASOLINE"],
        "seat_ideal": 7,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["famille", "spacieux", "voyage", "enfant"],
    },
    "PROFESSIONNEL": {
        "categories": ["BERLINE / CONFORT", "SUV / SPACIEUX"],
        "fuel_pref": ["DIESEL", "HYBRID"],
        "seat_ideal": 5,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["professionnel", "confort", "prestige", "business"],
    },
    "AVENTURE": {
        "categories": ["SUV / SPACIEUX"],
        "fuel_pref": ["DIESEL", "HYBRID", "GASOLINE"],
        "seat_ideal": 5,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["aventure", "tout chemin", "robuste", "voyage"],
    },
    "CONFORT": {
        "categories": ["BERLINE / CONFORT", "SUV / SPACIEUX"],
        "fuel_pref": ["HYBRID", "ELECTRIC", "DIESEL"],
        "seat_ideal": 5,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["confort", "luxe", "premium", "berline"],
    },
    "ECOLOGIQUE": {
        "categories": ["ECONOMIQUE", "BERLINE / CONFORT"],
        "fuel_pref": ["ELECTRIC", "HYBRID"],
        "seat_ideal": 5,
        "rate_ideal_multiplier": 1.0,
        "keywords": ["hybride", "electrique", "eco", "verte"],
    },
}

DEFAULT_FEATURE_WEIGHTS: dict[str, float] = {
    "objective": 26.0,
    "budget": 22.0,
    "passengers": 18.0,
    "duration": 6.0,
    "transmission": 12.0,
    "rating": 9.0,
    "popularity": 7.0,
}

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class CarRow:
    car_id: int
    brand: str = ""
    model: str = ""
    daily_rate: float = 0.0
    seats: int = 5
    transmission: str = "MANUAL"     # MANUAL / AUTOMATIC
    fuel_type: str = "GASOLINE"      # GASOLINE / DIESEL / HYBRID / ELECTRIC
    category_id: int | None = None
    category_name: str = ""
    status: str = "AVAILABLE"
    rating_avg: float = 0.0          # 0..5
    reservation_count: int = 0
    description: str = ""
    year: int | None = None
    mileage: int | None = None

@dataclass
class UserPrefs:
    objective: str = "QUOTIDIEN"     # cf OBJECTIVE_TO_FEATURES keys
    budget: float = 60.0             # DT / jour
    passengers: int = 4              # 1..7
    duration: int = 3                # jours
    transmission: str = "ANY"        # AUTOMATIC / MANUAL / ANY

@dataclass
class RecoResult:
    car_id: int
    brand: str
    model: str
    daily_rate: float
    match_score: float
    rating_avg: float
    category_name: str
    highlights: list[str] = field(default_factory=list)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _norm(x: float, center: float, sigma: float) -> float:
    """Fonction gaussienne pour calculer l'appartenance à une valeur idéale."""
    try:
        return float(math.exp(-0.5 * ((x - center) / sigma) ** 2))
    except Exception:
        return 0.0


def _normalize_category_name(name: str | None) -> str:
    if not name:
        return ""
    n = str(name).strip().upper()
    if "ECONO" in n:
        return "ECONOMIQUE"
    if "BERLINE" in n or "CONFORT" in n:
        return "BERLINE / CONFORT"
    if "SUV" in n or "SPACIEUX" in n:
        return "SUV / SPACIEUX"
    return n


def _load_pickled(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return joblib.load(path)
        except Exception:
            return default
    return default


def _load_weights() -> dict[str, float]:
    if WEIGHTS_PATH.exists():
        try:
            w = json.loads(WEIGHTS_PATH.read_text(encoding="utf-8"))
            return {**DEFAULT_FEATURE_WEIGHTS, **w}
        except Exception:
            pass
    return dict(DEFAULT_FEATURE_WEIGHTS)


def _objective_profile(prefs: UserPrefs) -> dict[str, Any]:
    key = str(prefs.objective).strip().upper()
    if key in OBJECTIVE_TO_FEATURES:
        return OBJECTIVE_TO_FEATURES[key]
    return OBJECTIVE_TO_FEATURES["QUOTIDIEN"]


# ---------------------------------------------------------------------------
# Scoring (content-based)
# ---------------------------------------------------------------------------

def _score_objective(car: CarRow, profile: dict[str, Any]) -> float:
    """Note sur 100 : catégorie préférée + fuel préféré + keywords + seats vs ideal."""
    score = 0.0
    cat_norm = _normalize_category_name(car.category_name)
    profile_cats = [_normalize_category_name(c) for c in profile["categories"]]

    if cat_norm in profile_cats:
        score += 45.0
    # Bonus fuel
    if car.fuel_type and str(car.fuel_type).upper() in profile["fuel_pref"]:
        score += 25.0
    # Keywords match dans description
    if car.description:
        desc = car.description.lower()
        n_keywords = sum(1 for kw in profile["keywords"] if kw in desc)
        score += min(15.0, n_keywords * 3.0)
    # Seats proche de l'idéal
    ideal = int(profile.get("seat_ideal", 5))
    seats = car.seats or 5
    # Nombre passagers ≥ 2 → proches de l'idéal
    score += 15.0 * _norm(seats, ideal, 2.0)
    return score


def _score_budget(car: CarRow, budget: float) -> float:
    """Note sur 100. Budget parfait = 80% du budget indiqué, fort malus si > budget."""
    if budget is None or budget <= 0:
        return 50.0
    rate = car.daily_rate or 0
    if rate <= 0:
        return 0.0
    if rate > budget * 1.1:
        # Trop cher : décroissance forte
        over = (rate - budget * 1.1) / max(budget, 1e-6)
        return float(max(0.0, 30.0 * math.exp(-3.0 * over)))
    if rate <= budget:
        # Meilleur score autour de 80% du budget
        center = 0.8 * budget
        return 65.0 + 35.0 * _norm(rate, center, budget * 0.35)
    # Légèrement au-dessus mais <= 110%
    return 55.0 * _norm(rate, budget, budget * 0.1)


def _score_passengers(car: CarRow, passengers: int) -> float:
    """Note sur 100 : la voiture doit accueillir au moins N passagers."""
    seats = car.seats or 5
    p = max(1, int(passengers))
    if seats >= p:
        if seats - p <= 1:
            return 100.0
        if seats - p <= 3:
            return 85.0
        return 72.0
    # Trop peu de places → pénalité
    delta = p - seats
    return float(max(0.0, 40.0 - delta * 14.0))


def _score_duration(car: CarRow, duration: int) -> float:
    """Léger biais pro-durée : voitures récentes pour longs trajets."""
    d = max(1, int(duration))
    bonus = 0.0
    if car.year and car.year >= 2022:
        bonus += 15.0
    if car.mileage is not None:
        bonus += 15.0 * _norm(car.mileage, 25000, 50000)
    base = 70.0
    if d >= 7:
        base += 5.0
    if d <= 2:
        base -= 3.0
    return min(100.0, base + bonus)


def _score_transmission(car: CarRow, wanted: str) -> float:
    if not wanted:
        return 100.0
    w = str(wanted).strip().upper()
    if w == "ANY":
        return 100.0
    actual = str(car.transmission or "").strip().upper()
    if actual == w:
        return 100.0
    # Pénalité si l'user veut l'automatique et on a manuel (plus dérangeant que l'inverse)
    if w == "AUTOMATIC" and actual == "MANUAL":
        return 25.0
    if w == "MANUAL" and actual == "AUTOMATIC":
        return 55.0
    return 70.0


def _score_rating(car: CarRow) -> float:
    r = max(0.0, min(5.0, float(car.rating_avg or 0.0)))
    return 100.0 * (r / 5.0) if r > 0 else 40.0  # 40% si pas d'avis


def _score_popularity(car: CarRow) -> float:
    n = int(car.reservation_count or 0)
    return float(min(100.0, 20.0 + 80.0 * (1.0 - math.exp(-n / 8.0))))


# ---------------------------------------------------------------------------
# Coeur du moteur
# ---------------------------------------------------------------------------

def content_score(car: CarRow, prefs: UserPrefs, weights: dict[str, float]) -> float:
    """Score hybride pondéré (brut), 0..100."""
    profile = _objective_profile(prefs)
    w = weights or _load_weights()

    parts = {
        "objective":    _score_objective(car, profile),
        "budget":       _score_budget(car, float(prefs.budget or 0)),
        "passengers":   _score_passengers(car, int(prefs.passengers or 4)),
        "duration":     _score_duration(car, int(prefs.duration or 3)),
        "transmission": _score_transmission(car, prefs.transmission or "ANY"),
        "rating":       _score_rating(car),
        "popularity":   _score_popularity(car),
    }
    total = sum(w.get(k, 0.0) for k in parts)
    if total <= 0:
        return 0.0
    return float(sum(v * w.get(k, 0.0) for k, v in parts.items()) / total)


def _build_highlights(car: CarRow, prefs: UserPrefs, scores: dict[str, float]) -> list[str]:
    """Retourne 2-3 points forts justifiant la recommandation."""
    res: list[str] = []
    p = _objective_profile(prefs)
    cat_norm = _normalize_category_name(car.category_name)
    cat_list = [_normalize_category_name(c) for c in p["categories"]]
    if cat_norm in cat_list:
        res.append(f"Parfaite pour un usage {prefs.objective.lower()}")
    if car.daily_rate and prefs.budget and car.daily_rate <= prefs.budget:
        eco_pct = max(0, round(100 - (car.daily_rate / prefs.budget * 100)))
        if eco_pct > 0:
            res.append(f"{eco_pct}% sous votre budget")
        else:
            res.append("À votre budget")
    if (car.seats or 0) >= (prefs.passengers or 0):
        res.append(f"{car.seats} places pour {prefs.passengers} passagers")
    want = (prefs.transmission or "ANY").upper()
    actual = (car.transmission or "").upper()
    if want != "ANY" and want == actual:
        res.append("Transmission préférée respectée")
    if car.rating_avg and car.rating_avg >= 4.0:
        res.append(f"Notée {car.rating_avg:.1f}/5 par les clients")
    if car.fuel_type and car.fuel_type.upper() in [f.upper() for f in p["fuel_pref"]]:
        res.append(f"Carburant adapté ({car.fuel_type.lower().capitalize()})")
    return res[:3]


# ---------------------------------------------------------------------------
# LightGBM — Inférence (si disponible)
# ---------------------------------------------------------------------------

FEATURE_COLUMNS: list[str] = [
    "objective_encoded", "budget", "daily_rate",
    "passengers", "seats", "seats_needed_gap",
    "duration", "transmission_match", "fuel_match",
    "category_match", "rating_avg", "popularity",
    "rate_budget_ratio",
]


def _encode_objective(obj: str) -> int:
    order = ["QUOTIDIEN", "FAMILLE", "PROFESSIONNEL", "AVENTURE", "CONFORT", "ECOLOGIQUE"]
    k = str(obj or "").strip().upper()
    return order.index(k) if k in order else 0


def _encode_transmission(car: CarRow, wanted: str) -> int:
    w = (wanted or "ANY").strip().upper()
    a = (car.transmission or "").strip().upper()
    if w == "ANY":
        return 2
    return 1 if w == a else 0


def _encode_fuel(car: CarRow, profile_fuel: list[str]) -> int:
    return 1 if (car.fuel_type or "").strip().upper() in [f.upper() for f in profile_fuel] else 0


def _encode_category(car: CarRow, profile_cats: list[str]) -> int:
    cat_norm = _normalize_category_name(car.category_name)
    cat_list = [_normalize_category_name(c) for c in profile_cats]
    return 1 if cat_norm in cat_list else 0


def car_to_feature_row(car: CarRow, prefs: UserPrefs) -> dict[str, Any]:
    profile = _objective_profile(prefs)
    return {
        "objective_encoded": _encode_objective(prefs.objective),
        "budget": float(prefs.budget or 0),
        "daily_rate": float(car.daily_rate or 0),
        "passengers": int(prefs.passengers or 0),
        "seats": int(car.seats or 0),
        "seats_needed_gap": int((car.seats or 0) - int(prefs.passengers or 0)),
        "duration": int(prefs.duration or 0),
        "transmission_match": _encode_transmission(car, prefs.transmission or "ANY"),
        "fuel_match": _encode_fuel(car, profile["fuel_pref"]),
        "category_match": _encode_category(car, profile["categories"]),
        "rating_avg": float(car.rating_avg or 0),
        "popularity": int(car.reservation_count or 0),
        "rate_budget_ratio": float(
            (car.daily_rate or 0) / max(float(prefs.budget or 0), 1e-6)
        ),
    }


def apply_lgbm_adjustment(
    df_features: pd.DataFrame, base_scores: np.ndarray
) -> np.ndarray:
    """Si un modèle LightGBM existe, on mélange 70% (base) + 30% (LGBM 0..100)."""
    if not LGBM_MODEL_PATH.exists():
        return base_scores
    try:
        model = _load_pickled(LGBM_MODEL_PATH, None)
        if model is None:
            return base_scores
        # S'assurer des colonnes
        missing = [c for c in FEATURE_COLUMNS if c not in df_features.columns]
        if missing:
            for c in missing:
                df_features[c] = 0
        X = df_features[FEATURE_COLUMNS].astype(float).fillna(0)
        preds = model.predict(X)
        # Supposons LGBM entraîné sur label [0..100]
        preds_clipped = np.clip(np.asarray(preds, dtype=float), 0.0, 100.0)
        blended = 0.70 * base_scores + 0.30 * preds_clipped
        return np.clip(blended, 0.0, 100.0)
    except Exception:
        return base_scores


# ---------------------------------------------------------------------------
# API publique
# ---------------------------------------------------------------------------

def recommend_cars(
    cars: list[dict[str, Any]],
    prefs_dict: dict[str, Any],
    top_k: int = 3,
) -> list[dict[str, Any]]:
    cars_objs = [CarRow(**c) for c in cars]
    prefs = UserPrefs(**prefs_dict)
    weights = _load_weights()

    # Filtrage éthique : on ne recommande que des voitures actives
    candidates = [c for c in cars_objs if getattr(c, "status", "AVAILABLE") not in {"REMOVED", "DELETED"}]

    if not candidates:
        return []

    base_scores = np.array([content_score(c, prefs, weights) for c in candidates], dtype=float)

    rows = [car_to_feature_row(c, prefs) for c in candidates]
    df = pd.DataFrame(rows)
    final_scores = apply_lgbm_adjustment(df, base_scores)

    results: list[RecoResult] = []
    for car, score in zip(candidates, final_scores):
        hl = _build_highlights(car, prefs, {})
        results.append(
            RecoResult(
                car_id=int(car.car_id),
                brand=car.brand or "",
                model=car.model or "",
                daily_rate=float(car.daily_rate or 0.0),
                match_score=round(float(score), 1),
                rating_avg=round(float(car.rating_avg or 0.0), 2),
                category_name=car.category_name or "",
                highlights=hl,
            )
        )

    results.sort(key=lambda r: (-r.match_score, r.daily_rate, -(r.rating_avg or 0)))
    top = results[: max(1, int(top_k))]
    return [asdict(r) for r in top]
