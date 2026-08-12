package com.rentcar.rent_car.security;

import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

class UserDetailsImplTest {

    @Test
    void shouldBuildFromUser() {
        User user = new User();
        user.setId(10L);
        user.setEmail("user@test.com");
        user.setPassword("secret");
        user.setRole(Role.ADMIN);
        user.setIsActive(true);

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);

        assertThat(userDetails.getId()).isEqualTo(10L);
        assertThat(userDetails.getEmail()).isEqualTo("user@test.com");
        assertThat(userDetails.getPassword()).isEqualTo("secret");
        assertThat(userDetails.getUsername()).isEqualTo("user@test.com");
        assertThat(userDetails.getRole()).isEqualTo("ADMIN");
        assertThat(userDetails.isEnabled()).isTrue();
        assertThat(userDetails.isAccountNonExpired()).isTrue();
        assertThat(userDetails.isAccountNonLocked()).isTrue();
        assertThat(userDetails.isCredentialsNonExpired()).isTrue();

        Collection<? extends GrantedAuthority> authorities = userDetails.getAuthorities();
        assertThat(authorities).hasSize(1);
        assertThat(authorities.iterator().next().getAuthority()).isEqualTo("ROLE_ADMIN");
    }
}
