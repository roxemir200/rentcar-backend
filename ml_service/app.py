# -*- coding: utf-8 -*-
"""
RentCar — Service Flask ML
Expose les endpoints :
  POST /api/recommendations/cars       → Top 3 recommandations
  POST /api/recommendations/train      → Retrain le modèle
  GET  /api/recommendations/health     → Health check
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from recommender import BASE_DIR, recommend_cars, MODELS_DIR

load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

TRAIN_IN_PROGRESS = threading.Lock()
LAST_TRAIN_RESULT: dict[str, Any] | None = None


@app.get("/api/recommendations/health")
def health() -> Any:
    models_dir = MODELS_DIR
    files = sorted(p.name for p in models_dir.glob("*"))
    return jsonify({
        "status": "UP",
        "service": "rentcar-ml",
        "python": sys.version.split()[0],
        "models": files,
        "lastTrain": LAST_TRAIN_RESULT,
    })


def _required_int(data: dict, key: str, default: int | None = None) -> int | None:
    v = data.get(key, default)
    if v is None or v == "":
        return default
    try:
        return int(float(v))
    except Exception:
        return default


def _required_float(data: dict, key: str, default: float | None = None) -> float | None:
    v = data.get(key, default)
    if v is None or v == "":
        return default
    try:
        return float(v)
    except Exception:
        return default


@app.post("/api/recommendations/cars")
def recommend_endpoint() -> Any:
    payload = request.get_json(silent=True) or {}
    prefs_raw: dict = payload.get("preferences") or payload
    cars_raw: list[dict] = payload.get("cars") or payload.get("cars") or []
    top_k = int(payload.get("top_k") or 3)

    # --- Validation des préférences -----------------------------------------
    objective = str(prefs_raw.get("objective", "QUOTIDIEN")).strip().upper()
    allowed_obj = {"QUOTIDIEN", "FAMILLE", "PROFESSIONNEL", "AVENTURE", "CONFORT", "ECOLOGIQUE"}
    objective = objective if objective in allowed_obj else "QUOTIDIEN"

    budget = _required_float(prefs_raw, "budget", 60.0) or 60.0
    passengers = _required_int(prefs_raw, "passengers", 4) or 4
    duration = _required_int(prefs_raw, "duration", 3) or 3
    transmission = str(prefs_raw.get("transmission", "ANY")).strip().upper() or "ANY"
    if transmission not in {"AUTOMATIC", "MANUAL", "ANY"}:
        transmission = "ANY"

    if not isinstance(cars_raw, list) or len(cars_raw) == 0:
        return jsonify({
            "success": False,
            "error": "Aucune voiture fournie pour la recommandation",
            "data": [],
        }), 400

    # Mapping vers schéma attendu par recommender
    cars_cooked: list[dict] = []
    for c in cars_raw:
        if not isinstance(c, dict):
            continue
        cars_cooked.append({
            "car_id": int(c.get("id") or c.get("car_id") or 0),
            "brand": str(c.get("brand") or ""),
            "model": str(c.get("model") or ""),
            "daily_rate": float(c.get("dailyRate") or c.get("daily_rate") or c.get("pricePerDay") or 0.0),
            "seats": int(c.get("seats") or 5),
            "transmission": str(c.get("transmission") or "MANUAL").strip().upper(),
            "fuel_type": str(c.get("fuelType") or c.get("fuel_type") or "GASOLINE").strip().upper(),
            "category_id": c.get("categoryId") or c.get("category_id"),
            "category_name": str(
                c.get("categoryName") or c.get("category") or c.get("category_name") or ""
            ),
            "status": str(c.get("status") or "AVAILABLE").strip().upper(),
            "rating_avg": float(c.get("ratingAvg") or c.get("rating_avg") or c.get("averageRating") or c.get("rating") or 0.0),
            "reservation_count": int(c.get("reservationCount") or c.get("reservation_count") or 0),
            "description": str(c.get("description") or ""),
            "year": c.get("year") if (c.get("year") is not None and c.get("year") != "") else None,
            "mileage": c.get("mileage") if (c.get("mileage") is not None and c.get("mileage") != "") else None,
        })

    prefs_cooked = {
        "objective": objective,
        "budget": float(budget),
        "passengers": int(max(1, min(7, passengers))),
        "duration": int(max(1, min(365, duration))),
        "transmission": transmission,
    }

    try:
        recommendations = recommend_cars(cars_cooked, prefs_cooked, top_k=top_k)
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": f"Erreur interne du moteur de recommandation : {exc}",
            "data": [],
        }), 500

    return jsonify({
        "success": True,
        "preferences": prefs_cooked,
        "meta": {
            "cars_scored": len(cars_cooked),
            "top_k": len(recommendations),
        },
        "data": recommendations,
    })


@app.post("/api/recommendations/train")
def train_endpoint() -> Any:
    global LAST_TRAIN_RESULT
    obtained = TRAIN_IN_PROGRESS.acquire(blocking=False)
    if not obtained:
        return jsonify({
            "success": False,
            "error": "Un entraînement est déjà en cours. Réessayez plus tard.",
        }), 409
    try:
        # On enregistre un payload optionnel fourni par Spring
        export: Path | None = None
        payload = request.get_json(silent=True) or {}
        if payload.get("cars") or payload.get("reservations"):
            MODELS_DIR.mkdir(exist_ok=True)
            export = MODELS_DIR / f"export_{uuid.uuid4().hex}.json"
            export.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

        def run_train(export_path: Path | None) -> None:
            global LAST_TRAIN_RESULT
            try:
                cmd = [sys.executable, str(BASE_DIR / "train.py")]
                if export_path:
                    cmd += ["--from-api", str(export_path)]
                result = subprocess.run(
                    cmd,
                    cwd=str(BASE_DIR),
                    capture_output=True,
                    text=True,
                    timeout=600,
                )
                # Parser le JSON final imprimé par train.py
                out = (result.stdout or "")
                last_json: dict = {}
                for line in out.splitlines():
                    line = line.strip()
                    if line.startswith("{") and line.endswith("}"):
                        try:
                            last_json = json.loads(line)
                        except Exception:
                            continue
                if not last_json:
                    last_json = {
                        "success": result.returncode == 0,
                        "returncode": result.returncode,
                        "stdout_tail": out[-800:],
                        "stderr_tail": (result.stderr or "")[-800:],
                    }
                LAST_TRAIN_RESULT = last_json
            except Exception as exc:
                LAST_TRAIN_RESULT = {"success": False, "error": str(exc)}
            finally:
                TRAIN_IN_PROGRESS.release()

        threading.Thread(target=run_train, args=(export,), daemon=True).start()
        return jsonify({
            "success": True,
            "started": True,
            "message": "Entraînement démarré en arrière-plan — consultez /health pour le statut.",
        })
    except Exception as exc:
        TRAIN_IN_PROGRESS.release()
        return jsonify({"success": False, "error": str(exc)}), 500


def main() -> None:
    port = int(os.getenv("ML_PORT", "5001"))
    debug = os.getenv("ML_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)


if __name__ == "__main__":
    main()
