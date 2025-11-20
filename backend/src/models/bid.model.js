// Thông tin các lượt ra giá (bids) của bidder trong phiên đấu giá

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi = 1 lần ra giá:

- auction_id: phiên đấu giá (FK auctions.id)
- bidder_id: người ra giá (FK users.id)
- amount: số tiền bidder đưa ra
- is_auto: true nếu là giá do hệ thống auto-bid đặt hộ
*/

const Bid = sequelize.define(
  "Bid",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính của lượt ra giá",
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

    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Số tiền ra giá (VND)",
    },

    is_auto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Lượt ra giá tự động (auto-bid) hay thủ công",
    },
    // created_at / updated_at sẽ do timestamps + underscored sinh ra
  },
  {
    tableName: "bids", // tên bảng trong DB
    timestamps: true,  // có createdAt, updatedAt
    underscored: true, // => created_at, updated_at
  }
);

export default Bid;
