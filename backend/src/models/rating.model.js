/*
Được 
phép đánh giá người bán  like(+1) hoặc  dislike(-1),
gửi kèm 1 đoạn nhận xét */

import db from "../config/db.js";

export const Rating_Model = {
  bidId: "",     // ID người đánh giá
  sellerId: "",       // ID người bán được đánh giá
  rating: 0,          // +1 (like) hoặc -1 (dislike)
  comment: "",        // Nhận xét kèm theo
  timestamp: "",      // Thời điểm đánh giá (ISO 8601)
};
