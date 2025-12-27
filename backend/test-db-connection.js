import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  console.log("🔍 Testing database connection...");
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Port: ${process.env.DB_PORT}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
    });

    console.log("✅ Connection successful!");

    const [rows] = await connection.execute("SELECT 1 + 1 AS result");
    console.log("✅ Query successful:", rows);

    await connection.end();
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Error code:", error.code);
  }
}

testConnection();
