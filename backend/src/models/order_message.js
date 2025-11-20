// Tin nhắn trao đổi giữa các bên trong đơn hàng

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi = 1 tin nhắn gắn với 1 đơn hàng:

- order_id: đơn hàng nào
- sender_id: ai gửi (người mua / người bán / admin)
- message: nội dung tin nhắn
*/

const OrderMessage = sequelize.define(
  "OrderMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính tin nhắn đơn hàng",
    },

    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID đơn hàng (FK orders.id)",
    },

    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người gửi (FK users.id)",
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Nội dung tin nhắn",
    },
    // created_at / updated_at sẽ được sinh từ timestamps + underscored
  },
  {
    tableName: "order_messages",
    timestamps: true,   // có createdAt, updatedAt
    underscored: true,  // => created_at, updated_at
  }
);

export default OrderMessage;
