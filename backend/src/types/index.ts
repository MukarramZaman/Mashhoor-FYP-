import { Request } from "express";

// ─── Auth ────────────────────────────────────────────────────────
export type UserRole = "business" | "influencer" | "admin";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Campaign ────────────────────────────────────────────────────
export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

// ─── Outreach ────────────────────────────────────────────────────
export type OutreachStatus =
  | "pending"
  | "sent"
  | "opened"
  | "replied"
  | "accepted"
  | "rejected";

export type SentimentLabel = "positive" | "neutral" | "negative";

// ─── API Responses ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
