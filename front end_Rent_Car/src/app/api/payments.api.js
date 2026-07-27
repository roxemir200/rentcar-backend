import { api } from "./axios";

export const paymentsAPI = {
    // CLIENT
    create: (data) => api.post("/payments/create-intent", data),

    // AUTHENTIFIÉ
    getByReservation: (reservationId) => api.get(`/payments/reservation/${reservationId}`),
    getMyPayments: () => api.get("/payments/my-payments"),

    // ADMIN
    getAll: () => api.get("/admin/payments"),
    refund: (id) => api.post(`/admin/payments/${id}/refund`),
};