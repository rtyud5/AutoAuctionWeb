import dotenv from "dotenv";
// load env immediately
dotenv.config();

// import app, db, models after env is loaded
const { default: app } = await import("./app.js");
const { default: sequelize, testConnection } = await import("./config/db.js");
await import("./models/index.js");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testConnection();

    // sync models (adjust options as needed)
    await sequelize.sync({ alter: false });
    console.log("✅ Sequelize models synchronized with database");

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