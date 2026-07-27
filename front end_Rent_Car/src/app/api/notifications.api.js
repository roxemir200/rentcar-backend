import { api } from "./axios";

export const notificationsAPI = {
  getMyNotifications: () => api.get("/notifications"),
  getUnreadNotifications: () => api.get("/notifications/unread"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};
