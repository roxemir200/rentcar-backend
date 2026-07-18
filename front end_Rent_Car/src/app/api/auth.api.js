import { api } from "./axios";

const unwrap = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return payload.data ?? payload;
  }
  return payload;
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
  async register(data) {
    const response = await api.post("/auth/register", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber ?? data.phone,
      address: data.address,
      drivingLicenseNumber: data.drivingLicenseNumber ?? data.licenseNumber,
    });

    return unwrap(response);
  },

  async login(data) {
    const response = await api.post("/auth/login", {
      email: data.email,
      password: data.password,
    });

    return unwrap(response);
  },

  async getProfile(email) {
    const response = await api.get("/auth/me", {
      params: { email },
    });

    return toFrontendUser(unwrap(response));
  },

  async updateProfile(data) {
    const response = await api.put("/auth/profile", {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber ?? data.phone,
      address: data.address,
      drivingLicenseNumber: data.drivingLicenseNumber ?? data.licenseNumber,
    });

    return unwrap(response);
  },
};
