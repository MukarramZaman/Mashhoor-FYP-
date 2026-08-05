import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
} from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshToken);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.delete("/account", protect, deleteAccount);

export default router;
