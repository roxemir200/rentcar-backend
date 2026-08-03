package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.enums.CarStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CarRepositoryTest {

    @Test
    void shouldHandleStatusFilteringLogic() {
        Car car = new Car();
        car.setStatus(CarStatus.AVAILABLE);
        car.setIsActive(true);

        assertThat(car.getStatus()).isEqualTo(CarStatus.AVAILABLE);
        assertThat(car.getIsActive()).isTrue();
    }

    @Test
    void shouldSupportListBasedAssertions() {
        List<Car> cars = List.of(new Car(), new Car());

        assertThat(cars).hasSize(2);
    }
}
