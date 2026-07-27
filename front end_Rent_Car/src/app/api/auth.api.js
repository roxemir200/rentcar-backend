// front end_Rent_Car\src\app\api\auth.api.js

import { api } from "./axios";

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return payload.data ?? payload;
  }
  return payload;
};

const unwrapMessage = (response) => {
  return response?.data;
};

export const toFrontendUser = (payload) => {
  if (!payload) return null;

  return {
    id: String(payload.id ?? ""),
    firstName: payload.firstName ?? "",
    lastName: payload.lastName ?? "",
    email: payload.email ?? "",
    password: payload.password ?? "",
    phone: payload.phoneNumber ?? payload.phone ?? undefined,
    address: payload.address ?? undefined,
    licenseNumber: payload.drivingLicenseNumber ?? payload.licenseNumber ?? undefined,
    role: payload.role ?? "CLIENT",
    active: payload.isActive ?? payload.active ?? true,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  };
};

export const authAPI = {
  /**
   * Inscription d'un nouvel utilisateur
   * POST /api/auth/register
   */
  async register(data) {
    const response = await api.post("/auth/register", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    });

    return unwrapMessage(response);
  },

  /**
   * Connexion utilisateur
   * POST /api/auth/login
   * Retourne le token JWT
   */
  async login(data) {
    const response = await api.post("/auth/login", {
      email: data.email,
      password: data.password,
    });

    return unwrapData(response);
  },

  /**
   * Récupérer le profil de l'utilisateur
   * GET /api/auth/me?email=xxx
   */
  async getProfile(email) {
    const response = await api.get("/auth/me", {
      params: { email },
    });

    return toFrontendUser(unwrapData(response));
  },

  /**
   * Mettre à jour le profil utilisateur
   * PUT /api/auth/profile
   */
  async updateProfile(data) {
    const response = await api.put("/auth/profile", {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber ?? data.phone,
      address: data.address,
      drivingLicenseNumber: data.drivingLicenseNumber ?? data.licenseNumber,
    });

    return unwrapMessage(response);
  },

  /**
   * Changer le mot de passe
   * PUT /api/auth/change-password
   */
  async changePassword(data) {
    const response = await api.put("/auth/change-password", {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    return unwrapMessage(response);
  },

  /**
   * Demander un lien de réinitialisation
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password", { email });
    return unwrapMessage(response);
  },

  /**
   * Vérifier un token de réinitialisation
   * GET /api/auth/verify-token?token=xxx
   */
  async verifyResetToken(token) {
    const response = await api.get("/auth/verify-token", {
      params: { token }
    });
    return unwrapMessage(response);
  },

  /**
   * Réinitialiser le mot de passe
   * POST /api/auth/reset-password
   */
  async resetPassword(token, newPassword) {
    const response = await api.post("/auth/reset-password", {
      token,
      newPassword
    });
    return unwrapMessage(response);
  },

  /**
   * Vérifier l'email
   * GET /api/auth/verify-email?token=xxx
   */
  async verifyEmail(token) {
    const response = await api.get("/auth/verify-email", {
      params: { token }
    });
    return unwrapMessage(response);
  },

  /**
   * Renvoyer l'email de vérification
   * POST /api/auth/resend-verification?email=xxx
   */
  async resendVerification(email) {
    const response = await api.post("/auth/resend-verification", null, {
      params: { email }
    });
    return unwrapMessage(response);
  },

  /**
   * Vérifier si email existe
   * GET /api/auth/check-email?email=xxx
   */
  async checkEmail(email) {
    const response = await api.get("/auth/check-email", {
      params: { email }
    });
    return unwrapData(response);
  },

  /**
   * Vérifier si téléphone existe
   * GET /api/auth/check-phone?phone=xxx
   */
  async checkPhone(phone) {
    const response = await api.get("/auth/check-phone", {
      params: { phone }
    });
    return unwrapData(response);
  },
};