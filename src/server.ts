import app from "./app";
import connectDB from "./config/db";
import { env } from "./config/env";
import mongoose from "mongoose";
import { backfillEventsV2 } from "./services/Events/utils/backfill";

// Upgrade any pre-v2 events once the DB is connected (idempotent)
mongoose.connection.once("open", () => {
  backfillEventsV2().catch((err) =>
    console.error("❌ Events backfill failed:", err),
  );
});

connectDB();

app.listen(env.PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});
