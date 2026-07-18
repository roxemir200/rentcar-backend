import { api } from "./axios";

export const categoriesAPI = {
  // Lire toutes les catégories (public)
  getAll: () => api.get("/categories"),

  // Lire une catégorie (public)
  getById: (id) => api.get(`/categories/${id}`),

  // Créer une catégorie (admin)
  create: (data) => api.post("/categories", data),

  // Modifier une catégorie (admin)
  update: (id, data) => api.put(`/categories/${id}`, data),

  // Supprimer une catégorie (admin)
  delete: (id) => api.delete(`/categories/${id}`),
};