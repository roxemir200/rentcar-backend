package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;

import java.util.List;

public interface ContractService {

    MessageResponse generateContract(Long reservationId);

    MessageResponse signContract(Long contractId, String clientEmail);

    ContractResponse getContractByReservation(Long reservationId);

    ContractResponse getContractById(Long contractId);

    List<ContractResponse> getAllContracts();
    MessageResponse cancelContract(Long contractId);
}