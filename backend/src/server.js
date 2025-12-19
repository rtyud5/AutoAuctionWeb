import dotenv from "dotenv";
// load env immediately
dotenv.config();

// import app, db, models after env is loaded
const { default: app } = await import("./app.js");
const { default: sequelize, testConnection } = await import("./config/db.js");
await import("./models/index.js");

const PORT = process.env.PORT || 4000;


const ensureProductSchema = async () => {
  // One-time schema guard for new columns (without requiring sequelize-cli migrations)
  try {
    const [cols] = await sequelize.query("SHOW COLUMNS FROM products LIKE 'allow_negative_user'");
    if (!cols || cols.length === 0) {
      await sequelize.query(
        "ALTER TABLE products ADD COLUMN allow_negative_user TINYINT(1) NOT NULL DEFAULT 0"
      );
      console.log('✅ Migrated: products.allow_negative_user');
    }
  } catch (err) {
    // Don't crash the app if DB user has no ALTER privilege; feature will fallback to default false
    console.warn('⚠️ Skip schema migration allow_negative_user:', err.message);
  }
};

const startServer = async () => {
  try {
    await testConnection();

    // sync models (adjust options as needed)
    await sequelize.sync({ alter: false });
    console.log("✅ Sequelize models synchronized with database");

    await ensureProductSchema();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down...`);
      try {
        await sequelize.close();
        server.close(() => {
          console.log("Server closed.");
          process.exit(0);
        });
      } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    process.exit(1);
  }
};

startServer();