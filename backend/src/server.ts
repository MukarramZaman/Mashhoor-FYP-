import "dotenv/config";
import app from "./app";
import connectDB from "./config/database";
import { setupEmailService } from "./services/emailService";
import { processDueInterestChecks } from "./services/campaignInterestService";
import { setupCronJobs } from "./jobs/syncJobs";

const PORT = Number(process.env.PORT) || 5000;

let server: any;

const startServer = async () => {
  try {
    await connectDB();

    // ⚠️ don’t block server startup on email service
    setupEmailService().catch((err) =>
      console.error("Email service init failed:", err)
    );

    setupCronJobs();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Mashhoor API running on port ${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    });

    // background job (safe)
    setInterval(() => {
      processDueInterestChecks().catch((err) =>
        console.error("Interest check error:", err)
      );
    }, 30_000);

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down...`);

      server?.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (err: any) => {
      console.error("❌ Unhandled Rejection:", err);
      server?.close(() => process.exit(1));
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();