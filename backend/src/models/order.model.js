/*Lưu tên người đặt, thời gian đấu giá(ngày, 
tháng,năm và giờ phút), giá, tên sản phẩm */
const bidRecord = {
  bidderName: "",   // Tên người đặt giá
  bidTime: {        // Thời gian đấu giá
    day: 0,         // Ngày
    month: 0,       // Tháng
    year: 0,        // Năm
    hour: 0,        // Giờ
    minute: 0,      // Phút
  },
  bidAmount: 0,     // Giá ra (đơn vị: VNĐ)
  productName: "",  // Tên sản phẩm được đấu giá
};