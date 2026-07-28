import { api } from "./axios";

export const recommendationsAPI = {
  /**
   * POST /api/recommendations/cars
   * @param {{objective: string, budget: number, passengers: number, duration: number, transmission?: string, topK?: number}} payload
   */
  getCarRecommendations: (payload) =>
    api.post("/recommendations/cars", {
      objective: payload.objective,
      budget: payload.budget,
      passengers: payload.passengers,
      duration: payload.duration,
      transmission: payload.transmission ?? "ANY",
      topK: payload.topK ?? 3,
    }),
};
