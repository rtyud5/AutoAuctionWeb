/*
Xin được bán trong vòng 7 ngày
Bidder gửi yêu cầu xin được upgrage thành seller
Ban quản trị sẽ duyệt yêu cầu này
*/

import db from "../config/db.js";

const upgradeRequest = {
  id:"",
  user_id:"",
  status:{PENDING, APPROVED, REJECTED},
  admin_id:"",
  note:"",
  created_at:"",
  updated_at:"",
};

