import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  const [rows] = await conn.query(
    "SELECT id, title, thumbnail, LEFT(images, 100) as images_preview FROM products WHERE title LIKE '%Honda%' OR title LIKE '%SH%' ORDER BY id DESC LIMIT 3"
  );

  console.log("Products matching Honda/SH:");
  console.table(rows);

  await conn.end();
}

check().catch(console.error);
