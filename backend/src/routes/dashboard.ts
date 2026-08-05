import { Router } from "express";
import { getInfluencerDashboardStats, getBusinessDashboardStats } from "../controllers/dashboardController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.get("/influencer", protect, authorize("influencer"), getInfluencerDashboardStats);
router.get("/business", protect, authorize("business"), getBusinessDashboardStats);

export default router;
