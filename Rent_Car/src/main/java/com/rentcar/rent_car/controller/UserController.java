package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.mapper.UserMapper;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * Renvoie l'utilisateur support (le premier administrateur).
     * <p>
     * Renvoie un {@link UserResponse} et non l'entite {@code User}. Serialiser
     * l'entite posait deux problemes :
     * <ul>
     *   <li>une recursion infinie — {@code User.reservations} pointe vers
     *       {@code Reservation.client}, qui repointe vers l'utilisateur. La
     *       reponse echouait en « Document nesting depth (501) exceeds the
     *       maximum allowed » apres avoir deja commence a etre ecrite ;</li>
     *   <li>une fuite de donnees — l'entite porte le mot de passe hache, la
     *       liste des reservations et les jetons de reinitialisation.</li>
     * </ul>
     */
    @GetMapping("/support")
    public ResponseEntity<UserResponse> getSupportUser() {
        return userRepository.findByRole(Role.ADMIN)
                .stream()
                .findFirst()
                .map(userMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
