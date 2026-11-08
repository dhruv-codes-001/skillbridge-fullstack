import { api } from "@/lib/api";
import { User, UserProfileUpdatePayload } from "@/types";

export const userService = {
  async getProfile(): Promise<User> {
    const res = await api.get<User>("/users/profile");
    return res.data;
  },

  async updateProfile(payload: UserProfileUpdatePayload): Promise<User> {
    const res = await api.put<User>("/users/profile", payload);
    return res.data;
  },
};
