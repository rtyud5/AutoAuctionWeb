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

const auctionProduct = {
  id: "",                    
  seller_id: "",    
  category_id:"",
  title:"",
  short_description:"",
  full_description:"",
  thumbnail:"",
  status:{PENDING, APPROVED, REJECTED, BANNED},
  created_at:"",
};
/*
id


seller_id (FK users.id)


category_id


title


short_description


full_description


thumbnail


status (PENDING, APPROVED, REJECTED, BANNED)


created_at

*/