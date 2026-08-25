package com.rentcar.rent_car.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rentcar.rent_car.dto.request.WebVitalRequest;
import com.rentcar.rent_car.service.WebVitalsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class WebVitalsController {

    /** Au-dela, la requete est forgee : une page emet trois mesures. */
    private static final int LOT_MAX = 10;

    /** Dix mesures pesent moins de 2 Ko. Au-dela, on ne cherche meme pas a lire. */
    private static final int TAILLE_MAX = 8_192;

    private final WebVitalsService webVitalsService;
    private final ObjectMapper objectMapper;

    /**
     * Recoit les mesures d'experience percue relevees dans le navigateur.
     *
     * <p>Point d'entree volontairement PUBLIC et en ecriture : les visiteurs
     * dont on mesure l'experience ne sont, par definition, pas authentifies.
     * C'est la seule route de ce type dans l'application, et elle est protegee
     * autrement — liste fermee de mesures, bornes de plausibilite, motifs de
     * route figes (voir WebVitalsServiceImpl).
     *
     * <p><strong>Accepte text/plain autant qu'application/json.</strong> Le
     * navigateur envoie ces mesures avec {@code navigator.sendBeacon}, la seule
     * API qui survive a la destruction de la page. Or sendBeacon ne sait pas
     * mener un preflight CORS : il impose donc un type de contenu « simple »,
     * dont application/json ne fait pas partie. Le corps reste du JSON ; seul
     * l'en-tete change.
     *
     * <p>Le corps est recu en texte brut et analyse ici, plutot que confie a
     * la deserialisation automatique : cela evite qu'un contenu malforme
     * produise une 400 bruyante pour un appel dont personne n'attend la
     * reponse.
     *
     * <p>Repond systematiquement 204, y compris lorsque des mesures sont
     * ecartees. Le navigateur n'a rien a faire de la reponse : il envoie sans
     * attendre, souvent au moment ou la page se ferme. Lui renvoyer une erreur
     * ne corrigerait rien et exposerait la logique de filtrage.
     */
    @PostMapping(value = "/web-vitals",
            consumes = { MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_PLAIN_VALUE })
    public ResponseEntity<Void> collect(@RequestBody(required = false) String corps) {
        int retenues = lire(corps);
        if (retenues > 0) {
            log.debug("Web Vitals : {} mesure(s) retenue(s)", retenues);
        }
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    /**
     * Analyse le corps et enregistre ce qui est exploitable.
     *
     * @return le nombre de mesures retenues
     */
    private int lire(String corps) {
        if (corps == null || corps.isBlank() || corps.length() > TAILLE_MAX) {
            return 0;
        }
        try {
            List<WebVitalRequest> mesures =
                    objectMapper.readValue(corps, new TypeReference<List<WebVitalRequest>>() { });
            if (mesures == null || mesures.size() > LOT_MAX) {
                return 0;
            }
            int retenues = 0;
            for (WebVitalRequest mesure : mesures) {
                if (webVitalsService.record(mesure)) {
                    retenues++;
                }
            }
            return retenues;
        } catch (Exception e) {
            // Corps illisible : on l'ignore. Un point d'entree public recoit
            // aussi des robots ; leur repondre en detail ne servirait qu'a
            // les renseigner.
            log.debug("Web Vitals : corps illisible, ignore");
            return 0;
        }
    }
}
