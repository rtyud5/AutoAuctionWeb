// backend/src/services/otp.service.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import OtpToken from "../models/otpToken.model.js";
import { transporter } from "../config/mailer.js";
import { makeMailOptions } from "../utils/email.util.js";

const OTP_LENGTH = Number.parseInt(process.env.OTP_LENGTH || "4", 10);
const OTP_TTL_MINUTES = Number.parseInt(process.env.OTP_TTL_MINUTES || "10", 10);
const OTP_MAX_ATTEMPTS = Number.parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);

export const generateOtp = () => {
  const len = Number.isFinite(OTP_LENGTH) && OTP_LENGTH > 0 ? OTP_LENGTH : 4;
  // Generate numeric OTP with leading zeros preserved
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
};

export const sendOtpEmail = async ({ email, otp, purpose }) => {
  const subject =
    purpose === "REGISTER"
      ? "[PTUDW Auction] Mã OTP xác thực đăng ký"
      : "[PTUDW Auction] Mã OTP đặt lại mật khẩu";

  const title = purpose === "REGISTER" ? "Xác thực đăng ký" : "Đặt lại mật khẩu";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin:0 0 8px;">${title}</h2>
      <p style="margin:0 0 12px;">Mã OTP của bạn là:</p>
      <div style="font-size: 28px; letter-spacing: 6px; font-weight: 700; padding: 10px 14px; background:#f1f5f9; display:inline-block; border-radius: 10px;">
        ${otp}
      </div>
      <p style="margin:12px 0 0; font-size: 13px; color:#6b7280;">
        Mã sẽ hết hạn sau ${OTP_TTL_MINUTES} phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
      </p>
    </div>
  `;

  const text = `${title}

Ma OTP cua ban la: ${otp}

Ma se het han sau ${OTP_TTL_MINUTES} phut. Neu ban khong thuc hien yeu cau nay, vui long bo qua email.`;

  try {
    const mail = makeMailOptions({ to: email, subject, html, text });
    await transporter.sendMail(mail);
  } catch (err) {
    // Helpful dev fallback: allow proceeding by printing OTP to console
    // when mail is not configured correctly.
    const debug = String(process.env.OTP_DEBUG_CONSOLE || "").toLowerCase() === "true";
    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

    console.error("sendOtpEmail failed:", err?.message || err);
    if (debug && !isProd) {
      console.log(`\n[OTP_DEBUG] ${purpose} OTP for ${email}: ${otp}\n`);
      return;
    }
    throw err;
  }
};

export const createOtpToken = async ({ email, purpose, payload = null }) => {
  const otp = generateOtp();
  const otp_hash = await bcrypt.hash(otp, 10);
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate previous active tokens for this email+purpose (defense-in-depth)
  await OtpToken.update(
    { consumed_at: new Date() },
    {
      where: {
        email,
        purpose,
        consumed_at: { [Op.is]: null },
      },
    }
  );

  const token = await OtpToken.create({
    email,
    purpose,
    otp_hash,
    payload,
    expires_at,
    attempts: 0,
  });

  return { token, otp };
};

export const verifyOtpToken = async ({ email, purpose, otp }) => {
  if (!email || !purpose || !otp) {
    return { ok: false, reason: "MISSING" };
  }

  const token = await OtpToken.findOne({
    where: {
      email,
      purpose,
      consumed_at: { [Op.is]: null },
      expires_at: { [Op.gt]: new Date() },
    },
    order: [["id", "DESC"]],
  });

  if (!token) {
    return { ok: false, reason: "NOT_FOUND_OR_EXPIRED" };
  }

  if ((token.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const match = await bcrypt.compare(String(otp), token.otp_hash);
  if (!match) {
    await token.update({ attempts: (token.attempts || 0) + 1 });
    return { ok: false, reason: "INVALID" };
  }

  await token.update({ consumed_at: new Date() });
  return { ok: true, token };
};
