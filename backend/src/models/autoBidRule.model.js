/*
Hệ thống kiểm tra điểm đánh giá (+/±) hơn 80% thì mới cho phép ra giá
Bidder được đánh giá 10 lần, có 8+ và 2-, vậy điểm của bidder này là 8/10 ~ 80%, được phép tham gia đấu giá sản phẩm
Bidder chưa từng được đánh giá được phép ra giá sản phẩm trong trường hợp người bán cho phép
Hệ thống đề nghị giá hợp lệ (giá hiện tại + bước giá do người bán thiết lập)
Hệ thống yêu cầu xác nhận
*/

const biddingSystem = {
 id:"",
 auction_id:"",
 bidder_id:"",
 max_amount,
 is_active:true,
 created_at:"",
};