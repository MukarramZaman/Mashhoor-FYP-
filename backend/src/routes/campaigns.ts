import { Router } from "express";
import {
  getMyCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addInfluencerToCampaign,
  getInfluencerCampaigns,
} from "../controllers/campaignController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

// ⚠️  FIXED: /my-campaigns MUST come before /:id
// otherwise Express matches "my-campaigns" as a campaign id

// Influencer routes — specific strings first
router.get("/my-campaigns", protect, authorize("influencer"), getInfluencerCampaigns);

// Business routes
router.get("/", protect, authorize("business"), getMyCampaigns);
router.post("/", protect, authorize("business"), createCampaign);

router.put("/:id", protect, authorize("business"), updateCampaign);
router.delete("/:id", protect, authorize("business"), deleteCampaign);
router.post("/:id/influencers", protect, authorize("business"), addInfluencerToCampaign);

// Shared — parameterized route LAST
router.get("/:id", protect, getCampaignById);

export default router;
