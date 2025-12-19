// backend/src/services/notification.service.js
// Transactional notification emails for key marketplace events.

import dotenv from "dotenv";
dotenv.config();

import { transporter } from "../config/mailer.js";

import Auction from "../models/auction.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Question from "../models/question.model.js";
import Answer from "../models/answer.model.js";

const fmtVnd = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0 VND";
  return `${Math.round(x).toLocaleString("vi-VN")} VND`;
};

const getAppUrl = () => {
  const env = String(process.env.APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  const port = process.env.PORT || 4000;
  return `http://localhost:${port}`;
};

const safeSendMail = async ({ to, subject, html }) => {
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  if (!from) {
    console.warn("[MAIL] MAIL_FROM/MAIL_USER is not configured. Skip sending.");
    return;
  }
  if (!to) return;

  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error("[MAIL] sendMail failed:", err?.message || err);
    // In dev, allow continuing without crashing user flows.
    const debug = String(process.env.MAIL_DEBUG_CONSOLE || "").toLowerCase() === "true";
    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
    if (debug && !isProd) {
      console.log(`\n[MAIL_DEBUG] To: ${to}\nSubject: ${subject}\n${html}\n`);
      return;
    }
    // Do not throw to avoid breaking core transaction flows.
  }
};

const getAuctionContext = async ({ auctionId, transaction = null }) => {
  const auction = await Auction.findByPk(auctionId, {
    include: [
      { model: Product },
      { model: User, as: "seller" },
    ],
    transaction,
  });
  if (!auction) return null;
  const product = auction.Product;
  const seller = auction.seller;
  return {
    auction,
    product,
    seller,
    productUrl: `${getAppUrl()}/product/${product?.id ?? ""}`,
  };
};

/**
 * Ra giá thành công / giá sản phẩm được cập nhật
 * - Gửi người bán
 * - Gửi người ra giá
 * - Gửi người giữ giá trước đó (nếu có)
 */
export const notifyBidSuccess = async ({
  auctionId,
  bidderId,
  amount,
  previousWinnerId = null,
  isAuto = false,
}) => {
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;

  const { product, seller, productUrl } = ctx;
  const bidder = await User.findByPk(bidderId);
  const prev = previousWinnerId ? await User.findByPk(previousWinnerId) : null;

  const subject = "[PTUDW Auction] Giá sản phẩm được cập nhật";
  const title = product?.title || "Sản phẩm";
  const priceStr = fmtVnd(amount);
  const bidType = isAuto ? "Auto-bid" : "Ra giá";

  const baseHtml = (body) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
      <h3 style="margin:0 0 10px;">${title}</h3>
      ${body}
      <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
    </div>
  `;

  // 1) Seller
  if (seller?.email) {
    await safeSendMail({
      to: seller.email,
      subject,
      html: baseHtml(
        `<p><b>${bidType} thành công</b>. Giá hiện tại được cập nhật: <b>${priceStr}</b>.</p>
         <p>Người ra giá: <b>${bidder?.name || "Ẩn danh"}</b></p>`
      ),
    });
  }

  // 2) New bidder
  if (bidder?.email) {
    await safeSendMail({
      to: bidder.email,
      subject,
      html: baseHtml(
        `<p><b>${bidType} thành công</b>. Giá hiện tại của sản phẩm là: <b>${priceStr}</b>.</p>`
      ),
    });
  }

  // 3) Previous holder (if any, and not the same)
  if (prev?.email && Number(prev.id) !== Number(bidderId)) {
    await safeSendMail({
      to: prev.email,
      subject,
      html: baseHtml(
        `<p>Bạn vừa bị <b>vượt giá</b>. Giá hiện tại của sản phẩm là: <b>${priceStr}</b>.</p>`
      ),
    });
  }
};

/**
 * Người mua bị từ chối ra giá
 */
export const notifyBidRejected = async ({ auctionId, bidderId, reason }) => {
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;
  const { product, productUrl } = ctx;
  const bidder = await User.findByPk(bidderId);
  if (!bidder?.email) return;

  const subject = "[PTUDW Auction] Bạn không thể tham gia ra giá";
  const title = product?.title || "Sản phẩm";

  await safeSendMail({
    to: bidder.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
        <h3 style="margin:0 0 10px;">${title}</h3>
        <p>Yêu cầu ra giá / auto-bid / mua ngay của bạn đã bị từ chối.</p>
        <p><b>Lý do:</b> ${String(reason || "Không đủ điều kiện tham gia phiên này.")}</p>
        <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
      </div>
    `,
  });
};

