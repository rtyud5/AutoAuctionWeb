// backend/src/services/autoBid.service.js
// Auto-bid engine: tăng theo bước giá tối thiểu (auction.step_price)
// Quy tắc:
// - Người dùng đặt max_amount (trần).
// - Hệ thống tăng giá theo step_price để vừa đủ dẫn đầu.
// - Nếu nhiều người auto-bid: so sánh max, người có max cao hơn sẽ thắng.
// - Nếu max bằng nhau: người set auto-bid sớm hơn (created_at nhỏ hơn) sẽ thắng.

import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import AutoBidRule from "../models/autoBidRule.model.js";
import BlockedBidder from "../models/blocked_bidder.js";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Resolve auto-bid outcome for an auction at current state.
 * We do NOT simulate every intermediate step; we compute the final leading bid
 * that the platform would place on behalf of the winning auto-bidder.
 *
 * @param {object} params
 * @param {import("sequelize").Transaction} params.transaction
 * @param {number} params.auctionId
 */
export async function runAutoBidEngine({ transaction, auctionId }) {
  const t = transaction;

  const auction = await Auction.findByPk(auctionId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!auction) return { changed: false, finalPrice: 0, finalWinnerId: null };

  // Guard: ended
  const now = new Date();
  if (auction.end_time && new Date(auction.end_time) <= now) {
    return {
      changed: false,
      finalPrice: toNum(auction.current_price),
      finalWinnerId: auction.current_winner_id || null,
    };
  }
  const st = String(auction.status || "").toUpperCase();
  if (st === "ENDED" || st === "CANCELLED") {
    return {
      changed: false,
      finalPrice: toNum(auction.current_price),
      finalWinnerId: auction.current_winner_id || null,
    };
  }

  const step = Math.max(1, toNum(auction.step_price));
  const currentPrice = toNum(auction.current_price);
  const minToBeat = currentPrice + step;

  // bidders bị block khỏi phiên
  const blocked = await BlockedBidder.findAll({
    where: { auction_id: auctionId },
    attributes: ["bidder_id"],
    transaction: t,
  });
  const blockedSet = new Set((blocked || []).map((x) => x.bidder_id));

  // Active auto-bid rules: sort max desc; tie-breaker by created_at asc then id asc
  const rules = await AutoBidRule.findAll({
    where: { auction_id: auctionId, is_active: true },
    order: [
      ["max_amount", "DESC"],
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
    transaction: t,
  });

  // Eligible rules that can beat current price by at least 1 step
  const eligible = (rules || []).filter((r) => {
    if (!r?.bidder_id) return false;
    if (blockedSet.has(r.bidder_id)) return false;
    const max = toNum(r.max_amount);
    return max >= minToBeat;
  });

  if (!eligible.length) {
    return {
      changed: false,
      finalPrice: currentPrice,
      finalWinnerId: auction.current_winner_id || null,
    };
  }

  // Determine winner & price (proxy bidding)
  const topMax = toNum(eligible[0].max_amount);
  const topCandidates = eligible.filter((r) => toNum(r.max_amount) === topMax);

  // Winner: earliest created_at among topCandidates (eligible already sorted)
  const winnerRule = topCandidates[0];
  const winnerId = winnerRule.bidder_id;

  let secondMax = 0;
  if (eligible.length === 1) {
    secondMax = 0;
  } else if (topCandidates.length >= 2) {
    secondMax = topMax; // tie
  } else {
    secondMax = toNum(eligible[1].max_amount);
  }

  let finalPrice;
  if (eligible.length === 1) {
    finalPrice = Math.min(topMax, minToBeat);
  } else {
    finalPrice = Math.min(topMax, secondMax + step);
  }

  // Safety clamp
  finalPrice = Math.max(finalPrice, minToBeat);
  finalPrice = Math.min(finalPrice, topMax);

  // No change
  const currentWinnerId = auction.current_winner_id || null;
  if (winnerId === currentWinnerId && finalPrice <= currentPrice) {
    return { changed: false, finalPrice: currentPrice, finalWinnerId: currentWinnerId };
  }
  if (finalPrice <= currentPrice) {
    // Cannot improve the auction price, skip.
    return { changed: false, finalPrice: currentPrice, finalWinnerId: currentWinnerId };
  }

  const bid = await Bid.create(
    {
      auction_id: auctionId,
      bidder_id: winnerId,
      amount: finalPrice,
      is_auto: true,
    },
    { transaction: t }
  );

  await auction.update(
    {
      current_price: finalPrice,
      current_winner_id: winnerId,
      winner_bid_id: bid.id,
    },
    { transaction: t }
  );

  return { changed: true, finalPrice, finalWinnerId: winnerId, bidId: bid.id };
}
