import { Response, NextFunction } from "express";
import { Report } from "../models/Report";
import { AuthRequest } from "../types";
import { AppError } from "../middleware/errorHandler";

// POST /api/reports
export const createReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason || !details) {
      return next(new AppError("Missing required fields", 400));
    }

    const priority =
      reason.toLowerCase().includes("spam") || reason.toLowerCase().includes("harass")
        ? "high"
        : "medium";

    const report = await Report.create({
      reportedUser: reportedUserId,
      reportedBy: req.user?.userId,
      reason,
      details,
      priority,
    });

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports (Admin only)
export const getReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await Report.find()
      .populate("reportedUser", "name email avatar role")
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 });

    // Filter out reports where the reported user no longer exists
    const validReports = reports.filter((r) => r.reportedUser !== null);

    res.status(200).json({
      success: true,
      data: validReports,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/reports/:id/status (Admin only)
export const updateReportStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    
    if (!["pending", "reviewed", "dismissed"].includes(status)) {
       return next(new AppError("Invalid status", 400));
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};
