import { api } from "./axios";

export const carsAPI = {
  // Lire toutes les voitures actives (public)
  getAll: () => api.get("/cars"),

  // Voitures disponibles (public)
  getAvailable: () => api.get("/cars/available"),

  // Détail d'une voiture (public)
  getById: (id) => api.get(`/cars/${id}`),

  // Créer une voiture (admin)
  create: (data) => api.post("/admin/cars", data),

  // Modifier une voiture (admin)
  update: (id, data) => api.put(`/admin/cars/${id}`, data),

  // Supprimer une voiture (admin)
  delete: (id) => api.delete(`/admin/cars/${id}`),

  // Images
 // ✅ CORRECT
getImages: (carId) => api.get(`/cars/${carId}/images`),
getPrimaryImage: (carId) => api.get(`/cars/${carId}/primary-image`),
  addImage: (carId, data) => api.post(`/admin/cars/${carId}/images`, data),
  setPrimaryImage: (imageId) => api.put(`/admin/images/${imageId}/set-primary`),
  deleteImage: (imageId) => api.delete(`/admin/images/${imageId}`),
};