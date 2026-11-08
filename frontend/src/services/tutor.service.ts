import { api } from "@/lib/api";
import { PaginatedTutorsResponse, TutorDetailResponse } from "@/types";

export interface TutorSearchParams {
  search?: string;
  subject?: string;
  department?: string;
  min_rating?: number;
  max_rate?: number;
  page?: number;
  size?: number;
}

export const tutorService = {
  async searchTutors(params: TutorSearchParams = {}): Promise<PaginatedTutorsResponse> {
    const res = await api.get<PaginatedTutorsResponse>("/tutors", { params });
    return res.data;
  },

  async getTutorById(id: number | string): Promise<TutorDetailResponse> {
    const res = await api.get<TutorDetailResponse>(`/tutors/${id}`);
    return res.data;
  },
};
