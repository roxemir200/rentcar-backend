package com.rentcar.rent_car.service.mail;

/**
 * Moyen d'acheminement d'un email, indépendant du contenu.
 * <p>
 * Cette abstraction existe pour une raison concrète : la plupart des
 * hébergeurs bloquent le trafic SMTP sortant (ports 25, 465 et 587) afin
 * de limiter les envois abusifs. Un envoi qui fonctionne parfaitement en
 * local échoue alors en production par expiration de délai, sans qu'aucune
 * erreur de configuration ne soit en cause.
 * <p>
 * Deux implémentations coexistent, choisies par {@code app.mail.transport} :
 * <ul>
 *   <li>{@link SmtpMailTransport} — SMTP classique, adapté au poste de
 *       développement ;</li>
 *   <li>{@link BrevoApiMailTransport} — API HTTP sur le port 443, qui n'est
 *       jamais filtré.</li>
 * </ul>
 */
public interface MailTransport {

    /**
     * Achemine un message en texte brut.
     *
     * @param to      adresse du destinataire
     * @param subject objet du message
     * @param text    corps du message, en texte brut
     * @throws MailDeliveryException si l'acheminement échoue
     */
    void send(String to, String subject, String text);
}
