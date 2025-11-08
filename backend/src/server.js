require("dotenv").config();
const app = require("./src/app");
const sequelize = require("./src/config/db");

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    console.log("🌱 Starting server with config:", {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER ? "(set)" : "(missing)",
    });

    await sequelize.authenticate();
    console.log("✅ Connected to MySQL");

    // Dev only: sync models tự động (chưa có model cũng không sao)
    await sequelize.sync();
    console.log("✅ Models synced");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:");
    console.error(err);
    process.exit(1);
  }
})();
