// front end_Rent_Car\src\app\api\calendar.api.js
import { api } from "./axios";

export const calendarAPI = {
  /**
   * Récupérer les réservations pour un mois
   * @param {number} year - L'année
   * @param {number} month - Le mois (1-12)
   */
  getReservations: (year, month) => 
    api.get(`/admin/calendar/reservations?year=${year}&month=${month}`),
};