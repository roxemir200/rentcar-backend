package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Faq;
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
class FaqRepositoryTest {

    @Mock
    private FaqRepository faqRepository;

    private Faq faq;

    @BeforeEach
    void setUp() {
        faq = new Faq();
        faq.setId(1L);
        faq.setQuestion("Comment annuler une réservation ?");
        faq.setAnswer("Allez dans votre espace client et cliquez sur annuler.");
        faq.setCategory("RESERVATION");
        faq.setKeywords("annuler, reservation, remboursement");
    }

    @Test
    void shouldFindByQuestion() {
        when(faqRepository.findByQuestion("Comment annuler une réservation ?")).thenReturn(Optional.of(faq));

        Optional<Faq> found = faqRepository.findByQuestion("Comment annuler une réservation ?");

        assertThat(found).isPresent();
    }

    @Test
    void shouldExistsByQuestion() {
        when(faqRepository.existsByQuestion("Comment annuler une réservation ?")).thenReturn(true);

        boolean exists = faqRepository.existsByQuestion("Comment annuler une réservation ?");

        assertThat(exists).isTrue();
    }

    @Test
    void shouldSearchByKeyword() {
        when(faqRepository.searchByKeyword("annuler")).thenReturn(List.of(faq));

        List<Faq> results = faqRepository.searchByKeyword("annuler");

        assertThat(results).hasSize(1);
    }

    @Test
    void shouldFindByCategoryOrderByQuestionAsc() {
        when(faqRepository.findByCategoryOrderByQuestionAsc("RESERVATION")).thenReturn(List.of(faq));

        List<Faq> list = faqRepository.findByCategoryOrderByQuestionAsc("RESERVATION");

        assertThat(list).hasSize(1);
    }

    @Test
    void shouldFindBestMatch() {
        when(faqRepository.findBestMatch("Comment annuler")).thenReturn(List.of(faq));

        List<Faq> matches = faqRepository.findBestMatch("Comment annuler");

        assertThat(matches).hasSize(1);
    }
}
