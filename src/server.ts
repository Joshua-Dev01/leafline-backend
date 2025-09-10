import app from "./app";
import connectDB from "./config/db";
import { env } from "./config/env";

connectDB();

app.listen(env.PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});
