package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    Optional<Contract> findByReservationId(Long reservationId);

    Optional<Contract> findByContractNumber(String contractNumber);

    List<Contract> findByStatus(ContractStatus status);

    Boolean existsByReservationId(Long reservationId);
}