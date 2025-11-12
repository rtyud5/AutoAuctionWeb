/*
Xin được bán trong vòng 7 ngày
Bidder gửi yêu cầu xin được upgrage thành seller
Ban quản trị sẽ duyệt yêu cầu này
*/

import db from "../config/db.js";

export const Upgraderequest_Model = {
  requestId: "",        // Mã yêu cầu
  bidId: "",         // ID của bidder gửi yêu cầu
  bidName: "",       // Tên của bidder
  durationDays: 7,      // Thời hạn xin được bán (mặc định 7 ngày)
  requestDate: "",      // Ngày gửi yêu cầu (ISO 8601)
  status: "",           // Trạng thái: "chờ duyệt", "đã duyệt", "từ chối"
  approvedBy: "",       // ID người quản trị duyệt (nếu có)
  approvedDate: "",     // Ngày duyệt (nếu có)
};

