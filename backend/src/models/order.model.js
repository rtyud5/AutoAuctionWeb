/* Lưu thông tin đơn hàng thắng đấu giá:
   - người mua, người bán
   - phiên đấu giá
   - trạng thái xử lý
   - thông tin nhận hàng, chứng từ thanh toán / giao hàng
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
status gồm:
- WAIT_BUYER_INFO
- WAIT_SELLER_CONFIRM
- WAIT_BUYER_CONFIRM
- COMPLETED
- CANCELLED
*/

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính đơn hàng",
    },

    auction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID phiên đấu giá (FK auctions.id)",
    },

    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người bán (FK users.id)",
    },

    buyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người mua (FK users.id)",
    },

    status: {
      type: DataTypes.ENUM(
        "WAIT_BUYER_INFO",
        "WAIT_SELLER_CONFIRM",
        "WAIT_BUYER_CONFIRM",
        "COMPLETED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "WAIT_BUYER_INFO",
      comment: "Trạng thái xử lý đơn hàng",
    },

    buyer_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Thông tin người nhận: tên, SĐT, địa chỉ... (JSON/string)",
    },

    payment_proof_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Ảnh/chứng từ thanh toán (URL)",
    },

    shipping_proof_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Ảnh/chứng từ giao hàng (URL)",
    },
    // created_at / updated_at sinh tự động
  },
  {
    tableName: "orders",
    timestamps: true,
    underscored: true, // created_at, updated_at
  }
);

export default Order;
