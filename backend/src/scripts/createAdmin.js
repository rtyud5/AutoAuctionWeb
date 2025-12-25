// Script để tạo tài khoản admin gốc
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcrypt";
import sequelize from "../config/db.js";
import User from "../models/user.model.js";

const createAdminAccount = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({
      where: {
        email: "tudaisinhvien23@admin.local",
      },
    });

    if (existingAdmin) {
      console.log("⚠️  Admin account already exists!");
      console.log("   Username: tudaisinhvien23");
      console.log("   Email: tudaisinhvien23@admin.local");
      console.log("   Role:", existingAdmin.role);

      // Cập nhật password nếu cần
      const updatePassword = process.argv.includes("--update-password");
      if (updatePassword) {
        const password_hash = await bcrypt.hash("khtn@23", 10);
        await existingAdmin.update({ password_hash, role: "ADMIN" });
        console.log("✅ Password updated successfully!");
      }
    } else {
      // Hash password
      const password_hash = await bcrypt.hash("khtn@23", 10);

      // Tạo tài khoản admin
      const admin = await User.create({
        name: "tudaisinhvien23",
        email: "tudaisinhvien23@admin.local", // Dùng format email để pass validation, nhưng username thật là tudaisinhvien23
        password_hash,
        role: "ADMIN",
        is_active: true,
      });

      console.log("✅ Admin account created successfully!");
      console.log("   Username: tudaisinhvien23");
      console.log("   Email: tudaisinhvien23@admin.local");
      console.log("   Password: khtn@23");
      console.log("   User ID:", admin.id);
      console.log("   Role:", admin.role);
    }

    await sequelize.close();
    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

createAdminAccount();
