/**
 * Create an admin user — run: npx ts-node scripts/create-admin.ts
 * Usage: ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=AdminPass123! ADMIN_NAME="Admin" npx ts-node scripts/create-admin.ts
 */
import "dotenv/config";
import connectDB from "../src/config/database";
import { User } from "../src/models/User";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@mashhoor.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "AdminPass123!";
  const name = process.env.ADMIN_NAME || "Platform Admin";

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.hasSignedUp = true;
    existing.password = password;
    await existing.save();
    console.log(`✅ Updated existing user to admin: ${email}`);
  } else {
    await User.create({
      name,
      email,
      password,
      role: "admin",
      hasSignedUp: true,
      isVerified: true,
    });
    console.log(`✅ Admin user created: ${email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
