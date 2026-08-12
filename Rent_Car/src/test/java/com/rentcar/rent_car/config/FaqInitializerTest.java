package com.rentcar.rent_car.config;

import com.rentcar.rent_car.entity.Faq;
import com.rentcar.rent_car.repository.FaqRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaqInitializerTest {

    @Mock
    private FaqRepository faqRepository;

    @InjectMocks
    private FaqInitializer faqInitializer;

    @Test
    void shouldInitializeFaqs() throws Exception {
        when(faqRepository.existsByQuestion(anyString())).thenReturn(false);

        faqInitializer.run();

        verify(faqRepository, atLeastOnce()).save(any(Faq.class));
    }
}
