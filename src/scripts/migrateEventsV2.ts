/**
 * One-off (and safe to re-run) upgrade of existing events to the v2 model.
 * The server also does this automatically on start, so running it by hand is
 * optional:   npm run migrate:events
 */
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { backfillEventsV2 } from "../services/Events/utils/backfill";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

(async () => {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
  await mongoose.connect(process.env.MONGO_URI);
  const upgraded = await backfillEventsV2();
  console.log(
    upgraded
      ? `Done — ${upgraded} event(s) upgraded.`
      : "Nothing to do — all events are already on v2.",
  );
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
