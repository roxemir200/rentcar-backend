package com.rentcar.rent_car.service.mail;

/** Signale qu'un email n'a pas pu être acheminé par le transport configuré. */
public class MailDeliveryException extends RuntimeException {

    public MailDeliveryException(String message) {
        super(message);
    }

    public MailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
