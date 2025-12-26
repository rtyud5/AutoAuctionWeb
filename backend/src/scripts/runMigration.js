import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

async function runMigration() {
  let connection;

  try {
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    console.log("✅ Connected to database");

    // Check if column already exists
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM products LIKE 'images'`
    );

    if (columns.length > 0) {
      console.log('ℹ️  Column "images" already exists in products table');
      return;
    }

    // Add the column
    console.log('📝 Adding "images" column to products table...');
    await connection.query(
      `ALTER TABLE products 
       ADD COLUMN images TEXT COMMENT 'JSON array of image URLs from Cloudinary' 
       AFTER thumbnail`
    );

    console.log("✅ Migration completed successfully!");
    console.log('✨ Column "images" has been added to products table');
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("👋 Database connection closed");
    }
  }
}

runMigration();
