/*
Mật khẩu 
Thông tin
Họ tên
Địa chỉ
Email
*/

import db from "../config/db.js";

export const User_Model = {
  userId: "",       // ID người dùng
  password: "",     // Mật khẩu (nên lưu hashed)
  fullName: "",     // Họ tên
  address: "",      // Địa chỉ
  email: "",        // Email
  additionalInfo: "", // Thông tin khác (tuỳ chọn)
};
