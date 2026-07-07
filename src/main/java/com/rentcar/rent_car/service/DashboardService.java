package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.DashboardResponse;
import com.rentcar.rent_car.dto.response.RevenueResponse;
import com.rentcar.rent_car.dto.response.TopCarResponse;

import java.util.List;

public interface DashboardService {

    DashboardResponse getDashboardStats();

    List<RevenueResponse> getRevenueByYear(int year);

    List<TopCarResponse> getTopCars(int limit);
}