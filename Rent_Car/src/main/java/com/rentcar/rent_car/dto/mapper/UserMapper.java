package com.rentcar.rent_car.dto.mapper;

import com.rentcar.rent_car.dto.request.RegisterRequest;
import com.rentcar.rent_car.dto.response.UserResponse;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    // Convertir RegisterRequest → User (Entity)
    public User toEntity(RegisterRequest request) {
        if (request == null) {
            return null;
        }
        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword()); // Sera hashé dans le service
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAddress(request.getAddress());
        user.setDrivingLicenseNumber(request.getDrivingLicenseNumber());
        user.setRole(Role.CLIENT); // Par défaut, un nouveau compte = CLIENT
        user.setIsActive(true);
        return user;
    }

    // Convertir User (Entity) → UserResponse (DTO)
    public UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .drivingLicenseNumber(user.getDrivingLicenseNumber())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}