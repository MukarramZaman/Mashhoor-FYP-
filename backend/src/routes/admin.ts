import { Router } from "express";
import {
    getAdminStats,
    getPendingVerifications,
    verifyUser,
    rejectUser,
} from "../controllers/adminController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/stats", getAdminStats);
router.get("/verifications/pending", getPendingVerifications);
router.put("/verifications/:id/approve", verifyUser);
router.delete("/verifications/:id/reject", rejectUser);

export default router;