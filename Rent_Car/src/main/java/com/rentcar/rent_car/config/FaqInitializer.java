package com.rentcar.rent_car.config;

import com.rentcar.rent_car.entity.Faq;
import com.rentcar.rent_car.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class FaqInitializer implements CommandLineRunner {
    private final FaqRepository faqRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        List<Faq> initialFaqs = List.of(
                new Faq(null, "Comment réserver une voiture ?", "Pour réserver une voiture, connectez-vous à votre compte, choisissez une voiture disponible, sélectionnez les dates et cliquez sur \"Réserver\".", "Réservation", "réserver, réservation, voiture, location"),
                new Faq(null, "Quels sont vos tarifs ?", "Nos tarifs varient selon le modèle de voiture et la durée de location. Consultez les prix sur la page de chaque voiture.", "Paiement", "tarifs, prix, coût, paiement"),
                new Faq(null, "Puis-je annuler ma réservation ?", "Oui, vous pouvez annuler votre réservation jusqu'à 24h avant le début de la location sans frais.", "Annulation", "annuler, annulation, réservation"),
                new Faq(null, "Quelle assurance est incluse ?", "Une assurance responsabilité civile est incluse. Des options supplémentaires sont disponibles.", "Assurance", "assurance, couverture, responsabilité"),
                new Faq(null, "Que faire en cas d'accident ?", "En cas d'accident, contactez immédiatement notre service d'assistance au +216 XX XXX XXX.", "Urgence", "accident, urgence, assistance"),
                new Faq(null, "Puis-je modifier ma réservation ?", "Oui, vous pouvez modifier votre réservation jusqu'à 48h avant le début de la location.", "Réservation", "modifier, changement, réservation"),
                new Faq(null, "Documents nécessaires ?", "Vous avez besoin d'une carte d'identité ou passeport, d'un permis de conduire valide et d'une carte bancaire.", "Documents", "documents, permis, carte d'identité"),
                new Faq(null, "Location longue durée ?", "Oui, nous proposons des locations longue durée. Contactez-nous pour un devis personnalisé.", "Location", "longue durée, location, mois")
        );

        for (Faq faq : initialFaqs) {
            if (!faqRepository.existsByQuestion(faq.getQuestion())) {
                faqRepository.save(faq);
            }
        }
    }
}