import api from "./client";

export type UserRole = "business" | "influencer" | "admin";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  refreshToken: string;
};

export const authApi = {
  register: async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    inviteToken?: string
  ): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
      ...(inviteToken ? { inviteToken } : {}),
    });
    return data.data;
  },

  login: async (
    email: string,
    password: string,
    role: UserRole
  ): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/login", { email, password, role });
    return data.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const { data } = await api.post("/auth/refresh", { refreshToken });
    return data.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get("/auth/me");
    return data.data.user;
  },

  updateProfile: async (payload: { name?: string; email?: string; phone?: string }): Promise<AuthUser> => {
    const { data } = await api.put("/auth/profile", payload);
    return data.data.user;
  },

  forgotPassword: async (email: string, role: UserRole): Promise<string> => {
    const { data } = await api.post("/auth/forgot-password", { email, role });
    return data.message as string;
  },

  resetPassword: async (token: string, password: string): Promise<string> => {
    const { data } = await api.post("/auth/reset-password", { token, password });
    return data.message as string;
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<string> => {
    const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
    return data.message as string;
  },

  deleteAccount: async (): Promise<string> => {
    const { data } = await api.delete("/auth/account");
    return data.message as string;
  },
};
