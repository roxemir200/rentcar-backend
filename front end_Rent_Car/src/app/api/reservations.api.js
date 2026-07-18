import { api } from "./axios";

export const reservationsAPI = {
  // CLIENT
  create: (data) => api.post("/reservations", data),
  getMyReservations: () => api.get("/reservations/my-reservations"),
  getById: (id) => api.get(`/reservations/${id}`),
  cancel: (id) => api.put(`/reservations/${id}/cancel`),

  // ADMIN
  getAll: () => api.get("/admin/reservations"),
  confirm: (id) => api.put(`/admin/reservations/${id}/confirm`),
  start: (id, data) => api.put(`/admin/reservations/${id}/start`, data),
  complete: (id, data) => api.put(`/admin/reservations/${id}/complete`, data),
};