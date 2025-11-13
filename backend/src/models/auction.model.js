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

/* Thông tin sản phẩm đấu giá */
const auctionItem = {
  id: "",              // Mã định danh sản phẩm đấu giá
  product_id:"",
  seller_id:"",
  start_price,
  step_price,
  current_price,
  current_winner_id:{
    id:"",
    name:null,
  },
  start_time:"",
  end_time:"",
  auto_extend:true,
  status:{PENDING, RUNNING, ENDED, CANCELLED},
  winner_id:"",
  winner_bid_id:"",
  created_at:"",
};

/*
id


product_id


seller_id (redundant cho query nhanh)


start_price


step_price


current_price


current_winner_id (FK users.id, nullable)


start_time


end_time


auto_extend (bool) – theo config hệ thống


status (PENDING, RUNNING, ENDED, CANCELLED)


winner_id (khi kết thúc)


winner_bid_id


created_at

*/