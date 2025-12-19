// src/models/index.js
import User from "./user.model.js";
import Product from "./product.model.js";
import Category from "./category.model.js";
import Auction from "./auction.model.js";
import Bid from "./bid.model.js";
import AutoBidRule from "./autoBidRule.model.js";
import BlockedBidder from "./blocked_bidder.js";
import Question from "./question.model.js";
import Answer from "./answer.model.js";
import Rating from "./rating.model.js";
import Order from "./order.model.js";
import OrderMessage from "./order_message.js";
import UpgradeRequest from "./upgradeRequest.model.js";
import WatchList from "./watchList.model.js";
import OtpToken from "./otpToken.model.js";

// ============ KHAI BÁO QUAN HỆ GIỮA CÁC MODEL ============

// User – Product
User.hasMany(Product, { foreignKey: "seller_id" });
Product.belongsTo(User, { as: "seller", foreignKey: "seller_id" });

// Category – Product
Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id" });

// User – Auction
User.hasMany(Auction, { foreignKey: "seller_id" });
Auction.belongsTo(User, { as: "seller", foreignKey: "seller_id" });

// Product – Auction
Product.hasMany(Auction, { foreignKey: "product_id" });
Auction.belongsTo(Product, { foreignKey: "product_id" });

// Auction – Bid
Auction.hasMany(Bid, { foreignKey: "auction_id" });
Bid.belongsTo(Auction, { foreignKey: "auction_id" });

// User – Bid
User.hasMany(Bid, { foreignKey: "bidder_id" });
Bid.belongsTo(User, { as: "bidder", foreignKey: "bidder_id" });

// Auction – AutoBidRule
Auction.hasMany(AutoBidRule, { foreignKey: "auction_id" });
AutoBidRule.belongsTo(Auction, { foreignKey: "auction_id" });

// User – AutoBidRule
User.hasMany(AutoBidRule, { foreignKey: "bidder_id" });
AutoBidRule.belongsTo(User, { as: "bidder", foreignKey: "bidder_id" });

// Auction – BlockedBidder
Auction.hasMany(BlockedBidder, { foreignKey: "auction_id" });
BlockedBidder.belongsTo(Auction, { foreignKey: "auction_id" });

// User – BlockedBidder
User.hasMany(BlockedBidder, { foreignKey: "bidder_id" });
BlockedBidder.belongsTo(User, {
  as: "blockedBidder",
  foreignKey: "bidder_id",
});

// Auction – Question
Auction.hasMany(Question, { foreignKey: "auction_id" });
Question.belongsTo(Auction, { foreignKey: "auction_id" });

// User – Question (asker)
User.hasMany(Question, { foreignKey: "asker_id" });
Question.belongsTo(User, { as: "asker", foreignKey: "asker_id" });

// Question – Answer
Question.hasMany(Answer, { foreignKey: "question_id" });
Answer.belongsTo(Question, { foreignKey: "question_id" });

// User – Answer (seller trả lời)
User.hasMany(Answer, { foreignKey: "seller_id" });
Answer.belongsTo(User, { as: "seller", foreignKey: "seller_id" });

// Auction – Order (1 phiên đấu giá -> 1 đơn hàng thắng)
Auction.hasOne(Order, { foreignKey: "auction_id" });
Order.belongsTo(Auction, { foreignKey: "auction_id" });

// User – Order (seller, buyer)
User.hasMany(Order, { as: "Sales", foreignKey: "seller_id" });
User.hasMany(Order, { as: "Purchases", foreignKey: "buyer_id" });
Order.belongsTo(User, { as: "seller", foreignKey: "seller_id" });
Order.belongsTo(User, { as: "buyer", foreignKey: "buyer_id" });

// Order – OrderMessage
Order.hasMany(OrderMessage, { foreignKey: "order_id" });
OrderMessage.belongsTo(Order, { foreignKey: "order_id" });

// User – OrderMessage
User.hasMany(OrderMessage, { foreignKey: "sender_id" });
OrderMessage.belongsTo(User, { as: "sender", foreignKey: "sender_id" });

// Order – Rating
Order.hasMany(Rating, { foreignKey: "order_id" });
Rating.belongsTo(Order, { foreignKey: "order_id" });

// User – Rating (rater, target)
User.hasMany(Rating, { as: "GivenRatings", foreignKey: "rater_id" });
User.hasMany(Rating, {
  as: "ReceivedRatings",
  foreignKey: "target_user_id",
});
Rating.belongsTo(User, { as: "rater", foreignKey: "rater_id" });
Rating.belongsTo(User, {
  as: "targetUser",
  foreignKey: "target_user_id",
});

// User – UpgradeRequest
User.hasMany(UpgradeRequest, { foreignKey: "user_id" });
UpgradeRequest.belongsTo(User, { foreignKey: "user_id" });

// Admin – UpgradeRequest
User.hasMany(UpgradeRequest, {
  as: "HandledUpgradeRequests",
  foreignKey: "admin_id",
});
UpgradeRequest.belongsTo(User, { as: "admin", foreignKey: "admin_id" });

// User – WatchList
User.hasMany(WatchList, { foreignKey: "user_id" });
WatchList.belongsTo(User, { foreignKey: "user_id" });

// Auction – WatchList
Auction.hasMany(WatchList, { foreignKey: "auction_id" });
WatchList.belongsTo(Auction, { foreignKey: "auction_id" });

// Export tất cả model để dùng ở controller/service
export {
  User,
  Product,
  Category,
  Auction,
  Bid,
  AutoBidRule,
  BlockedBidder,
  Question,
  Answer,
  Rating,
  Order,
  OrderMessage,
  UpgradeRequest,
  WatchList,
  OtpToken,
};
