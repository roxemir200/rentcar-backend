package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.mapper.ContractMapper;
import com.rentcar.rent_car.dto.response.ContractResponse;
import com.rentcar.rent_car.dto.response.MessageResponse;
import com.rentcar.rent_car.entity.Car;
import com.rentcar.rent_car.entity.Contract;
import com.rentcar.rent_car.entity.Reservation;
import com.rentcar.rent_car.entity.User;
import com.rentcar.rent_car.enums.ContractStatus;
import com.rentcar.rent_car.enums.FuelType;
import com.rentcar.rent_car.enums.ReservationStatus;
import com.rentcar.rent_car.enums.Role;
import com.rentcar.rent_car.enums.Transmission;
import com.rentcar.rent_car.repository.ContractRepository;
import com.rentcar.rent_car.repository.ReservationRepository;
import com.rentcar.rent_car.repository.UserRepository;
import com.rentcar.rent_car.service.imp.ContractServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private SseService sseService;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ContractMapper contractMapper;

    @InjectMocks
    private ContractServiceImpl contractService;

    private Reservation reservation;
    private User client;
    private User admin;
    private Car car;
    private Contract contract;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(1L);
        client.setEmail("client@test.com");
        client.setFirstName("John");
        client.setLastName("Doe");

        admin = new User();
        admin.setId(2L);
        admin.setRole(Role.ADMIN);

        car = new Car();
        car.setId(10L);
        car.setBrand("Audi");
        car.setModel("A4");
        car.setRegistrationNumber("AB-123-CD");
        car.setMileage(10000);
        car.setFuelType(FuelType.GASOLINE);
        car.setTransmission(Transmission.MANUAL);
        car.setSeats(5);

        reservation = new Reservation();
        reservation.setId(100L);
        reservation.setClient(client);
        reservation.setCar(car);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setStartDate(LocalDate.now());
        reservation.setEndDate(LocalDate.now().plusDays(3));
        reservation.setPricePerDaySnapshot(new BigDecimal("80"));
        reservation.setTotalAmount(new BigDecimal("240"));

        contract = new Contract();
        contract.setId(50L);
        contract.setContractNumber("CONT-20260812-1234");
        contract.setStatus(ContractStatus.DRAFT);
        contract.setReservation(reservation);
    }

    // --- GENERATE CONTRACT TESTS ---

    @Test
    void shouldGenerateContract_successfully() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.existsByReservationId(100L)).thenReturn(false);
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> i.getArgument(0));
        when(contractMapper.toResponse(any(Contract.class))).thenReturn(new ContractResponse());

        MessageResponse response = contractService.generateContract(100L);

        assertThat(response.isSuccess()).isTrue();
        verify(contractRepository).save(any(Contract.class));
    }

    @Test
    void shouldThrow_whenGenerateContractReservationNotFound() {
        when(reservationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.generateContract(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Réservation non trouvée");
    }

    @Test
    void shouldReturnError_whenGenerateContractReservationNotConfirmed() {
        reservation.setStatus(ReservationStatus.PENDING);
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));

        MessageResponse response = contractService.generateContract(100L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("doit être confirmée");
    }

    @Test
    void shouldReturnError_whenGenerateContractAlreadyExists() {
        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservation));
        when(contractRepository.existsByReservationId(100L)).thenReturn(true);

        MessageResponse response = contractService.generateContract(100L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("existe déjà");
    }

    // --- SIGN CONTRACT TESTS ---

    @Test
    void shouldSignContract_successfully() {
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(contractMapper.toResponse(contract)).thenReturn(new ContractResponse());

        MessageResponse response = contractService.signContract(50L, "client@test.com");

        assertThat(response.isSuccess()).isTrue();
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.SIGNED);
        assertThat(contract.getSignedAt()).isNotNull();

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getData();
        assertThat(data).containsKey("contract");
    }

    /**
     * La signature ne cree plus l'intention de paiement.
     * <p>
     * Elle le faisait dans une transaction REQUIRES_NEW qui relisait le
     * contrat en base avant que la signature n'y soit commitee : le statut lu
     * restait DRAFT et la creation echouait a chaque fois. La page de paiement
     * s'en charge desormais, une fois la signature bel et bien enregistree.
     */
    @Test
    void shouldSignContract_withoutCreatingPaymentIntent() {
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));
        when(userRepository.findByEmail("client@test.com")).thenReturn(Optional.of(client));
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));
        when(contractMapper.toResponse(contract)).thenReturn(new ContractResponse());

        MessageResponse response = contractService.signContract(50L, "client@test.com");

        assertThat(response.isSuccess()).isTrue();
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.SIGNED);
        verifyNoInteractions(paymentService);
    }

    @Test
    void shouldReturnError_whenSignContractAlreadySigned() {
        contract.setStatus(ContractStatus.SIGNED);
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));

        MessageResponse response = contractService.signContract(50L, "client@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà signé");
    }

    @Test
    void shouldReturnError_whenSignContractCancelled() {
        contract.setStatus(ContractStatus.CANCELLED);
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));

        MessageResponse response = contractService.signContract(50L, "client@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("annulé");
    }

    @Test
    void shouldReturnError_whenSignContractNotAuthorized() {
        User unauthorizedUser = new User();
        unauthorizedUser.setId(99L);
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));
        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(unauthorizedUser));

        MessageResponse response = contractService.signContract(50L, "other@test.com");

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("pas autorisé");
    }

    // --- GET CONTRACT TESTS ---

    @Test
    void shouldGetContractByReservation() {
        when(contractRepository.findByReservationId(100L)).thenReturn(Optional.of(contract));
        when(contractMapper.toResponse(contract)).thenReturn(new ContractResponse());

        ContractResponse response = contractService.getContractByReservation(100L);

        assertThat(response).isNotNull();
    }

    @Test
    void shouldThrow_whenGetContractByReservationNotFound() {
        when(contractRepository.findByReservationId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.getContractByReservation(999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Aucun contrat trouvé");
    }

    @Test
    void shouldGetContractById() {
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));
        when(contractMapper.toResponse(contract)).thenReturn(new ContractResponse());

        ContractResponse response = contractService.getContractById(50L);

        assertThat(response).isNotNull();
    }

    @Test
    void shouldGetAllContracts() {
        when(contractRepository.findAll()).thenReturn(List.of(contract));
        when(contractMapper.toResponse(contract)).thenReturn(new ContractResponse());

        List<ContractResponse> response = contractService.getAllContracts();

        assertThat(response).hasSize(1);
    }

    // --- CANCEL CONTRACT TESTS ---

    @Test
    void shouldCancelContract_successfully() {
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));

        MessageResponse response = contractService.cancelContract(50L);

        assertThat(response.isSuccess()).isTrue();
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.CANCELLED);
        verify(sseService).createAndSend(eq(1L), anyString(), anyString(), anyString());
    }

    @Test
    void shouldReturnError_whenCancelContractAlreadyCancelled() {
        contract.setStatus(ContractStatus.CANCELLED);
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));

        MessageResponse response = contractService.cancelContract(50L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("déjà annulé");
    }

    @Test
    void shouldReturnError_whenCancelSignedContractWithRentalInProgress() {
        contract.setStatus(ContractStatus.SIGNED);
        reservation.setStatus(ReservationStatus.IN_PROGRESS);
        when(contractRepository.findById(50L)).thenReturn(Optional.of(contract));

        MessageResponse response = contractService.cancelContract(50L);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("en cours ou terminée");
    }
}
