import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Danh mục 2 cấp, ví dụ:
- Điện tử  → Điện thoại di động
- Điện tử  → Máy tính xách tay
- Thời trang → Giày
- Thời trang → Đồng hồ

parent_id:
- null  → danh mục cha (top-level)
- != null → danh mục con, trỏ tới id của danh mục cha
*/

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính danh mục",
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Tên danh mục (VD: Điện thoại di động)",
    },

    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      comment: "Slug SEO (vd: dien-thoai-di-dong)",
    },

    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID danh mục cha (null nếu là danh mục gốc)",
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Ẩn/hiện danh mục",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Thứ tự sắp xếp",
    },
  },
  {
    tableName: "categories",
    timestamps: true,   // createdAt, updatedAt
    underscored: true,  // created_at, updated_at
  }
);

export default Category;
