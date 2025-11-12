/*Ảnh đại diện (size lớn)
Các ảnh phụ (ít nhất 3 ảnh)
Tên sản phẩm
Giá hiện tại
Giá mua ngay (nếu có)
Thông tin người bán & điểm đánh giá
Thông tin người đặt giá cao nhất hiện tại & điểm đánh giá
Thời điểm đăng
Thời điểm kết thúc
Nếu thời điểm kết thúc ít hơn 3 ngày thì thể hiện theo định dạng tương đối (relative time - 3 ngày nữa, 10 phút nữa, …)
Mô tả chi tiết sản phẩm*/

import db from "../config/db.js";

export const Product_Model = {
  id: "",                     // Mã sản phẩm đấu giá
  name: "",                   // Tên sản phẩm
  mainImage: "",              // Ảnh đại diện (size lớn)
  subImages: ["", "", ""],    // Các ảnh phụ (ít nhất 3 ảnh)
  currentPrice: 0,            // Giá hiện tại
  buyNowPrice: null,          // Giá mua ngay (nếu có, có thể null)
  seller: {                   // Thông tin người bán
    id: "",
    name: "",
    ratingScore: 0,           // Điểm đánh giá (0–100 hoặc theo thang điểm)
  },
  highestBidder: {            // Người đặt giá cao nhất hiện tại
    id: "",
    name: "",
    ratingScore: 0,
  },
  postedAt: "",               // Thời điểm đăng (ISO 8601)
  endsAt: "",                 // Thời điểm kết thúc (ISO 8601)
  relativeEndTime: "",        // Dạng thời gian tương đối nếu còn < 3 ngày (vd: "2 ngày nữa", "10 phút nữa")
  description: "",            // Mô tả chi tiết sản phẩm
};
