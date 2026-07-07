package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.enums.CarStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.Transmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CarRepository extends JpaRepository<Car, Long> {

    // Trouver par statut
    List<Car> findByStatus(CarStatus status);

    // Trouver par catégorie
    List<Car> findByCategoryId(Long categoryId);

    // Trouver par marque
    List<Car> findByBrandIgnoreCase(String brand);

    // Trouver par type de carburant
    List<Car> findByFuelType(FuelType fuelType);

    // Trouver par type de transmission
    List<Car> findByTransmission(Transmission transmission);

    // Trouver par fourchette de prix
    List<Car> findByDailyRateBetween(BigDecimal min, BigDecimal max);

    // Trouver les voitures actives
    List<Car> findByIsActiveTrue();

    // Recherche avancée avec filtres
    @Query("SELECT c FROM Car c WHERE " +
            "(:brand IS NULL OR LOWER(c.brand) LIKE LOWER(CONCAT('%', :brand, '%'))) AND " +
            "(:fuelType IS NULL OR c.fuelType = :fuelType) AND " +
            "(:transmission IS NULL OR c.transmission = :transmission) AND " +
            "(:minPrice IS NULL OR c.dailyRate >= :minPrice) AND " +
            "(:maxPrice IS NULL OR c.dailyRate <= :maxPrice) AND " +
            "(:status IS NULL OR c.status = :status) AND " +
            "c.isActive = true")
    List<Car> searchCars(@Param("brand") String brand,
                         @Param("fuelType") FuelType fuelType,
                         @Param("transmission") Transmission transmission,
                         @Param("minPrice") BigDecimal minPrice,
                         @Param("maxPrice") BigDecimal maxPrice,
                         @Param("status") CarStatus status);
}