// Cấu hình auto-bid cho bidder trên một phiên đấu giá

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Nghiệp vụ (tóm tắt từ comment):

- Hệ thống có thể áp dụng rule:
  + Chỉ cho phép bidder có điểm đánh giá >= 80% tham gia đấu giá.
  + Bidder chưa từng được đánh giá có thể được tham gia nếu người bán cho phép.
- Ở đây, model này lưu:
  + auction_id: phiên đấu giá
  + bidder_id: người tham gia
  + max_amount: số tiền tối đa bidder sẵn sàng trả (auto-bid trần)
  + is_active: auto-bid đang bật/tắt

Các rule % rating, kiểm tra điều kiện... sẽ xử lý ở service/controller,
model chỉ lưu cấu hình auto-bid.
*/

const AutoBidRule = sequelize.define(
  "AutoBidRule",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính cấu hình auto-bid",
    },

    auction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID phiên đấu giá (FK auctions.id)",
    },

    bidder_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người tham gia đấu giá (FK users.id)",
    },

    max_amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Số tiền tối đa bidder sẵn sàng trả (VND)",
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Auto-bid đang bật hay tắt",
    },
    // created_at / updated_at sẽ do timestamps + underscored sinh ra
  },
  {
    tableName: "auto_bid_rules", // tên bảng trong DB
    timestamps: true,            // có createdAt, updatedAt
    underscored: true,           // => created_at, updated_at
  }
);

export default AutoBidRule;
