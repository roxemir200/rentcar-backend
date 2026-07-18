package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.CarImage;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CarImageRepository extends JpaRepository<CarImage, Long> {

    List<CarImage> findByCarId(Long carId);

    Optional<CarImage> findByCarIdAndIsPrimaryTrue(Long carId);

    @Modifying
    @Transactional
    @Query("DELETE FROM CarImage c WHERE c.car.id = :carId")
    void deleteByCarId(@Param("carId") Long carId);
}