package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.CarImage;
import com.rentcar.rent_car.repository.CarImageRepository;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.service.CarImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CarImageServiceImpl implements CarImageService {

    private final CarImageRepository carImageRepository;
    private final CarRepository carRepository;

    @Override
    @Transactional
    public MessageResponse addImageToCar(Long carId, String imageUrl, boolean isPrimary) {
        Car car = carRepository.findById(carId)
                .orElseThrow(() -> new RuntimeException("Voiture non trouvée"));

        // Si cette image est primaire, désactiver les autres
        if (isPrimary) {
            carImageRepository.findByCarIdAndIsPrimaryTrue(carId)
                    .ifPresent(existingPrimary -> {
                        existingPrimary.setIsPrimary(false);
                        carImageRepository.save(existingPrimary);
                    });
        }

        // Créer la nouvelle image
        CarImage image = new CarImage();
        image.setImageUrl(imageUrl);
        image.setIsPrimary(isPrimary);
        image.setCar(car);
        carImageRepository.save(image);

        return MessageResponse.success("Image ajoutée avec succès");
    }

    @Override
    public List<String> getImagesByCarId(Long carId) {
        return carImageRepository.findByCarId(carId)
                .stream()
                .map(CarImage::getImageUrl)
                .collect(Collectors.toList());
    }

    @Override
    public String getPrimaryImageByCarId(Long carId) {
        return carImageRepository.findByCarIdAndIsPrimaryTrue(carId)
                .map(CarImage::getImageUrl)
                .orElseGet(() -> carImageRepository.findByCarId(carId)
                        .stream()
                        .findFirst()
                        .map(CarImage::getImageUrl)
                        .orElse(null));
    }

    @Override
    public MessageResponse deleteImage(Long imageId) {
        if (!carImageRepository.existsById(imageId)) {
            return MessageResponse.error("Image non trouvée");
        }
        carImageRepository.deleteById(imageId);
        return MessageResponse.success("Image supprimée avec succès");
    }

    @Override
    @Transactional
    public MessageResponse setPrimaryImage(Long imageId) {
        CarImage image = carImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image non trouvée"));

        // Désactiver l'ancienne image primaire
        carImageRepository.findByCarIdAndIsPrimaryTrue(image.getCar().getId())
                .ifPresent(oldPrimary -> {
                    oldPrimary.setIsPrimary(false);
                    carImageRepository.save(oldPrimary);
                });

        // Activer la nouvelle image primaire
        image.setIsPrimary(true);
        carImageRepository.save(image);

        return MessageResponse.success("Image primaire définie avec succès");
    }
}