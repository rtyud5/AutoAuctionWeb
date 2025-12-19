/*
  Sản phẩm được đưa lên để đấu giá

  Hiện tại model này lưu:
  - seller_id: người bán
  - category_id: danh mục
  - title: tên sản phẩm
  - short_description: mô tả ngắn
  - full_description: mô tả đầy đủ
  - thumbnail: ảnh đại diện
  - status: trạng thái duyệt (PENDING, APPROVED, REJECTED, BANNED)
  - created_at, updated_at: thời điểm đăng / cập nhật

  Các thông tin như:
  - giá hiện tại
  - giá mua ngay
  - người đặt giá cao nhất
  - thời điểm kết thúc
  ... sẽ nằm ở bảng Auction / Bid, không nhét hết vào product.
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính sản phẩm đấu giá",
    },

    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người bán (FK users.id)",
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID danh mục (FK categories.id)",
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "Tên sản phẩm",
    },

    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Mô tả ngắn (dùng cho listing)",
    },

    full_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Mô tả chi tiết sản phẩm",
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "URL ảnh đại diện (size lớn)",
    },

    allow_negative_user: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Cho phép user điểm uy tín thấp (<5) tham gia đấu giá cho sản phẩm này",
    },

    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "BANNED"),
      allowNull: false,
      defaultValue: "PENDING",
      comment: "Trạng thái duyệt sản phẩm",
    },
    // created_at / updated_at sẽ do timestamps + underscored sinh ra
  },
  {
    tableName: "products",
    timestamps: true,   // createdAt, updatedAt
    underscored: true,  // created_at, updated_at
  }
);

export default Product;
