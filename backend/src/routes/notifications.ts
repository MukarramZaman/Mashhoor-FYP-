import { Router } from "express";
import {
  getNotificationSummary,
  getNotifications,
  markAllNotificationsRead,
} from "../controllers/notificationController";
import { protect } from "../middleware/auth";

const router = Router();

router.get("/summary", protect, getNotificationSummary);
router.get("/", protect, getNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);

export default router;
