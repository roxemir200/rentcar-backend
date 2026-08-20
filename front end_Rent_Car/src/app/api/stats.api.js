// front end_Rent_Car\src\app\api\stats.api.js

import { api } from "./axios";

export const statsAPI = {
  /**
   * Chiffres affichés aux visiteurs, connectés ou non.
   * GET /api/public/stats
   *
   * Endpoint public : l'accueil et les pages d'authentification s'affichent
   * avant tout compte.
   */
  getPublic: () => api.get("/public/stats"),
};
