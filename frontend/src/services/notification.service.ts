import { api } from "@/lib/api";
import { Notification, NotificationListResponse } from "@/types";

export const notificationService = {
  async getNotifications(): Promise<NotificationListResponse> {
    const res = await api.get<NotificationListResponse>("/notifications");
    return res.data;
  },

  async markAsRead(id: number): Promise<Notification> {
    const res = await api.patch<Notification>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.post("/notifications/read-all");
  },
};
