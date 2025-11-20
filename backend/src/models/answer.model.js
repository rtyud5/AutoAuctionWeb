/*
  Lịch sử các câu hỏi và câu trả lời 
  của những người tham gia đấu giá & người bán
*/

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Answer = sequelize.define(
  "Answer",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "Khóa chính của câu trả lời",
    },

    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID câu hỏi gốc (FK tới bảng questions)",
    },

    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID người bán (user) trả lời",
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Nội dung câu trả lời / trao đổi",
    },
    // created_at sẽ tự sinh bởi timestamps + underscored
  },
  {
    tableName: "answers", // tên bảng trong DB
    timestamps: true,     // có createdAt, updatedAt
    underscored: true,    // => created_at, updated_at
  }
);

export default Answer;
