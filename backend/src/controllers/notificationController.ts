import { Response, NextFunction } from "express";
import { Notification } from "../models/Notification";
import { Outreach } from "../models/Outreach";
import { Conversation } from "../models/Message";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import mongoose from "mongoose";

// GET /api/notifications/summary — badge counts for nav bars
export const getNotificationSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return next(new AppError("Unauthorized", 401));

    const userOid = new mongoose.Types.ObjectId(userId);

    if (role === "business") {
      const unreadNotifications = await Notification.countDocuments({
        user: userOid,
        isRead: false,
      });
      const newAcceptances = await Outreach.countDocuments({
        business: userOid,
        status: "accepted",
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      res.status(200).json({
        success: true,
        data: {
          unreadNotifications,
          pendingRequests: 0,
          unreadMessages: 0,
          newAcceptances,
        },
      });
      return;
    }

    if (role === "influencer") {
      const pendingRequests = await Outreach.countDocuments({
        influencer: userOid,
        status: { $in: ["pending", "sent", "opened"] },
      });
      const unreadNotifications = await Notification.countDocuments({
        user: userOid,
        isRead: false,
      });

      const convos = await Conversation.find({ participants: userOid });
      let unreadMessages = 0;
      for (const c of convos) {
        unreadMessages += c.unreadCount.get(userId) ?? 0;
      }

      res.status(200).json({
        success: true,
        data: {
          unreadNotifications,
          pendingRequests,
          unreadMessages,
          newAcceptances: 0,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        unreadNotifications: 0,
        pendingRequests: 0,
        unreadMessages: 0,
        newAcceptances: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications
export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("Unauthorized", 401));

    const notifications = await Notification.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .populate("campaign", "title")
      .populate("influencer", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new AppError("Unauthorized", 401));

    await Notification.updateMany(
      { user: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};
