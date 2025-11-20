/*
  Yêu cầu nâng cấp tài khoản:

  - Bidder gửi yêu cầu xin được upgrade thành Seller.
  - Ban quản trị (admin) sẽ duyệt yêu cầu này trong vòng X ngày.
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
status:
- PENDING   : chờ duyệt
- APPROVED  : đã chấp nhận, user được nâng lên seller
- REJECTED  : từ chối yêu cầu (có thể ghi chú lý do trong note)
*/

const UpgradeRequest = sequelize.define(
  "UpgradeRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính yêu cầu nâng cấp",
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID user gửi yêu cầu (bidder) - FK users.id",
    },

    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
      comment: "Trạng thái xử lý yêu cầu",
    },

    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID admin xử lý yêu cầu (FK users.id) - null khi còn PENDING",
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Ghi chú của admin: lý do từ chối, lưu ý, v.v.",
    },
    // created_at / updated_at tự sinh nhờ timestamps + underscored
  },
  {
    tableName: "upgrade_requests",
    timestamps: true,   // createdAt, updatedAt
    underscored: true,  // created_at, updated_at
  }
);

export default UpgradeRequest;
