/*Thông tin sản phẩm đấu giá
iPhone 11
Giá khởi điểm 10tr
Bước giá bội 100k*/
/*
Người mua ra giá-tối-đa mà mình có thể trả cho sản phẩm
Giá hiện tại của sản phẩm sẽ liên tục được cập nhật dựa trên 
giá-tối-đa và giá-tối-đa-của-người-mua-khác
Nếu 2 bidder ra cùng mức giá, bidder ra giá trước được 
ghi nhận là người-ra-giá-cao-nhất
 */

import db from "../config/db.js";

/* Thông tin sản phẩm đấu giá */

export const Auction_Model = {
  id: "",              // Mã định danh sản phẩm đấu giá
  name: "",            // Tên sản phẩm (vd: "iPhone 11")
  startingPrice: 0,    // Giá khởi điểm (vd: 10000000)
  bidStep: 0,          // Bước giá bội (vd: 100000)
  currentPrice: 0,     // Giá hiện tại của sản phẩm
  highestBidderId: "", // ID người đang giữ giá cao nhất
  bids: [              // Danh sách tất cả các lượt ra giá
    {
      bidderId: "",    // ID người ra giá
      bidderName: "",  // Tên người ra giá
      timestamp: "",   // Thời điểm ra giá (ISO 8601)
    },
  ],
  endTime: "",         // Thời điểm kết thúc đấu giá
};
