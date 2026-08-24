package com.rentcar.rent_car.controller;

import com.rentcar.rent_car.dto.request.WebVitalRequest;
import com.rentcar.rent_car.service.WebVitalsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class WebVitalsController {

    /** Au-dela, la requete est forgee : une page emet trois mesures. */
    private static final int LOT_MAX = 10;

    private final WebVitalsService webVitalsService;

    /**
     * Recoit les mesures d'experience percue relevees dans le navigateur.
     *
     * <p>Point d'entree volontairement PUBLIC et en ecriture : les visiteurs
     * dont on mesure l'experience ne sont, par definition, pas authentifies.
     * C'est la seule route de ce type dans l'application, et elle est protegee
     * autrement — liste fermee de mesures, bornes de plausibilite, motifs de
     * route figes (voir WebVitalsServiceImpl).
     *
     * <p>Repond systematiquement 204, y compris lorsque des mesures sont
     * ecartees. Le navigateur n'a rien a faire de la reponse : il envoie sans
     * attendre, souvent au moment ou la page se ferme. Lui renvoyer une erreur
     * ne corrigerait rien et exposerait la logique de filtrage.
     */
    @PostMapping("/web-vitals")
    public ResponseEntity<Void> collect(@Valid @RequestBody List<WebVitalRequest> mesures) {
        if (mesures != null && mesures.size() <= LOT_MAX) {
            mesures.forEach(webVitalsService::record);
        }
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
