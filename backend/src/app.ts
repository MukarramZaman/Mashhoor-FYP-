import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import influencerRoutes from "./routes/influencers";
import campaignRoutes from "./routes/campaigns";
import outreachRoutes from "./routes/outreach";
import messageRoutes from "./routes/messages";
import dashboardRoutes from "./routes/dashboard";
import adminRoutes from "./routes/admin";
import notificationRoutes from "./routes/notifications";
import reportRoutes from "./routes/reports";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

// Trust the first proxy (Render load balancer) to fix express-rate-limit IP issues
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://mashhoor-frontend.vercel.app"
    ];

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || origin.includes("vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

// ─── Body Parser (MUST be before routes and rate limiters that read body) ─────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev", {
    skip: (req) => {
      const url = req.originalUrl || req.url;
      return url.includes("/notifications/summary") || 
             url.includes("/dashboard") ||
             url.includes("/health");
    }
  }));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

app.use("/api", limiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Mashhoor Backend API is live 🚀",
  });
});
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/influencers", influencerRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/outreach", outreachRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

// ─── 404 + Error Handler (always last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;

