// backend/src/utils/email.util.js
// Utilities to reduce spam signals for transactional emails:
// - Ensure From aligns with authenticated SMTP user when needed
// - Provide text/plain fallback
// - Add safe transactional headers

import { URL } from "url";

const isTruthy = (v) => String(v || "").toLowerCase() === "true";

export const getAppHost = () => {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "";
  try {
    const u = new URL(appUrl);
    return u.hostname;
  } catch {
    return null;
  }
};

export const buildFromHeader = () => {
  const mailUser = (process.env.MAIL_USER || "").trim();
  const fromRaw = (process.env.MAIL_FROM || "").trim();
  const fromName = (process.env.MAIL_FROM_NAME || "PTUDW Auction").trim();

  // If MAIL_FORCE_FROM_AUTH is enabled, always use MAIL_USER as the From address.
  if (isTruthy(process.env.MAIL_FORCE_FROM_AUTH) && mailUser) {
    return fromName ? `${fromName} <${mailUser}>` : mailUser;
  }

  // If MAIL_FROM is not set, fall back to MAIL_USER.
  if (!fromRaw) {
    if (!mailUser) return null;
    return fromName ? `${fromName} <${mailUser}>` : mailUser;
  }

  // If the host is Gmail/Google SMTP, alignment is strict; prefer MAIL_USER to avoid spoofing.
  const host = String(process.env.MAIL_HOST || "").toLowerCase();
  const looksLikeGmail =
    host.includes("gmail") || host.includes("google");

  if (looksLikeGmail && mailUser) {
    return fromName ? `${fromName} <${mailUser}>` : mailUser;
  }

  return fromName && !fromRaw.includes("<")
    ? `${fromName} <${fromRaw}>`
    : fromRaw;
};

export const buildReplyTo = () => {
  const v = (process.env.MAIL_REPLY_TO || "").trim();
  return v || undefined;
};

// Very simple HTML -> text conversion to provide a plain-text alternative.
// This is intentionally conservative (no fancy formatting).
export const htmlToText = (html = "") => {
  const s = String(html || "");
  return s
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p\b[^>]*>/gi, "\n")
    .replace(/<\/?div\b[^>]*>/gi, "\n")
    .replace(/<\/?h\d\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, " - ")
    .replace(/<\/?ul\b[^>]*>/gi, "\n")
    .replace(/<\/?ol\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const makeMailOptions = ({ to, subject, html, text }) => {
  const from = buildFromHeader();
  if (!from) throw new Error("MAIL_FROM/MAIL_USER is not configured");

  const replyTo = buildReplyTo();
  const appHost = getAppHost();

  const mailUser = (process.env.MAIL_USER || "").trim();
  const envelopeFrom = (process.env.MAIL_ENVELOPE_FROM || mailUser || "").trim();

  // IMPORTANT:
  // - "sender" helps some providers understand the authenticated sender.
  // - "envelope.from" controls the SMTP MAIL FROM (Return-Path), when the SMTP server permits it.
  // For Gmail SMTP, Return-Path is typically forced to the authenticated account anyway.
  const headers = {
    "Auto-Submitted": "auto-generated",
    "X-Auto-Response-Suppress": "All",
    "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };

  if (appHost) headers["X-App-Host"] = appHost;

  const finalText = (text || "").trim() || htmlToText(html || "");

  return {
    from,
    to,
    subject,
    text: finalText,
    html,
    replyTo,
    sender: mailUser || undefined,
    envelope: envelopeFrom ? { from: envelopeFrom, to } : undefined,
    headers,
  };
};
