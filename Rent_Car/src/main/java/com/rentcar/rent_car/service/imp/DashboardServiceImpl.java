package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.dto.response.DashboardResponse;
import com.rentcar.rent_car.dto.response.RevenueResponse;
import com.rentcar.rent_car.dto.response.TopCarResponse;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final CarRepository carRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final PaymentRepository paymentRepository;

    @Override
    public DashboardResponse getDashboardStats() {

        // ========== VÉHICULES ==========
        long totalCars = carRepository.count();
        long availableCars = carRepository.findByStatus(CarStatus.AVAILABLE).size();
        long rentedCars = carRepository.findByStatus(CarStatus.RENTED).size();
        long reservedCars = carRepository.findByStatus(CarStatus.RESERVED).size();
        long maintenanceCars = carRepository.findByStatus(CarStatus.MAINTENANCE).size();

        // ========== RÉSERVATIONS ==========
        List<Reservation> allReservations = reservationRepository.findAll();
        long totalReservations = allReservations.size();
        long pendingReservations = countByStatus(allReservations, ReservationStatus.PENDING);
        long confirmedReservations = countByStatus(allReservations, ReservationStatus.CONFIRMED);
        long inProgressReservations = countByStatus(allReservations, ReservationStatus.IN_PROGRESS);
        long completedReservations = countByStatus(allReservations, ReservationStatus.COMPLETED);
        long cancelledReservations = countByStatus(allReservations, ReservationStatus.CANCELLED);

        // ========== CLIENTS ==========
        long totalClients = userRepository.count();
        long activeClients = userRepository.findByIsActiveTrue().size();

        // ========== REVENUS ==========
        BigDecimal totalRevenue = allReservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED ||
                        r.getStatus() == ReservationStatus.IN_PROGRESS)
                .map(Reservation::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate now = LocalDate.now();
        BigDecimal revenueThisMonth = allReservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED ||
                        r.getStatus() == ReservationStatus.IN_PROGRESS)
                .filter(r -> r.getCreatedAt() != null &&
                        r.getCreatedAt().getMonth() == now.getMonth() &&
                        r.getCreatedAt().getYear() == now.getYear())
                .map(Reservation::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ========== AVIS ==========
        Double averageRating = reviewRepository.findAll().stream()
                .mapToInt(r -> r.getRating())
                .average()
                .orElse(0.0);

        long totalReviews = reviewRepository.count();

        // ========== PAIEMENTS ==========
        long completedPayments = paymentRepository.findByStatus(PaymentStatus.COMPLETED).size();
        long pendingPayments = paymentRepository.findByStatus(PaymentStatus.PENDING).size();
        long refundedPayments = paymentRepository.findByStatus(PaymentStatus.REFUNDED).size();

        return DashboardResponse.builder()
                .totalCars(totalCars)
                .availableCars(availableCars)
                .rentedCars(rentedCars)
                .reservedCars(reservedCars)
                .maintenanceCars(maintenanceCars)
                .totalReservations(totalReservations)
                .pendingReservations(pendingReservations)
                .confirmedReservations(confirmedReservations)
                .inProgressReservations(inProgressReservations)
                .completedReservations(completedReservations)
                .cancelledReservations(cancelledReservations)
                .totalClients(totalClients)
                .activeClients(activeClients)
                .totalRevenue(totalRevenue)
                .revenueThisMonth(revenueThisMonth)
                .averageRating(Math.round(averageRating * 10.0) / 10.0)
                .totalReviews(totalReviews)
                .completedPayments(completedPayments)
                .pendingPayments(pendingPayments)
                .refundedPayments(refundedPayments)
                .build();
    }

    @Override
    public List<RevenueResponse> getRevenueByYear(int year) {
        List<Reservation> reservations = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED ||
                        r.getStatus() == ReservationStatus.IN_PROGRESS)
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().getYear() == year)
                .toList();

        Map<Month, BigDecimal> revenueByMonth = new LinkedHashMap<>();
        Map<Month, Long> countByMonth = new LinkedHashMap<>();

        for (Month month : Month.values()) {
            revenueByMonth.put(month, BigDecimal.ZERO);
            countByMonth.put(month, 0L);
        }

        for (Reservation r : reservations) {
            Month month = r.getCreatedAt().getMonth();
            revenueByMonth.merge(month, r.getTotalAmount() != null ? r.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
            countByMonth.merge(month, 1L, Long::sum);
        }

        List<RevenueResponse> result = new ArrayList<>();
        for (Month month : Month.values()) {
            result.add(RevenueResponse.builder()
                    .year(year)
                    .month(month.getValue())
                    .monthName(month.getDisplayName(TextStyle.FULL, Locale.FRENCH))
                    .amount(revenueByMonth.get(month))
                    .reservationCount(countByMonth.get(month))
                    .build());
        }

        return result;
    }

    @Override
    public List<TopCarResponse> getTopCars(int limit) {
        List<Reservation> completedReservations = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.COMPLETED ||
                        r.getStatus() == ReservationStatus.IN_PROGRESS)
                .toList();

        Map<Long, List<Reservation>> byCar = completedReservations.stream()
                .collect(Collectors.groupingBy(r -> r.getCar().getId()));

        return byCar.entrySet().stream()
                .map(entry -> {
                    List<Reservation> carReservations = entry.getValue();
                    BigDecimal revenue = carReservations.stream()
                            .map(Reservation::getTotalAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    Double avgRating = reviewRepository.findByCarId(entry.getKey()).stream()
                            .mapToInt(r -> r.getRating())
                            .average()
                            .orElse(0.0);

                    String imageUrl = carReservations.get(0).getCar().getImages() != null &&
                            !carReservations.get(0).getCar().getImages().isEmpty()
                            ? carReservations.get(0).getCar().getImages().get(0).getImageUrl()
                            : null;

                    return TopCarResponse.builder()
                            .carId(entry.getKey())
                            .brand(carReservations.get(0).getCar().getBrand())
                            .model(carReservations.get(0).getCar().getModel())
                            .registrationNumber(carReservations.get(0).getCar().getRegistrationNumber())
                            .imageUrl(imageUrl)
                            .reservationCount((long) carReservations.size())
                            .totalRevenue(revenue)
                            .averageRating(Math.round(avgRating * 10.0) / 10.0)
                            .build();
                })
                .sorted((a, b) -> b.getReservationCount().compareTo(a.getReservationCount()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    private long countByStatus(List<Reservation> reservations, ReservationStatus status) {
        return reservations.stream().filter(r -> r.getStatus() == status).count();
    }
}