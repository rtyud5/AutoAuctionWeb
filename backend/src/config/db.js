// backend/src/config/db.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Tạo instance Sequelize kết nối tới Railway
const sequelize = new Sequelize(
  process.env.DB_NAME, // railway
  process.env.DB_USER, // root
  process.env.DB_PASS, // password trong .env
  {
    host: process.env.DB_HOST, // shinkansen.proxy.rlwy.net
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false, // đổi thành true nếu muốn xem câu SQL log ra console
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    },
    retry: {
      max: 3,
    },
  }
);

// Hàm test kết nối (gọi trong server.js)
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database via Sequelize");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

// ⚠️ Export default = sequelize
// => Các chỗ đang dùng `import db from "../config/db.js"`
//    và gọi `db.query("SELECT ...")` vẫn dùng được
export default sequelize;
