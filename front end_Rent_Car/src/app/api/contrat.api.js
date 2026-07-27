import { api } from "./axios";

export const contractsAPI = {
  // CLIENT
  sign: (id) => api.put(`/contracts/${id}/sign`),
  getMy: () => api.get("/contracts/my"),

  // AUTHENTIFIÉ
  getByReservation: (reservationId) => api.get(`/contracts/reservation/${reservationId}`),
  getById: (id) => api.get(`/contracts/${id}`),

  // ADMIN
  getAll: () => api.get("/admin/contracts"),
  cancel: (id) => api.put(`/admin/contracts/${id}/cancel`),
};