import app from "./app.js";
import dotenv from "dotenv";
import db from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

// Test DB connection once on start (optional)
(async () => {
  try {
    await db.query("SELECT 1");
    console.log("✅ Connected to MySQL database");
  } catch (e) {
    console.error("❌ Database connection failed:", e.message);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
