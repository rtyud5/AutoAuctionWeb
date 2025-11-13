/*Lưu tên người đặt, thời gian đấu giá(ngày, 
tháng,năm và giờ phút), giá, tên sản phẩm */
const bidRecord = {
  id:"",
  auction_id:"",
  seller_id:"",
  buyer_id:"",
  status:{WAIT_BUYER_INFO,WAIT_SELLER_CONFIRM,WAIT_BUYER_CONFIRM,
  COMPLETED,CANCELLED},
  buyer_info:"",
  payment_proof_url:"",
  shipping_proof_url:"",
  created_at:"",
  updated_at:"",
};