/**
 * Đấu giá kết thúc, không có người mua
 * - Gửi người bán
 */
export const notifyAuctionEndedNoWinner = async ({ auctionId }) => {
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;
  const { product, seller, productUrl } = ctx;
  if (!seller?.email) return;
  const subject = "[PTUDW Auction] Đấu giá kết thúc (không có người mua)";
  await safeSendMail({
    to: seller.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
        <h3 style="margin:0 0 10px;">${product?.title || "Sản phẩm"}</h3>
        <p>Phiên đấu giá đã kết thúc và <b>không có người mua</b>.</p>
        <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
      </div>
    `,
  });
};

/**
 * Đấu giá kết thúc (có người thắng)
 * - Gửi người bán
 * - Gửi người thắng
 */
export const notifyAuctionEndedWithWinner = async ({ auctionId, winnerId, finalPrice }) => {
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;
  const { product, seller, productUrl } = ctx;
  const winner = await User.findByPk(winnerId);

  const subject = "[PTUDW Auction] Đấu giá kết thúc";
  const priceStr = fmtVnd(finalPrice);
  const title = product?.title || "Sản phẩm";

  if (seller?.email) {
    await safeSendMail({
      to: seller.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
          <h3 style="margin:0 0 10px;">${title}</h3>
          <p>Phiên đấu giá đã kết thúc.</p>
          <p>Người thắng: <b>${winner?.name || "Ẩn danh"}</b></p>
          <p>Giá chốt: <b>${priceStr}</b></p>
          <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
        </div>
      `,
    });
  }

  if (winner?.email) {
    await safeSendMail({
      to: winner.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
          <h3 style="margin:0 0 10px;">${title}</h3>
          <p>Chúc mừng! Bạn đã <b>thắng đấu giá</b>.</p>
          <p>Giá chốt: <b>${priceStr}</b></p>
          <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
        </div>
      `,
    });
  }
};

/**
 * Người mua đặt câu hỏi -> gửi người bán
 */
export const notifyQuestionAsked = async ({ auctionId, askerId, question }) => {
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;
  const { product, seller, productUrl } = ctx;
  if (!seller?.email) return;
  const asker = await User.findByPk(askerId);

  const subject = "[PTUDW Auction] Có câu hỏi mới về sản phẩm";
  await safeSendMail({
    to: seller.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
        <h3 style="margin:0 0 10px;">${product?.title || "Sản phẩm"}</h3>
        <p><b>${asker?.name || "Một người mua"}</b> đã đặt câu hỏi:</p>
        <div style="padding:10px 12px; background:#f1f5f9; border-radius:10px;">${String(question || "").replace(/</g, "&lt;")}</div>
        <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
      </div>
    `,
  });
};

/**
 * Người bán trả lời -> gửi người mua đặt câu hỏi
 */
export const notifyQuestionAnswered = async ({ questionId, sellerId, answer }) => {
  const q = await Question.findByPk(questionId);
  if (!q) return;

  const auctionId = q.auction_id;
  const ctx = await getAuctionContext({ auctionId });
  if (!ctx) return;
  const { product, productUrl } = ctx;

  const asker = await User.findByPk(q.asker_id);
  if (!asker?.email) return;
  const seller = await User.findByPk(sellerId);

  const subject = "[PTUDW Auction] Người bán đã trả lời câu hỏi của bạn";
  await safeSendMail({
    to: asker.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
        <h3 style="margin:0 0 10px;">${product?.title || "Sản phẩm"}</h3>
        <p>Người bán <b>${seller?.name || ""}</b> đã trả lời câu hỏi của bạn.</p>
        <p><b>Câu hỏi:</b></p>
        <div style="padding:10px 12px; background:#f1f5f9; border-radius:10px;">${String(q.content || "").replace(/</g, "&lt;")}</div>
        <p style="margin:10px 0 0;"><b>Trả lời:</b></p>
        <div style="padding:10px 12px; background:#ecfeff; border-radius:10px;">${String(answer || "").replace(/</g, "&lt;")}</div>
        <p style="margin:10px 0 0; font-size:13px; color:#6b7280;">Link: <a href="${productUrl}">${productUrl}</a></p>
      </div>
    `,
  });
};
