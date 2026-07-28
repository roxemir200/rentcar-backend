package com.rentcar.rent_car.service.imp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rentcar.rent_car.config.MlServiceConfig;
import com.rentcar.rent_car.dto.request.CarRecommendationRequest;
import com.rentcar.rent_car.dto.response.CarRecommendationResponse;
import com.rentcar.rent_car.dto.response.CarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.service.CarService;
import com.rentcar.rent_car.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationServiceImpl implements RecommendationService {

    @Qualifier("mlRestClient")
    private final RestClient mlRestClient;
    private final MlServiceConfig mlConfig;
    private final CarService carService;
    private final CarRepository carRepository;
    private final ReviewRepository reviewRepository;
    private final ReservationRepository reservationRepository;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .findAndRegisterModules()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static final Map<String, Map<String, Object>> OBJECTIVE_PROFILES = Map.of(
            "QUOTIDIEN",        profile(List.of("ECONOMIQUE"),               List.of(FuelType.GASOLINE, FuelType.HYBRID, FuelType.ELECTRIC), 5, List.of("ville", "citadine", "economique", "quotidien")),
            "FAMILLE",          profile(List.of("SUV / SPACIEUX", "BERLINE / CONFORT"), List.of(FuelType.DIESEL, FuelType.HYBRID, FuelType.GASOLINE), 7, List.of("famille", "spacieux", "voyage", "enfant")),
            "PROFESSIONNEL",    profile(List.of("BERLINE / CONFORT", "SUV / SPACIEUX"), List.of(FuelType.DIESEL, FuelType.HYBRID), 5, List.of("professionnel", "confort", "prestige", "business")),
            "AVENTURE",         profile(List.of("SUV / SPACIEUX"),           List.of(FuelType.DIESEL, FuelType.HYBRID, FuelType.GASOLINE), 5, List.of("aventure", "tout chemin", "robuste", "voyage")),
            "CONFORT",          profile(List.of("BERLINE / CONFORT", "SUV / SPACIEUX"), List.of(FuelType.HYBRID, FuelType.ELECTRIC, FuelType.DIESEL), 5, List.of("confort", "luxe", "premium", "berline")),
            "ECOLOGIQUE",       profile(List.of("ECONOMIQUE", "BERLINE / CONFORT"), List.of(FuelType.ELECTRIC, FuelType.HYBRID), 5, List.of("hybride", "electrique", "eco", "verte"))
    );

    private static final Map<String, Double> DEFAULT_WEIGHTS = Map.of(
            "objective", 26.0, "budget", 22.0, "passengers", 18.0,
            "duration", 6.0, "transmission", 12.0, "rating", 9.0, "popularity", 7.0
    );

    private static final AtomicBoolean RETRAIN_RUNNING = new AtomicBoolean(false);

    private static Map<String, Object> profile(List<String> categories, List<FuelType> fuelPref, int seatIdeal, List<String> keywords) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("categories", categories);
        m.put("fuel_pref", fuelPref);
        m.put("seat_ideal", seatIdeal);
        m.put("keywords", keywords);
        return m;
    }

    @Override
    public CarRecommendationResponse recommendCars(CarRecommendationRequest req) {
        String objective = req.getObjective() == null ? "QUOTIDIEN" : req.getObjective().trim().toUpperCase(Locale.ROOT);
        if (!OBJECTIVE_PROFILES.containsKey(objective)) objective = "QUOTIDIEN";
        String transmission = req.getTransmission() == null ? "ANY" : req.getTransmission().trim().toUpperCase(Locale.ROOT);
        if (!List.of("AUTOMATIC", "MANUAL", "ANY").contains(transmission)) transmission = "ANY";
        int passengers = req.getPassengers() == null ? 4 : Math.max(1, Math.min(7, req.getPassengers()));
        int duration = req.getDuration() == null ? 3 : Math.max(1, Math.min(365, req.getDuration()));
        BigDecimal budget = req.getBudget() == null ? BigDecimal.valueOf(60) : req.getBudget();
        int topK = req.getTopK() == null ? 3 : Math.max(1, Math.min(20, req.getTopK()));

        final String finalObjective = objective;
        final String finalTransmission = transmission;
        final int finalPassengers = passengers;
        final int finalDuration = duration;
        final BigDecimal finalBudget = budget;
        final int finalTopK = topK;

        var prefsDTO = CarRecommendationResponse.CarRecommendationRequestDTO.builder()
                .objective(finalObjective)
                .budget(finalBudget)
                .passengers(finalPassengers)
                .duration(finalDuration)
                .transmission(finalTransmission)
                .build();

        List<EnrichedCar> cars = loadEnrichedCars();
        if (cars.isEmpty()) {
            return CarRecommendationResponse.builder()
                    .success(false)
                    .error("Aucune voiture active disponible pour la recommandation")
                    .preferences(prefsDTO)
                    .meta(CarRecommendationResponse.Meta.builder()
                            .carsScored(0).topK(0)
                            .fallbackUsed(false).mlServiceStatus("N/A")
                            .build())
                    .data(List.of())
                    .build();
        }

        List<Map<String, Object>> payload = cars.stream().map(this::toPayloadMap).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("preferences", Map.of(
                "objective", finalObjective,
                "budget", finalBudget,
                "passengers", finalPassengers,
                "duration", finalDuration,
                "transmission", finalTransmission
        ));
        body.put("cars", payload);
        body.put("top_k", finalTopK);

        List<CarRecommendationResponse.CarRecommendationItem> data;
        boolean fallback = false;
        String mlStatus = "UNAVAILABLE";
        try {
            JsonNode response = mlRestClient.post()
                    .uri("/api/recommendations/cars")
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response != null && response.path("success").asBoolean(false)) {
                data = mapMlResponse(response, cars);
                mlStatus = "OK";
            } else {
                String err = response == null ? "Réponse vide du service ML" : response.path("error").asText("Erreur ML inconnue");
                log.warn("[RECO] Service ML a répondu en erreur : {} — utilisation du fallback", err);
                data = runFallback(cars, finalObjective, finalBudget, finalPassengers, finalDuration, finalTransmission, finalTopK);
                fallback = true;
                mlStatus = "ERROR :: " + err;
            }
        } catch (RestClientResponseException rex) {
            log.warn("[RECO] HTTP {} du service ML : {} — fallback activé", rex.getStatusCode().value(), rex.getMessage());
            data = runFallback(cars, finalObjective, finalBudget, finalPassengers, finalDuration, finalTransmission, finalTopK);
            fallback = true;
            mlStatus = "HTTP " + rex.getStatusCode().value();
        } catch (Exception ex) {
            log.warn("[RECO] Service ML indisponible ({}). Fallback content-based activé.", ex.getMessage());
            data = runFallback(cars, finalObjective, finalBudget, finalPassengers, finalDuration, finalTransmission, finalTopK);
            fallback = true;
            mlStatus = ex.getClass().getSimpleName() + " :: " + ex.getMessage();
        }

        return CarRecommendationResponse.builder()
                .success(true)
                .preferences(prefsDTO)
                .meta(CarRecommendationResponse.Meta.builder()
                        .carsScored(cars.size())
                        .topK(data.size())
                        .fallbackUsed(fallback)
                        .mlServiceStatus(mlStatus)
                        .build())
                .data(data)
                .build();
    }

    @Override
    @Async
    public CompletableFuture<Boolean> triggerRetrainAsync() {
        if (!RETRAIN_RUNNING.compareAndSet(false, true)) {
            return CompletableFuture.completedFuture(false);
        }
        try {
            Map<String, Object> body = buildExportForTrain();
            mlRestClient.post()
                    .uri("/api/recommendations/train")
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("[RECO] Re-entraînement ML demandé avec succès.");
            return CompletableFuture.completedFuture(true);
        } catch (Exception ex) {
            log.warn("[RECO] Impossible de déclencher le re-train ML : {}", ex.getMessage());
            return CompletableFuture.completedFuture(false);
        } finally {
            RETRAIN_RUNNING.set(false);
        }
    }

    // =========================================================================
    // Internes
    // =========================================================================

    private Map<String, Object> buildExportForTrain() {
        List<Car> cars = carRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                .toList();
        List<Map<String, Object>> carsOut = new ArrayList<>();
        for (Car c : cars) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("car_id", c.getId());
            m.put("brand", c.getBrand());
            m.put("model", c.getModel());
            m.put("daily_rate", c.getDailyRate());
            m.put("seats", c.getSeats());
            m.put("transmission", c.getTransmission() == null ? "MANUAL" : c.getTransmission().name());
            m.put("fuel_type", c.getFuelType() == null ? "GASOLINE" : c.getFuelType().name());
            m.put("category_id", c.getCategory() == null ? null : c.getCategory().getId());
            m.put("category_name", c.getCategory() == null ? "" : c.getCategory().getName());
            m.put("status", c.getStatus() == null ? "AVAILABLE" : c.getStatus().name());
            m.put("year", c.getYear());
            m.put("mileage", c.getMileage());
            m.put("description", c.getDescription());
            carsOut.add(m);
        }
        List<Reservation> reservations = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED
                        || r.getStatus() == ReservationStatus.IN_PROGRESS
                        || r.getStatus() == ReservationStatus.CONFIRMED)
                .toList();
        List<Map<String, Object>> resaOut = new ArrayList<>();
        for (Reservation r : reservations) {
            LocalDate sd = r.getStartDate();
            LocalDate ed = r.getEndDate();
            long dur = (sd == null || ed == null) ? 3 : Math.max(1L, Duration.between(sd.atStartOfDay(), ed.atStartOfDay()).toDays());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("car_id", r.getCar() == null ? null : r.getCar().getId());
            m.put("daily_rate", r.getPricePerDaySnapshot());
            m.put("duration_days", dur);
            m.put("status", r.getStatus() == null ? null : r.getStatus().name());
            resaOut.add(m);
        }
        Map<String, Object> export = new LinkedHashMap<>();
        export.put("cars", carsOut);
        export.put("reservations", resaOut);
        return export;
    }

    private Map<String, Object> toPayloadMap(EnrichedCar c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("car_id", c.id);
        m.put("brand", c.brand);
        m.put("model", c.model);
        m.put("daily_rate", c.dailyRate);
        m.put("seats", c.seats);
        m.put("transmission", c.transmission);
        m.put("fuel_type", c.fuelType);
        m.put("category_id", c.categoryId);
        m.put("category_name", c.categoryName);
        m.put("status", c.status);
        m.put("rating_avg", c.ratingAvg);
        m.put("reservation_count", c.reservationCount);
        m.put("description", c.description);
        m.put("year", c.year);
        m.put("mileage", c.mileage);
        return m;
    }

    private List<CarRecommendationResponse.CarRecommendationItem> mapMlResponse(JsonNode json, List<EnrichedCar> cars) {
        Map<Long, EnrichedCar> carIndex = cars.stream().collect(Collectors.toMap(c -> c.id, c -> c));
        List<CarRecommendationResponse.CarRecommendationItem> out = new ArrayList<>();
        JsonNode data = json.path("data");
        if (!data.isArray()) return List.of();
        for (JsonNode node : data) {
            long carId = node.path("car_id").asLong();
            double matchScore = round1(node.path("match_score").asDouble(0.0));
            List<String> highlights = new ArrayList<>();
            JsonNode hl = node.path("highlights");
            if (hl.isArray()) for (JsonNode h : hl) highlights.add(h.asText());
            EnrichedCar c = carIndex.get(carId);
            String category = node.path("category_name").asText("");
            String brand = node.path("brand").asText("");
            String model = node.path("model").asText("");
            BigDecimal dailyRate = node.has("daily_rate")
                    ? new BigDecimal(node.path("daily_rate").asText("0")).setScale(2, RoundingMode.HALF_UP)
                    : (c == null ? BigDecimal.ZERO : c.dailyRate);
            double ratingAvg = node.path("rating_avg").asDouble(c != null ? c.ratingAvg : 0.0);
            if (c != null) {
                category = c.categoryName;
                brand = c.brand;
                model = c.model;
                dailyRate = c.dailyRate;
                ratingAvg = c.ratingAvg;
                if (highlights.isEmpty()) highlights = buildHighlights(c,
                        json.path("preferences").path("objective").asText("QUOTIDIEN"),
                        json.path("preferences").path("budget").asDouble(0),
                        json.path("preferences").path("passengers").asInt(4),
                        json.path("preferences").path("transmission").asText("ANY"));
            }
            out.add(CarRecommendationResponse.CarRecommendationItem.builder()
                    .carId(carId).brand(brand).model(model)
                    .dailyRate(dailyRate)
                    .matchScore(matchScore)
                    .ratingAvg(round2(ratingAvg))
                    .categoryName(category)
                    .highlights(highlights)
                    .build());
        }
        return out;
    }

    // =========================================================================
    // Fallback content-based (JAVA implémentation identique au moteur Python)
    // =========================================================================

    private List<CarRecommendationResponse.CarRecommendationItem> runFallback(
            List<EnrichedCar> cars, String objective, BigDecimal budget, int passengers,
            int duration, String transmission, int topK) {
        Map<String, Object> profile = OBJECTIVE_PROFILES.getOrDefault(objective, OBJECTIVE_PROFILES.get("QUOTIDIEN"));
        List<String> hlCats = castList(profile.get("categories"), String.class);
        List<FuelType> hlFuels = castListFuel(profile.get("fuel_pref"));
        int seatIdeal = (int) profile.getOrDefault("seat_ideal", 5);

        List<CarRecommendationResponse.CarRecommendationItem> scored = new ArrayList<>();
        for (EnrichedCar c : cars) {
            double sObjective = scoreObjective(c, profile);
            double sBudget = scoreBudget(c.dailyRate.doubleValue(), budget.doubleValue());
            double sPassengers = scorePassengers(c.seats, passengers);
            double sDuration = scoreDuration(c, duration);
            double sTransmission = scoreTransmission(c.transmission, transmission);
            double sRating = scoreRating(c.ratingAvg);
            double sPopularity = scorePopularity(c.reservationCount);

            double totalW = 0.0;
            double total = 0.0;
            totalW += DEFAULT_WEIGHTS.get("objective");       total += sObjective       * DEFAULT_WEIGHTS.get("objective");
            totalW += DEFAULT_WEIGHTS.get("budget");          total += sBudget          * DEFAULT_WEIGHTS.get("budget");
            totalW += DEFAULT_WEIGHTS.get("passengers");      total += sPassengers      * DEFAULT_WEIGHTS.get("passengers");
            totalW += DEFAULT_WEIGHTS.get("duration");        total += sDuration        * DEFAULT_WEIGHTS.get("duration");
            totalW += DEFAULT_WEIGHTS.get("transmission");    total += sTransmission    * DEFAULT_WEIGHTS.get("transmission");
            totalW += DEFAULT_WEIGHTS.get("rating");          total += sRating          * DEFAULT_WEIGHTS.get("rating");
            totalW += DEFAULT_WEIGHTS.get("popularity");      total += sPopularity      * DEFAULT_WEIGHTS.get("popularity");
            double score = totalW > 0 ? total / totalW : 0.0;

            List<String> highlights = buildHighlights(c, objective, budget.doubleValue(), passengers, transmission);
            scored.add(CarRecommendationResponse.CarRecommendationItem.builder()
                    .carId(c.id).brand(c.brand).model(c.model).dailyRate(c.dailyRate)
                    .matchScore(round1(score)).ratingAvg(round2(c.ratingAvg)).categoryName(c.categoryName)
                    .highlights(highlights).build());
        }

        scored.sort(Comparator.comparingDouble((CarRecommendationResponse.CarRecommendationItem a) -> a.getMatchScore())
                .reversed()
                .thenComparing(a -> a.getDailyRate())
                .thenComparing(a -> -a.getRatingAvg()));
        return scored.stream().limit(topK).toList();
    }

    // ---------------- Scoring helpers --------------------------------------

    private static double gaussian(double x, double center, double sigma) {
        double d = (x - center) / sigma;
        return Math.exp(-0.5 * d * d);
    }

    private static String normalizeCategory(String name) {
        if (name == null || name.isBlank()) return "";
        String n = name.trim().toUpperCase(Locale.ROOT);
        if (n.contains("ECONO")) return "ECONOMIQUE";
        if (n.contains("BERLINE") || n.contains("CONFORT")) return "BERLINE / CONFORT";
        if (n.contains("SUV") || n.contains("SPACIEUX")) return "SUV / SPACIEUX";
        return n;
    }

    private static double scoreObjective(EnrichedCar c, Map<String, Object> profile) {
        double score = 0;
        String carCat = normalizeCategory(c.categoryName);
        @SuppressWarnings("unchecked")
        List<String> profileCats = ((List<String>) profile.getOrDefault("categories", List.of())).stream()
                .map(RecommendationServiceImpl::normalizeCategory).toList();
        if (profileCats.contains(carCat)) score += 45.0;
        String carFuel = (c.fuelType == null ? "" : c.fuelType.trim().toUpperCase(Locale.ROOT));
        @SuppressWarnings("unchecked")
        List<FuelType> pref = (List<FuelType>) profile.getOrDefault("fuel_pref", List.of());
        if (pref.stream().anyMatch(f -> f.name().equalsIgnoreCase(carFuel))) score += 25.0;
        if (c.description != null && !c.description.isBlank()) {
            String desc = c.description.toLowerCase(Locale.ROOT);
            @SuppressWarnings("unchecked")
            List<String> kw = (List<String>) profile.getOrDefault("keywords", List.of());
            int n = (int) kw.stream().filter(k -> desc.contains(k.toLowerCase(Locale.ROOT))).count();
            score += Math.min(15.0, 3.0 * n);
        }
        int ideal = (int) profile.getOrDefault("seat_ideal", 5);
        score += 15.0 * gaussian(c.seats == null ? 5 : c.seats, ideal, 2.0);
        return score;
    }

    private static double scoreBudget(double dailyRate, double budget) {
        if (budget <= 0) return 50.0;
        if (dailyRate <= 0) return 0.0;
        if (dailyRate > budget * 1.1) {
            double over = (dailyRate - budget * 1.1) / budget;
            return Math.max(0.0, 30.0 * Math.exp(-3.0 * over));
        }
        if (dailyRate <= budget) {
            double center = 0.8 * budget;
            return 65.0 + 35.0 * gaussian(dailyRate, center, budget * 0.35);
        }
        return 55.0 * gaussian(dailyRate, budget, budget * 0.1);
    }

    private static double scorePassengers(Integer seats, int wanted) {
        int s = seats == null ? 5 : seats;
        int p = Math.max(1, wanted);
        if (s >= p) {
            if (s - p <= 1) return 100.0;
            if (s - p <= 3) return 85.0;
            return 72.0;
        }
        int delta = p - s;
        return Math.max(0.0, 40.0 - delta * 14.0);
    }

    private static double scoreDuration(EnrichedCar c, int duration) {
        int d = Math.max(1, duration);
        double bonus = 0;
        if (c.year != null && c.year >= 2022) bonus += 15.0;
        if (c.mileage != null) bonus += 15.0 * gaussian(c.mileage, 25000, 50000);
        double base = 70.0;
        if (d >= 7) base += 5.0;
        if (d <= 2) base -= 3.0;
        return Math.min(100.0, base + bonus);
    }

    private static double scoreTransmission(String carTransmission, String wanted) {
        if (wanted == null) return 100.0;
        String w = wanted.trim().toUpperCase(Locale.ROOT);
        if (w.equals("ANY")) return 100.0;
        String actual = (carTransmission == null ? "" : carTransmission).trim().toUpperCase(Locale.ROOT);
        if (actual.equals(w)) return 100.0;
        if (w.equals("AUTOMATIC") && actual.equals("MANUAL")) return 25.0;
        if (w.equals("MANUAL") && actual.equals("AUTOMATIC")) return 55.0;
        return 70.0;
    }

    private static double scoreRating(double rating) {
        double r = Math.max(0.0, Math.min(5.0, rating));
        return r > 0 ? 100.0 * (r / 5.0) : 40.0;
    }

    private static double scorePopularity(int count) {
        double n = Math.max(0, count);
        return Math.min(100.0, 20.0 + 80.0 * (1.0 - Math.exp(-n / 8.0)));
    }

    private static List<String> buildHighlights(EnrichedCar c, String objective, double budget, int passengers, String wantedTx) {
        List<String> res = new ArrayList<>();
        Map<String, Object> p = OBJECTIVE_PROFILES.getOrDefault(objective, OBJECTIVE_PROFILES.get("QUOTIDIEN"));
        @SuppressWarnings("unchecked")
        List<String> profileCats = ((List<String>) p.getOrDefault("categories", List.of())).stream()
                .map(RecommendationServiceImpl::normalizeCategory).toList();
        String carCat = normalizeCategory(c.categoryName);
        if (profileCats.contains(carCat)) {
            String first = objective.charAt(0) + objective.substring(1).toLowerCase(Locale.ROOT);
            res.add("Parfaite pour un usage " + first);
        }
        if (budget > 0 && c.dailyRate.doubleValue() > 0 && c.dailyRate.doubleValue() <= budget) {
            int eco = Math.max(0, (int) Math.round(100.0 - (c.dailyRate.doubleValue() / budget * 100.0)));
            if (eco > 0) res.add(eco + "% sous votre budget");
            else res.add("À votre budget");
        }
        int s = c.seats == null ? 5 : c.seats;
        if (s >= passengers) res.add(s + " places pour " + passengers + " passagers");
        String w = (wantedTx == null ? "" : wantedTx).trim().toUpperCase(Locale.ROOT);
        String actual = (c.transmission == null ? "" : c.transmission).trim().toUpperCase(Locale.ROOT);
        if (!"ANY".equals(w) && actual.equals(w)) res.add("Transmission préférée respectée");
        if (c.ratingAvg >= 4.0) res.add("Notée " + String.format(Locale.US, "%.1f", c.ratingAvg) + "/5 par les clients");
        String fuel = (c.fuelType == null ? "" : c.fuelType).trim().toUpperCase(Locale.ROOT);
        @SuppressWarnings("unchecked")
        List<FuelType> pf = (List<FuelType>) p.getOrDefault("fuel_pref", List.of());
        if (pf.stream().anyMatch(f -> f.name().equalsIgnoreCase(fuel))) {
            String french = switch (fuel) {
                case "GASOLINE" -> "Essence";
                case "DIESEL" -> "Diesel";
                case "HYBRID" -> "Hybride";
                case "ELECTRIC" -> "Électrique";
                default -> fuel;
            };
            res.add("Carburant adapté (" + french + ")");
        }
        return res.stream().limit(3).toList();
    }

    // =========================================================================
    // EnrichedCar + loaders
    // =========================================================================

    @SuppressWarnings("unchecked")
    private static <T> List<T> castList(Object o, Class<T> ignored) {
        if (o instanceof List<?> list) return (List<T>) list;
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<FuelType> castListFuel(Object o) {
        if (o instanceof List<?> list) {
            List<FuelType> res = new ArrayList<>();
            for (Object x : list) if (x instanceof FuelType f) res.add(f);
            return res;
        }
        return List.of();
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private List<EnrichedCar> loadEnrichedCars() {
        // Use CarService so we get images + category correctly mapped
        List<CarResponse> responses = carService.getAllCars();
        Map<Long, Integer> reservationCounts = new HashMap<>();
        Map<Long, Double> ratingMap = new HashMap<>();
        for (CarResponse c : responses) {
            Long id = c.getId();
            List<Reservation> rl = reservationRepository.findByCarId(id);
            reservationCounts.put(id, (int) rl.stream()
                    .filter(r -> r.getStatus() != ReservationStatus.CANCELLED)
                    .count());
            List<Review> rv = reviewRepository.findByCarId(id);
            ratingMap.put(id, rv.isEmpty() ? 0.0 : rv.stream().mapToDouble(Review::getRating).average().orElse(0.0));
        }
        List<EnrichedCar> out = new ArrayList<>();
        for (CarResponse c : responses) {
            if (Boolean.FALSE.equals(c.getIsActive())) continue;
            EnrichedCar ec = new EnrichedCar();
            ec.id = c.getId();
            ec.brand = c.getBrand() == null ? "" : c.getBrand();
            ec.model = c.getModel() == null ? "" : c.getModel();
            ec.dailyRate = c.getDailyRate() == null ? BigDecimal.ZERO : c.getDailyRate();
            ec.seats = c.getSeats() == null ? 5 : c.getSeats();
            ec.transmission = c.getTransmission() == null ? "MANUAL" : c.getTransmission().name();
            ec.fuelType = c.getFuelType() == null ? "GASOLINE" : c.getFuelType().name();
            ec.categoryId = c.getCategoryId();
            ec.categoryName = c.getCategoryName() == null ? "" : c.getCategoryName();
            ec.status = c.getStatus() == null ? "AVAILABLE" : c.getStatus().name();
            ec.ratingAvg = ratingMap.getOrDefault(c.getId(), 0.0);
            if (c.getAverageRating() != null && c.getAverageRating() > 0) ec.ratingAvg = c.getAverageRating();
            ec.reservationCount = reservationCounts.getOrDefault(c.getId(), 0);
            ec.description = c.getDescription() == null ? "" : c.getDescription();
            ec.year = c.getYear();
            ec.mileage = c.getMileage();
            out.add(ec);
        }
        return out;
    }

    private static final class EnrichedCar {
        Long id;
        String brand = "";
        String model = "";
        BigDecimal dailyRate = BigDecimal.ZERO;
        Integer seats = 5;
        String transmission = "MANUAL";
        String fuelType = "GASOLINE";
        Long categoryId;
        String categoryName = "";
        String status = "AVAILABLE";
        Double ratingAvg = 0.0;
        Integer reservationCount = 0;
        String description = "";
        Integer year;
        Integer mileage;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof EnrichedCar ec)) return false;
            return Objects.equals(id, ec.id);
        }
        @Override
        public int hashCode() { return Objects.hash(id); }
    }
}
