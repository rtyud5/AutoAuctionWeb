/*Tên bidder, câu hỏi của bidder, tên seller */
import db from "../config/db.js";

export const Question_Model = {
  idQuestion:"",   //Id câu hỏi
  bidderName: "",  // Tên người hỏi (bidder)
  question: "",    // Nội dung câu hỏi của bidder
  sellerName: "",  // Tên người bán (seller)
};
