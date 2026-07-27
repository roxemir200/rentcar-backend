package com.rentcar.rent_car.repository;

import com.rentcar.rent_car.entity.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {

    Optional<Faq> findByQuestion(String question);

    boolean existsByQuestion(String question);

    @Query("SELECT f FROM Faq f WHERE " +
            "LOWER(f.question) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(f.keywords) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Faq> searchByKeyword(@Param("keyword") String keyword);

    List<Faq> findByCategoryOrderByQuestionAsc(String category);

    @Query("SELECT f FROM Faq f WHERE " +
            "LOWER(f.question) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "ORDER BY " +
            "CASE WHEN LOWER(f.question) = LOWER(:query) THEN 1 " +
            "     WHEN LOWER(f.question) LIKE LOWER(CONCAT(:query, '%')) THEN 2 " +
            "     ELSE 3 END")
    List<Faq> findBestMatch(@Param("query") String query);
}
