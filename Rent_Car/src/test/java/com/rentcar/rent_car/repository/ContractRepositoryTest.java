package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.enums.ContractStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractRepositoryTest {

    @Mock
    private ContractRepository contractRepository;

    private Contract contract;

    @BeforeEach
    void setUp() {
        contract = new Contract();
        contract.setId(50L);
        contract.setContractNumber("CTR-2026-0001");
        contract.setStatus(ContractStatus.DRAFT);
    }

    @Test
    void shouldFindByReservationId() {
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));

        Optional<Contract> found = contractRepository.findByReservationId(100L);

        assertThat(found).isPresent();
        assertThat(found.get().getContractNumber()).isEqualTo("CTR-2026-0001");
    }

    @Test
    void shouldFindByContractNumber() {
        when(contractRepository.findByContractNumber("CTR-2026-0001")).thenReturn(Optional.of(contract));

        Optional<Contract> found = contractRepository.findByContractNumber("CTR-2026-0001");

        assertThat(found).isPresent();
    }

    @Test
    void shouldFindByStatus() {
        when(contractRepository.findByStatus(ContractStatus.DRAFT)).thenReturn(List.of(contract));

        List<Contract> draftContracts = contractRepository.findByStatus(ContractStatus.DRAFT);

        assertThat(draftContracts).hasSize(1);
    }

    @Test
    void shouldExistsByReservationId() {
        when(contractRepository.existsByReservationId(100L)).thenReturn(true);

        Boolean exists = contractRepository.existsByReservationId(100L);

        assertThat(exists).isTrue();
    }
}
