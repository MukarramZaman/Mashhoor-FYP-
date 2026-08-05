import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { InfluencerProfile } from "../models/InfluencerProfile";
import { EmailInvite } from "../models/EmailInvite";
import { AppError } from "../middleware/errorHandler";
import { getPublicClientUrl } from "../config/publicUrl";
import { sendEmail, isEmailConfigured } from "../services/emailService";
import { AuthRequest, JwtPayload, UserRole } from "../types";

const signToken = (userId: string, role: UserRole, email: string): string => {
  return jwt.sign(
    { userId, role, email } as JwtPayload,
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any }
  );
};

const signRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "30d") as any }
  );
};

const issueAuthResponse = (user: InstanceType<typeof User>) => ({
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    hasSignedUp: user.hasSignedUp,
  },
  token: signToken(user._id.toString(), user.role, user.email),
  refreshToken: signRefreshToken(user._id.toString()),
});

// POST /api/auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role, inviteToken } = req.body;

    if (!name || !email || !password || !role) {
      return next(new AppError("All fields are required", 400));
    }

    if (!["business", "influencer"].includes(role)) {
      return next(new AppError("Role must be business or influencer", 400));
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (inviteToken) {
      const invite = await EmailInvite.findOne({ inviteToken });
      if (!invite) return next(new AppError("Invalid or expired invitation link", 400));
      if (invite.status === "registered") {
        return next(new AppError("This invitation has already been used. Please log in.", 400));
      }
      if (normalizedEmail !== invite.email.toLowerCase()) {
        return next(
          new AppError("Use the same email address that received the campaign invitation", 400)
        );
      }
      if (role !== "influencer") {
        return next(new AppError("Campaign invitations are for influencer accounts only", 400));
      }

      const existing = await User.findOne({ email: normalizedEmail }).select("+password");
      if (existing) {
        if (existing.hasSignedUp) {
          return next(new AppError("Email already registered. Please log in instead.", 409));
        }
        existing.name = name;
        existing.password = password;
        existing.hasSignedUp = true;
        existing.role = "influencer";
        await existing.save();

        const hasProfile = await InfluencerProfile.exists({ user: existing._id });
        if (!hasProfile) {
          await InfluencerProfile.create({
            user: existing._id,
            niche: ["Unspecified"],
            location: "",
            country: "",
            bio: "",
            platforms: {},
          });
        }

        invite.status = "registered";
        await invite.save();

        const auth = issueAuthResponse(existing);
        res.status(200).json({
          success: true,
          message: "Account activated. You can now view your campaign invitation.",
          data: auth,
        });
        return;
      }
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return next(new AppError("Email already registered", 409));
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      hasSignedUp: true,
    });

    if (role === "influencer") {
      await InfluencerProfile.create({
        user: user._id,
        niche: ["Unspecified"],
        location: "Pakistan",
        country: "Pakistan",
        bio: "",
        platforms: {},
      });
    }

    if (inviteToken) {
      await EmailInvite.updateOne({ inviteToken }, { status: "registered" });
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: issueAuthResponse(user),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return next(new AppError("Email, password, and role are required", 400));
    }

    // Explicitly select password since it's hidden by default
    const user = await User.findOne({ email, role }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account has been deactivated", 403));
    }

    if (!user.hasSignedUp) {
      user.hasSignedUp = true;
      await user.save();
    }

    const token = signToken(user._id.toString(), user.role, user.email);
    const refreshToken = signRefreshToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return next(new AppError("Refresh token required", 400));

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) return next(new AppError("User not found", 404));

    const newToken = signToken(user._id.toString(), user.role, user.email);

    res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: { token: newToken },
    });
  } catch {
    next(new AppError("Invalid or expired refresh token", 401));
  }
};

// GET /api/auth/me
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user?.userId);

    if (!user) return next(new AppError("User not found", 404));

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

const RESET_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

// POST /api/auth/forgot-password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return next(new AppError("Email and role are required", 400));
    }
    if (!["business", "influencer", "admin"].includes(role)) {
      return next(new AppError("Invalid role", 400));
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, role });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      if (isEmailConfigured()) {
        const clientUrl = getPublicClientUrl();
        const link = `${clientUrl}/reset-password?token=${resetToken}`;
        await sendEmail(
          user.email,
          "Reset your Mashhoor password",
          `Reset your password: ${link}\n\nThis link expires in 1 hour.`,
          `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 1 hour.</p>`
        );
      } else {
        console.warn("⚠️  Password reset email skipped — SMTP not configured.");
      }
    }

    res.status(200).json({ success: true, message: RESET_MESSAGE });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new AppError("Token and new password are required", 400));
    }
    if (String(password).length < 8) {
      return next(new AppError("Password must be at least 8 characters", 400));
    }

    const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return next(new AppError("Invalid or expired reset link", 400));
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated. You can log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new AppError("Current password and new password are required", 400));
    }
    if (String(newPassword).length < 8) {
      return next(new AppError("New password must be at least 8 characters", 400));
    }

    const user = await User.findById(req.user?.userId).select("+password");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError("Incorrect current password", 401));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/account
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // If influencer, delete profile too
    if (user.role === "influencer") {
      await InfluencerProfile.deleteOne({ user: userId });
    }

    // Delete user document
    await User.deleteOne({ _id: userId });

    res.status(200).json({
      success: true,
      message: "Account permanently deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
