import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { createReport, getReports, updateReportStatus } from "../controllers/reportController";

const router = Router();

router.use(protect);

router.post("/", createReport);

router.use(authorize("admin"));
router.get("/", getReports);
router.put("/:id/status", updateReportStatus);

export default router;
