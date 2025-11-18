/*
Mật khẩu 
Thông tin
Họ tên
Địa chỉ
Email
*/

import db from "../config/db.js";

const userProfile = {
  userId: "",       // ID người dùng
  fullName: "",     // Họ tên
  email: "",        // Email
  password_hash:"",
  role:{BIDDER,SELLER,ADMIN},
  positive_count,
  negative_count,
  created_at:"",
  is_active,
};

/*
id (PK)
email (unique)
password_hash
name
role ('BIDDER' | 'SELLER' | 'ADMIN') – guest không lưu DB
is_active (khóa/mở)
positive_count (số đánh giá +)
negative_count (số đánh giá -)
created_at
*/
