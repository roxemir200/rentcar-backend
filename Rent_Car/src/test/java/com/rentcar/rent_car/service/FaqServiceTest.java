package com.rentcar.rent_car.service;

import com.rentcar.rent_car.entity.Faq;
import com.rentcar.rent_car.repository.FaqRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaqServiceTest {

    @Mock
    private FaqRepository faqRepository;

    @InjectMocks
    private FaqService faqService;

    private Faq faq;

    @BeforeEach
    void setUp() {
        faq = new Faq();
        faq.setId(1L);
        faq.setQuestion("Comment louer une voiture ?");
        faq.setAnswer("Choisissez une voiture et validez votre réservation.");
    }

    @Test
    void shouldFindBestAnswerByExactMatch() {
        when(faqRepository.findBestMatch("Comment louer une voiture ?")).thenReturn(List.of(faq));

        Optional<Faq> match = faqService.findBestAnswer("Comment louer une voiture ?");

        assertThat(match).isPresent();
        assertThat(match.get().getAnswer()).isEqualTo("Choisissez une voiture et validez votre réservation.");
    }

    @Test
    void shouldFindBestAnswerByKeywordFallback() {
        when(faqRepository.findBestMatch("Puis-je louer rapidement ?")).thenReturn(Collections.emptyList());
        when(faqRepository.searchByKeyword(anyString())).thenReturn(List.of(faq));

        Optional<String> answer = faqService.getAnswer("Puis-je louer rapidement ?");

        assertThat(answer).isPresent();
        assertThat(answer.get()).contains("Choisissez une voiture");
    }

    @Test
    void shouldReturnEmptyWhenNoMatchFound() {
        when(faqRepository.findBestMatch("Unknown question")).thenReturn(Collections.emptyList());

        Optional<Faq> match = faqService.findBestAnswer("Unknown question");

        assertThat(match).isEmpty();
    }

    @Test
    void shouldAddFaq() {
        when(faqRepository.save(faq)).thenReturn(faq);

        Faq result = faqService.addFaq(faq);

        assertThat(result).isNotNull();
        verify(faqRepository).save(faq);
    }

    @Test
    void shouldGetAllFaqs() {
        when(faqRepository.findAll()).thenReturn(List.of(faq));

        List<Faq> faqs = faqService.getAllFaqs();

        assertThat(faqs).hasSize(1);
    }
}
