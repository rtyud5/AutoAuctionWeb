/*
  Đánh giá người bán / người mua:
  - like (+1) hoặc dislike (-1)
  - kèm 1 đoạn nhận xét (comment)
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi = 1 đánh giá:

- order_id: đơn hàng liên quan (đã giao dịch xong)
- rater_id: người đánh giá (FK users.id)
- target_user_id: người bị đánh giá (FK users.id)
- score: +1 (like) hoặc -1 (dislike)
- comment: nhận xét (optional)
*/

const Rating = sequelize.define(
  "Rating",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính đánh giá",
    },

    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID đơn hàng (FK orders.id)",
    },

    rater_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người đánh giá (FK users.id)",
    },

    target_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người được đánh giá (FK users.id)",
    },

    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Điểm đánh giá: +1 (like) hoặc -1 (dislike)",
      validate: {
        isIn: [[1, -1]],
      },
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Nhận xét kèm theo",
    },
    // created_at / updated_at sẽ tự sinh do timestamps + underscored
  },
  {
    tableName: "ratings",
    timestamps: true,
    underscored: true, // created_at, updated_at
  }
);

export default Rating;
