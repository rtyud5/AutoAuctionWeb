/*
  Danh sách theo dõi (watch list) của người dùng:

  - user_id: ai đang theo dõi
  - auction_id: phiên đấu giá nào được theo dõi
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const WatchList = sequelize.define(
  "WatchList",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính bản ghi watch list",
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người dùng (FK users.id)",
    },

    auction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID phiên đấu giá được theo dõi (FK auctions.id)",
    },
    // created_at / updated_at sẽ tự sinh
  },
  {
    tableName: "watch_list",
    timestamps: true,   // createdAt, updatedAt
    underscored: true,  // created_at, updated_at
  }
);

export default WatchList;
