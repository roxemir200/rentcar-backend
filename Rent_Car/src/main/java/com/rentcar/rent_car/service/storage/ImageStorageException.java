package com.rentcar.rent_car.service.storage;

/** Signale qu'une image n'a pas pu etre enregistree par le stockage configure. */
public class ImageStorageException extends RuntimeException {

    public ImageStorageException(String message) {
        super(message);
    }

    public ImageStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
