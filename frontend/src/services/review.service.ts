import { api } from "@/lib/api";
import { Review, ReviewCreate } from "@/types";

export const reviewService = {
  async submitReview(payload: ReviewCreate): Promise<Review> {
    const res = await api.post<Review>("/reviews", payload);
    return res.data;
  },

  async getReviewsForTutor(tutorId: number): Promise<Review[]> {
    const res = await api.get<Review[]>("/reviews", { params: { tutor_id: tutorId } });
    return res.data;
  },
};
