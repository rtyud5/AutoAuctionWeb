// Danh sách bidder bị chặn khỏi một phiên đấu giá

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi = 1 bidder bị chặn trong 1 phiên đấu giá:

- auction_id: phiên đấu giá
- bidder_id: người bị chặn
- reason: lý do bị chặn
*/

const BlockedBidder = sequelize.define(
  "BlockedBidder",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính bản ghi chặn bidder",
    },

    auction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID phiên đấu giá (FK auctions.id)",
    },

    bidder_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID bidder bị chặn (FK users.id)",
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Lý do chặn (tùy chọn)",
    },
    // created_at / updated_at tự sinh bởi timestamps + underscored
  },
  {
    tableName: "blocked_bidders", // tên bảng trong DB
    timestamps: true,
    underscored: true,            // => created_at, updated_at
  }
);

export default BlockedBidder;
