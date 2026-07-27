import { api } from "./axios";

export const reviewsAPI = {
  create: (data) => api.post("/reviews", data),
  getByCar: (carId) => api.get(`/reviews/car/${carId}`),
  getMyReviews: () => api.get("/reviews/my-reviews"),
  getAverageRating: (carId) => api.get(`/reviews/car/${carId}/average`),
};
