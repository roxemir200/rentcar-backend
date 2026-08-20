package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.dto.response.PublicStatsResponse;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.CarRepository;
import com.rentcar.rent_car.repository.ReviewRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.PublicStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicStatsServiceImpl implements PublicStatsService {

    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;

    @Override
    @Transactional(readOnly = true)
    public PublicStatsResponse getPublicStats() {
        Double average = reviewRepository.getAverageRating();

        PublicStatsResponse stats = PublicStatsResponse.builder()
                .vehicles(carRepository.count())
                .clients(userRepository.countByRole(Role.CLIENT))
                .reviews(reviewRepository.count())
                // Arrondi au dixieme : la moyenne brute vaut 4.333333333333333,
                // et l'affichage « 4.3★ » ne doit pas dependre du formatage
                // choisi par le navigateur.
                .averageRating(average == null ? null : Math.round(average * 10) / 10.0)
                .build();

        log.debug("Statistiques publiques : {}", stats);
        return stats;
    }
}
