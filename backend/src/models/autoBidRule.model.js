/*
Hệ thống kiểm tra điểm đánh giá (+/±) hơn 80% thì mới cho phép ra giá
Bidder được đánh giá 10 lần, có 8+ và 2-, vậy điểm của bidder này là 8/10 ~ 80%, được phép tham gia đấu giá sản phẩm
Bidder chưa từng được đánh giá được phép ra giá sản phẩm trong trường hợp người bán cho phép
Hệ thống đề nghị giá hợp lệ (giá hiện tại + bước giá do người bán thiết lập)
Hệ thống yêu cầu xác nhận
*/

const biddingSystem = {
  bidder: {
    id: "",             // ID người mua (bidder)
    name: "",           // Tên người mua
    totalRatings: 0,    // Tổng số lượt được đánh giá
    positiveRatings: 0, // Số lượt được đánh giá tích cực (+)
    negativeRatings: 0, // Số lượt được đánh giá tiêu cực (−)
    scorePercent: 0,    // Điểm phần trăm (positiveRatings / totalRatings * 100)
    isAllowedToBid: false, // Có được phép ra giá hay không (true/false)
  },

  seller: {
    id: "",             // ID người bán
    name: "",           // Tên người bán
    allowUnratedBidders: false, // Người bán có cho phép bidder chưa được đánh giá tham gia không
  },

  auctionItem: {
    id: "",             // Mã sản phẩm đấu giá
    name: "",           // Tên sản phẩm
    currentPrice: 0,    // Giá hiện tại
    bidStep: 0,         // Bước giá
    suggestedBid: 0,    // Giá hệ thống đề nghị (currentPrice + bidStep)
  },

  confirmation: {
    required: true,     // Có yêu cầu xác nhận trước khi gửi giá không
    confirmed: false,   // Trạng thái người mua đã xác nhận chưa
    timestamp: "",      // Thời điểm xác nhận
  },
};