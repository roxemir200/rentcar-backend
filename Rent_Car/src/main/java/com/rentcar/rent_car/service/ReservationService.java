package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.CompleteReservationRequest;
import com.rentcar.rent_car.dto.request.ReservationRequest;
import com.rentcar.rent_car.dto.request.StartReservationRequest;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.dto.response.ReservationResponse;

import java.util.List;

public interface ReservationService {

    MessageResponse createReservation(ReservationRequest request, String clientEmail);

    List<ReservationResponse> getMyReservations(String clientEmail);

    ReservationResponse getReservationById(Long id);

    List<ReservationResponse> getAllReservations();

    MessageResponse cancelReservation(Long id, String userEmail);

    MessageResponse confirmReservation(Long id);

    MessageResponse startReservation(Long id, StartReservationRequest request);

    MessageResponse completeReservation(Long id, CompleteReservationRequest request);
}