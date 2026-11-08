import { api } from "@/lib/api";
import { Session, SessionCreate } from "@/types";

export interface SessionListParams {
  role?: "learner" | "tutor";
  status?: string;
  upcoming?: boolean;
}

export const sessionService = {
  async getSessions(params: SessionListParams = {}): Promise<Session[]> {
    const res = await api.get<Session[]>("/sessions", { params });
    return res.data;
  },

  async getSession(id: number): Promise<Session> {
    const res = await api.get<Session>(`/sessions/${id}`);
    return res.data;
  },

  async createSession(payload: SessionCreate): Promise<Session> {
    const res = await api.post<Session>("/sessions", payload);
    return res.data;
  },

  async updateStatus(
    id: number,
    action: "accept" | "reject" | "complete" | "cancel",
    reason?: string
  ): Promise<Session> {
    const body: { action: string; reason?: string } = { action };
    if (reason) body.reason = reason;
    const res = await api.patch<Session>(`/sessions/${id}/status`, body);
    return res.data;
  },
};
