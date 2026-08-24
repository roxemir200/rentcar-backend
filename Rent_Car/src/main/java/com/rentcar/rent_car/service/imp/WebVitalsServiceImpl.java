package com.rentcar.rent_car.service.imp;

import com.rentcar.rent_car.dto.request.WebVitalRequest;
import com.rentcar.rent_car.service.WebVitalsService;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Transforme les mesures du navigateur en metriques exploitables.
 *
 * <p>Ce service est appele par un point d'entree PUBLIC, que n'importe qui
 * peut solliciter : les visiteurs ne sont pas authentifies. Tout ce qui entre
 * est donc traite comme hostile jusqu'a preuve du contraire, et rien n'est
 * enregistre qui ne figure dans une liste fermee.
 *
 * <p>La menace n'est pas tant la falsification des chiffres — qui ne
 * fausserait qu'un graphique — que <strong>l'explosion de cardinalite</strong> :
 * une etiquette dont les valeurs sont libres cree une serie temporelle par
 * valeur distincte. Quelques milliers d'appels forges suffiraient a saturer le
 * quota de la pile de supervision, et a faire disparaitre les metriques du
 * backend avec elles.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebVitalsServiceImpl implements WebVitalsService {

    /** Les trois seules mesures retenues, parce que ce sont les seules actionnables. */
    private static final Set<String> MESURES = Set.of("LCP", "INP", "CLS");

    /** Verdicts produits par la bibliotheque web-vitals. */
    private static final Set<String> VERDICTS = Set.of("good", "needs-improvement", "poor");

    /**
     * Bornes de plausibilite. Une page qui met plus de dix minutes a
     * s'afficher n'est pas une mesure, c'est un appel forge ou un onglet
     * laisse ouvert des heures.
     */
    private static final double VALEUR_MAX = 600_000d;

    /** Etiquette de repli, qui borne definitivement la cardinalite. */
    private static final String AUTRE = "autre";

    /**
     * Motifs de route, dans l'ordre d'evaluation.
     * <p>
     * Liste FERMEE : un chemin inconnu devient « autre ». C'est ce qui garantit
     * qu'aucune requete, meme malveillante, ne peut creer de nouvelle serie.
     */
    private static final List<Route> ROUTES = List.of(
            new Route(Pattern.compile("^/?$"), "/"),
            new Route(Pattern.compile("^/home/?$"), "/home"),
            new Route(Pattern.compile("^/cars/[^/]+/?$"), "/cars/:id"),
            new Route(Pattern.compile("^/cars/?$"), "/cars"),
            new Route(Pattern.compile("^/reservation/[^/]+/?$"), "/reservation/:id"),
            new Route(Pattern.compile("^/my-reservations/?$"), "/my-reservations"),
            new Route(Pattern.compile("^/payment/[^/]+/?$"), "/payment/:id"),
            new Route(Pattern.compile("^/payments/?$"), "/payments"),
            new Route(Pattern.compile("^/contract/[^/]+/?$"), "/contract/:id"),
            new Route(Pattern.compile("^/recommendations/?$"), "/recommendations"),
            new Route(Pattern.compile("^/login/?$"), "/login"),
            new Route(Pattern.compile("^/register/?$"), "/register"),
            new Route(Pattern.compile("^/profile/?$"), "/profile"),
            // Les ecrans d'administration sont regroupes : leur frequentation
            // est trop faible pour justifier une serie par page.
            new Route(Pattern.compile("^/admin(/.*)?$"), "/admin/*")
    );

    private final MeterRegistry meterRegistry;

    @Override
    public boolean record(WebVitalRequest mesure) {
        if (mesure == null || mesure.getValue() == null) {
            return false;
        }

        String nom = normaliser(mesure.getName());
        if (!MESURES.contains(nom)) {
            return false;
        }
        if (mesure.getRating() == null || !VERDICTS.contains(mesure.getRating())) {
            return false;
        }
        double valeur = mesure.getValue();
        if (valeur < 0 || valeur > VALEUR_MAX || Double.isNaN(valeur)) {
            return false;
        }

        // Compteur plutot que distribution : c'est la repartition
        // good / needs-improvement / poor qui est la lecture standard des Web
        // Vitals, et elle tient en neuf series par route au lieu de plusieurs
        // dizaines de compartiments d'histogramme.
        meterRegistry.counter("rentcar.web.vitals",
                "metric", nom.toLowerCase(),
                "rating", mesure.getRating(),
                "route", motifDeRoute(mesure.getPath())).increment();

        return true;
    }

    private static String normaliser(String nom) {
        return StringUtils.hasText(nom) ? nom.trim().toUpperCase() : "";
    }

    /** Ramene un chemin a l'un des motifs connus, ou a « autre ». */
    static String motifDeRoute(String chemin) {
        if (!StringUtils.hasText(chemin)) {
            return AUTRE;
        }
        // On ne garde que le chemin : une chaine de requete ou un fragment
        // reintroduiraient la cardinalite qu'on cherche precisement a borner.
        String propre = chemin.split("[?#]", 2)[0].trim();
        if (propre.length() > 120) {
            return AUTRE;
        }
        return ROUTES.stream()
                .filter(route -> route.motif.matcher(propre).matches())
                .map(route -> route.etiquette)
                .findFirst()
                .orElse(AUTRE);
    }

    private record Route(Pattern motif, String etiquette) {
    }
}
