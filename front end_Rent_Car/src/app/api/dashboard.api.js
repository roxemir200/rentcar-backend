// front end_Rent_Car\src\app\api\dashboard.api.js

import { api } from "./axios";

export const dashboardAPI = {
  /**
   * Récupérer les statistiques globales du dashboard
   * GET /api/admin/dashboard
   */
  getStats: () => api.get("/admin/dashboard"),

  /**
   * Récupérer les revenus par mois pour une année
   * GET /api/admin/dashboard/revenue?year=2026
   * @param {number} year - L'année (défaut: 2026)
   */
  getRevenue: (year = 2026) => api.get(`/admin/dashboard/revenue?year=${year}`),

  /**
   * Récupérer le Top N des voitures les plus louées
   * GET /api/admin/dashboard/top-cars?limit=5
   * @param {number} limit - Nombre de voitures (défaut: 5)
   */
  getTopCars: (limit = 5) => api.get(`/admin/dashboard/top-cars?limit=${limit}`),
};