import { api } from "./axios";

export const usersAPI = {
  getAll: () => api.get("/admin/users"),
  getById: (id) => api.get(`/users/${id}`),
  getMyProfile: () => api.get("/users/me"),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
  getSupport: () => api.get("/users/support"),
};