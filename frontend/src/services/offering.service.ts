import { api } from "@/lib/api";
import { Offering, OfferingCreatePayload, OfferingUpdatePayload } from "@/types";

export interface OfferingSearchParams {
  tutor_id?: number;
  subject?: string;
  level?: string;
  search?: string;
  is_active?: boolean;
}

export const offeringService = {
  async getOfferings(params: OfferingSearchParams = {}): Promise<Offering[]> {
    const res = await api.get<Offering[]>("/offerings", { params });
    return res.data;
  },

  async getOfferingById(id: number | string): Promise<Offering> {
    const res = await api.get<Offering>(`/offerings/${id}`);
    return res.data;
  },

  async createOffering(payload: OfferingCreatePayload): Promise<Offering> {
    const res = await api.post<Offering>("/offerings", payload);
    return res.data;
  },

  async updateOffering(id: number, payload: OfferingUpdatePayload): Promise<Offering> {
    const res = await api.put<Offering>(`/offerings/${id}`, payload);
    return res.data;
  },

  async deleteOffering(id: number): Promise<{ message: string; id: number; soft_deleted: boolean }> {
    const res = await api.delete(`/offerings/${id}`);
    return res.data;
  },
};
