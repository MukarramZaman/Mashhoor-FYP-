import api from "./client";

export type ReportStatus = "pending" | "reviewed" | "dismissed";
export type ReportPriority = "low" | "medium" | "high";

export interface Report {
  _id: string;
  reportedUser: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  details: string;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
}

export const reportApi = {
  createReport: async (reportedUserId: string, reason: string, details: string) => {
    const { data } = await api.post("/reports", {
      reportedUserId,
      reason,
      details,
    });
    return data;
  },

  getReports: async (): Promise<Report[]> => {
    const { data } = await api.get("/reports");
    return data.data;
  },

  updateStatus: async (id: string, status: ReportStatus) => {
    const { data } = await api.put(`/reports/${id}/status`, { status });
    return data;
  },
};
