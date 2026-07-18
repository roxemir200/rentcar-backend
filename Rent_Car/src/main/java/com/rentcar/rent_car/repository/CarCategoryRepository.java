package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.CarCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CarCategoryRepository extends JpaRepository<CarCategory, Long> {

    Optional<CarCategory> findByName(String name);

    Boolean existsByName(String name);
}