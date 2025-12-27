import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function checkLastProduct() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    console.log("🔍 Checking last product in database...\n");

    const [rows] = await connection.query(
      `SELECT id, title, thumbnail, images, created_at 
       FROM products 
       ORDER BY id DESC 
       LIMIT 1`
    );

    if (rows.length === 0) {
      console.log("❌ No products found in database");
      return;
    }

    const product = rows[0];
    console.log("📦 Last Product:");
    console.log(`   ID: ${product.id}`);
    console.log(`   Title: ${product.title}`);
    console.log(`   Created: ${product.created_at}`);
    console.log(`   Thumbnail: ${product.thumbnail || "NULL"}`);
    console.log(`   Images: ${product.images || "NULL"}\n`);

    if (product.images) {
      try {
        const imageUrls = JSON.parse(product.images);
        console.log("🖼️  Image URLs:");
        imageUrls.forEach((url, i) => {
          console.log(`   [${i}] ${url}`);
        });

        if (imageUrls[0]?.includes("cloudinary")) {
          console.log("\n✅ Images are stored on Cloudinary!");
        } else if (imageUrls[0]?.startsWith("/uploads/")) {
          console.log("\n⚠️  Images are still using local paths!");
          console.log(
            "💡 This means the upload went to local storage, not Cloudinary."
          );
        }
      } catch (e) {
        console.log("⚠️  Could not parse images JSON");
      }
    } else {
      console.log("⚠️  No images data found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkLastProduct();
