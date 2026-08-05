import { Router } from "express";
import {
  sendOutreach,
  getOutreachByCampaign,
  getMyRequests,
  replyToOutreach,
  updateOutreachStatus,
} from "../controllers/outreachController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.post("/", protect, authorize("business"), sendOutreach);
router.get("/campaign/:campaignId", protect, authorize("business"), getOutreachByCampaign);
router.get("/my-requests", protect, authorize("influencer"), getMyRequests);
router.put("/:id/reply", protect, authorize("influencer"), replyToOutreach);
router.put("/:id/status", protect, updateOutreachStatus);

export default router;
