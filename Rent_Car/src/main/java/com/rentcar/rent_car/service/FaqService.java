package com.rentcar.rent_car.service;

import com.rentcar.rent_car.entity.Faq;
import com.rentcar.rent_car.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FaqService {

    private final FaqRepository faqRepository;

    public Optional<Faq> findBestAnswer(String question) {
        List<Faq> exactMatches = faqRepository.findBestMatch(question);
        
        if (!exactMatches.isEmpty()) {
            return Optional.of(exactMatches.get(0));
        }

        String[] words = question.split(" ");
        for (String word : words) {
            if (word.length() > 3) {
                List<Faq> keywordMatches = faqRepository.searchByKeyword(word);
                if (!keywordMatches.isEmpty()) {
                    return Optional.of(keywordMatches.get(0));
                }
            }
        }

        return Optional.empty();
    }

    public Optional<String> getAnswer(String question) {
        return findBestAnswer(question).map(Faq::getAnswer);
    }

    public Faq addFaq(Faq faq) {
        return faqRepository.save(faq);
    }

    public List<Faq> getAllFaqs() {
        return faqRepository.findAll();
    }
}
