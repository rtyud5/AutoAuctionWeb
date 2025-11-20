// Thông tin sản phẩm đấu giá (phiên đấu giá)

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi là một phiên đấu giá:

- product_id: sản phẩm đang được đấu giá
- seller_id: người bán
- start_price: giá khởi điểm
- step_price: bước giá bội số (100k, 200k...)
- current_price: giá cao nhất hiện tại
- current_winner_id: user đang giữ giá cao nhất
- start_time, end_time: thời gian bắt đầu / kết thúc
- auto_extend: có tự gia hạn không
- status: PENDING, RUNNING, ENDED, CANCELLED
- winner_id, winner_bid_id: khi kết thúc
*/

const Auction = sequelize.define(
  "Auction",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Mã định danh phiên đấu giá",
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID sản phẩm gốc (bảng products)",
    },

    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người bán (bảng users)",
    },

    start_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Giá khởi điểm (VND)",
    },

    step_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Bước giá tối thiểu (bội số, ví dụ 100000)",
    },

    current_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: "Giá hiện tại cao nhất (VND)",
    },

    current_winner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID bidder đang giữ giá cao nhất (FK users.id, nullable)",
    },

    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Thời gian bắt đầu phiên đấu giá",
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Thời gian kết thúc phiên đấu giá",
    },

    auto_extend: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Có tự động gia hạn phiên hay không",
    },

    status: {
      type: DataTypes.ENUM("PENDING", "RUNNING", "ENDED", "CANCELLED"),
      allowNull: false,
      defaultValue: "PENDING",
      comment: "Trạng thái phiên đấu giá",
    },

    winner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID người thắng cuộc (khi kết thúc)",
    },

    winner_bid_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID bản ghi bid thắng cuộc",
    },
    // created_at / updated_at do timestamps + underscored sinh
  },
  {
    tableName: "auctions", // tên bảng trong DB
    timestamps: true,
    underscored: true,
  }
);

export default Auction;
