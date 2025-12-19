// backend/src/services/auctionSettlement.service.js
// Periodically settles auctions that have reached end_time.
// - Marks auction as ENDED
// - Sets winner_id to current_winner_id (if any)
// - Creates Order for winner (if any)
// - Sends notification emails (seller, winner)

import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import sequelize from "../config/db.js";
import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import Order from "../models/order.model.js";

import {
  notifyAuctionEndedNoWinner,
  notifyAuctionEndedWithWinner,
} from "./notification.service.js";

const BATCH_SIZE = Number.parseInt(process.env.AUCTION_SETTLE_BATCH_SIZE || "30", 10);

export async function settleExpiredAuctions() {
  const now = new Date();

  // Find candidate auctions (light query). We'll re-check inside transaction.
  const auctions = await Auction.findAll({
    where: {
      end_time: { [Op.ne]: null, [Op.lte]: now },
      status: { [Op.notIn]: ["ENDED", "CANCELLED"] },
    },
    attributes: ["id"],
    limit: Number.isFinite(BATCH_SIZE) ? BATCH_SIZE : 30,
    order: [["end_time", "ASC"], ["id", "ASC"]],
  });

  if (!auctions?.length) return { processed: 0 };

  let processed = 0;

  for (const a of auctions) {
    const auctionId = a.id;
    let emailTask = null;

    try {
      await sequelize.transaction(async (t) => {
        const auction = await Auction.findByPk(auctionId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!auction) return;

        const st = String(auction.status || "").toUpperCase();
        if (st === "ENDED" || st === "CANCELLED") return;

        if (!auction.end_time || new Date(auction.end_time) > new Date()) {
          // End time changed or not yet ended
          return;
        }

        const winnerId = auction.current_winner_id || null;
        const finalPrice = Number(auction.current_price || auction.start_price || 0);

        // Ensure winner_bid_id is set if we have a winner
        let winnerBidId = auction.winner_bid_id || null;
        if (winnerId && !winnerBidId) {
          const topBid = await Bid.findOne({
            where: { auction_id: auctionId },
            order: [["amount", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]],
            transaction: t,
          });
          winnerBidId = topBid?.id || null;
        }

        await auction.update(
          {
            status: "ENDED",
            winner_id: winnerId,
            winner_bid_id: winnerBidId,
          },
          { transaction: t }
        );

        if (winnerId) {
          // Ensure an order exists for the winner
          const existing = await Order.findOne({
            where: { auction_id: auctionId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!existing) {
            await Order.create(
              {
                auction_id: auctionId,
                seller_id: auction.seller_id,
                buyer_id: winnerId,
                status: "WAIT_BUYER_INFO",
                buyer_info: null,
              },
              { transaction: t }
            );
          }

          emailTask = { type: "WINNER", winnerId, finalPrice };
        } else {
          emailTask = { type: "NO_WINNER" };
        }
      });

      processed += 1;

      // Send emails after transaction commits
      if (emailTask?.type === "WINNER") {
        await notifyAuctionEndedWithWinner({
          auctionId,
          winnerId: emailTask.winnerId,
          finalPrice: emailTask.finalPrice,
        });
      } else if (emailTask?.type === "NO_WINNER") {
        await notifyAuctionEndedNoWinner({ auctionId });
      }
    } catch (err) {
      console.error("settleExpiredAuctions error (auctionId=" + auctionId + "):", err);
      // Continue processing other auctions
    }
  }

  return { processed };
}
