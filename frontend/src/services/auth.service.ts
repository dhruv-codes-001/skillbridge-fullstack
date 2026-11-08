import { api } from "@/lib/api";
import { AuthResponse, User, UserLoginPayload, UserRegisterPayload } from "@/types";

export const authService = {
  async register(payload: UserRegisterPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/register", payload);
    return res.data;
  },

  async login(payload: UserLoginPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/login", payload);
    return res.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },
};
