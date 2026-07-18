package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.response.MessageResponse;

import java.util.List;

public interface CarImageService {

    MessageResponse addImageToCar(Long carId, String imageUrl, boolean isPrimary);

    List<String> getImagesByCarId(Long carId);

    String getPrimaryImageByCarId(Long carId);

    MessageResponse deleteImage(Long imageId);

    MessageResponse setPrimaryImage(Long imageId);
}