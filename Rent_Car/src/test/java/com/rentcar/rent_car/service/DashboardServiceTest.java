package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.DashboardResponse;
import com.rentcar.rent_car.dto.response.RevenueResponse;
import com.rentcar.rent_car.dto.response.TopCarResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.entity.Payment;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.Review;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.PaymentStatus;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.PaymentRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.DashboardServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private CarRepository carRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private Car car;
    private Reservation reservation;
    private Review review;
    private Payment payment;

    @BeforeEach
    void setUp() {
        car = new Car();
        car.setId(10L);
        car.setBrand("Mercedes");
        car.setModel("C-Class");
        car.setStatus(CarStatus.AVAILABLE);

        CarImage image = new CarImage();
        image.setImageUrl("merc.jpg");
        car.setImages(List.of(image));

        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setCar(car);
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setTotalAmount(new BigDecimal("300"));
        reservation.setCreatedAt(LocalDateTime.now());

        review = new Review();
        review.setRating(5);

        payment = new Payment();
        payment.setStatus(PaymentStatus.COMPLETED);
    }

    @Test
    void shouldGetDashboardStats() {
        when(carRepository.count()).thenReturn(10L);
        when(carRepository.findByStatus(CarStatus.AVAILABLE)).thenReturn(List.of(car));
        when(carRepository.findByStatus(CarStatus.RENTED)).thenReturn(List.of());
        when(carRepository.findByStatus(CarStatus.RESERVED)).thenReturn(List.of());
        when(carRepository.findByStatus(CarStatus.MAINTENANCE)).thenReturn(List.of());

        when(reservationRepository.findAll()).thenReturn(List.of(reservation));
        when(userRepository.count()).thenReturn(5L);
        when(userRepository.findByIsActiveTrue()).thenReturn(List.of(new User()));

        when(reviewRepository.findAll()).thenReturn(List.of(review));
        when(reviewRepository.count()).thenReturn(1L);

        when(paymentRepository.findByStatus(PaymentStatus.COMPLETED)).thenReturn(List.of(payment));
        when(paymentRepository.findByStatus(PaymentStatus.PENDING)).thenReturn(List.of());
        when(paymentRepository.findByStatus(PaymentStatus.REFUNDED)).thenReturn(List.of());

        DashboardResponse stats = dashboardService.getDashboardStats();

        assertThat(stats.getTotalCars()).isEqualTo(10L);
        assertThat(stats.getAvailableCars()).isEqualTo(1L);
        assertThat(stats.getTotalReservations()).isEqualTo(1L);
        assertThat(stats.getTotalRevenue()).isEqualTo(new BigDecimal("300"));
        assertThat(stats.getAverageRating()).isEqualTo(5.0);
    }

    @Test
    void shouldGetRevenueByYear() {
        int year = 2026;
        when(reservationRepository.findAll()).thenReturn(List.of(reservation));

        List<RevenueResponse> revenue = dashboardService.getRevenueByYear(year);

        assertThat(revenue).hasSize(12); // 12 months
        RevenueResponse currentMonthStats = revenue.stream()
                .filter(r -> r.getMonth() == LocalDateTime.now().getMonthValue())
                .findFirst()
                .orElse(null);

        assertThat(currentMonthStats).isNotNull();
        assertThat(currentMonthStats.getAmount()).isEqualTo(new BigDecimal("300"));
        assertThat(currentMonthStats.getReservationCount()).isEqualTo(1L);
    }

    @Test
    void shouldGetTopCars() {
        when(reservationRepository.findAll()).thenReturn(List.of(reservation));
        when(reviewRepository.findByCarId(10L)).thenReturn(List.of(review));

        List<TopCarResponse> topCars = dashboardService.getTopCars(5);

        assertThat(topCars).hasSize(1);
        TopCarResponse topCar = topCars.get(0);
        assertThat(topCar.getCarId()).isEqualTo(10L);
        assertThat(topCar.getBrand()).isEqualTo("Mercedes");
        assertThat(topCar.getReservationCount()).isEqualTo(1L);
        assertThat(topCar.getTotalRevenue()).isEqualTo(new BigDecimal("300"));
    }
}
