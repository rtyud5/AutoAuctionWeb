/* Câu hỏi của bidder dành cho seller trên một phiên đấu giá */

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
Mỗi bản ghi = 1 câu hỏi:

- auction_id: phiên đấu giá liên quan
- asker_id: người hỏi (bidder, FK users.id)
- content: nội dung câu hỏi
*/

const Question = sequelize.define(
  "Question",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính câu hỏi",
    },

    auction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID phiên đấu giá (FK auctions.id)",
    },

    asker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người hỏi (FK users.id)",
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Nội dung câu hỏi",
    },
    // created_at / updated_at sẽ do timestamps + underscored sinh
  },
  {
    tableName: "questions",
    timestamps: true,
    underscored: true, // created_at, updated_at
  }
);

export default Question;
