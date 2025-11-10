/*
Lịch sử các câu hỏi và câu trả lời 
của những người tham gia đấu giá & người bán
*/

const qaHistory = [
  {
    id: "", // Mã định danh câu hỏi
    bidder: { 
      id: "",    // ID người hỏi (người tham gia đấu giá) 
      name: "",  // Tên người hỏi
    },
    seller: {
      id: "",    // ID người bán
      name: "",  // Tên người bán
    },
    answer: {
      content: "",    // Nội dung trả lời (nếu có)
      timestamp: "",  // Thời điểm trả lời
    },
  },
];
