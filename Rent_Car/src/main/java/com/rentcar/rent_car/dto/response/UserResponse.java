package com.rentcar.rent_car.dto.response;

import com.rentcar.rent_car.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String address;
    private String drivingLicenseNumber;
    private Role role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}