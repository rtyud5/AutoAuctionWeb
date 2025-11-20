// src/server.js
import app from "./app.js";
import dotenv from "dotenv";
import sequelize, { testConnection } from "./config/db.js";

import "./models/index.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testConnection();

    await sequelize.sync({ alter: true });
    console.log("✅ Sequelize models synchronized with database");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error("❌ Failed to start server:", e.message);
  }
};

startServer();
