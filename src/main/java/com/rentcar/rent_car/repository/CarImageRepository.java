package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.CarImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CarImageRepository extends JpaRepository<CarImage, Long> {

    List<CarImage> findByCarId(Long carId);

    Optional<CarImage> findByCarIdAndIsPrimaryTrue(Long carId);

    void deleteByCarId(Long carId);
}