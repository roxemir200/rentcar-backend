package com.rentcar.rent_car.service;

import com.rentcar.rent_car.dto.request.WebVitalRequest;

public interface WebVitalsService {

    /**
     * Enregistre une mesure venue du navigateur, si elle est exploitable.
     *
     * @return {@code true} si la mesure a ete retenue, {@code false} si elle
     *         a ete ecartee (nom inconnu, verdict inconnu, valeur aberrante)
     */
    boolean record(WebVitalRequest mesure);
}
