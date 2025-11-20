// backend/src/models/user.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
id (PK)
email (unique)
password_hash
name
role ('BIDDER' | 'SELLER' | 'ADMIN') – guest không lưu DB
is_active (khóa/mở)
positive_count (số đánh giá +)
negative_count (số đánh giá -)
created_at
*/

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Mật khẩu đã được hash (bcrypt, v.v.)",
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Họ tên người dùng",
    },

    role: {
      type: DataTypes.ENUM("BIDDER", "SELLER", "ADMIN"),
      allowNull: false,
      defaultValue: "BIDDER",
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Khóa/mở tài khoản",
    },

    positive_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Số đánh giá +",
    },

    negative_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Số đánh giá -",
    },
  },
  {
    tableName: "users",  // tên bảng trong DB
    timestamps: true,    // createdAt, updatedAt
    underscored: true,   // created_at, updated_at (snake_case)
  }
);

export default User;
