// backend/src/config/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { URL } from "url";
dotenv.config();

const isTruthy = (v) => String(v || "").toLowerCase() === "true";

const host = process.env.MAIL_HOST;
const port = Number(process.env.MAIL_PORT || 587);

if (!host) {
  console.warn("[MAIL] MAIL_HOST is not set. Email sending may fail.");
}

const secure =
  isTruthy(process.env.MAIL_SECURE) || port === 465;

// A stable EHLO/HELO name reduces some spam signals vs "localhost".
const ehloName =
  (process.env.MAIL_EHLO_NAME || "").trim() ||
  (() => {
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "";
    try {
      const { hostname } = new URL(appUrl);
      return hostname;
    } catch {
      return "localhost";
    }
  })();

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure, // 465 true, 587 false + STARTTLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },

  // Force STARTTLS on 587 to avoid falling back to plaintext.
  requireTLS: !secure,

  // Set a deterministic name for EHLO.
  name: ehloName,

  tls: {
    minVersion: "TLSv1.2",
    servername: host,
    // Do NOT disable TLS verification by default.
    rejectUnauthorized: !isTruthy(process.env.MAIL_TLS_INSECURE),
  },

  connectionTimeout: Number(process.env.MAIL_CONN_TIMEOUT || 20_000),
  greetingTimeout: Number(process.env.MAIL_GREET_TIMEOUT || 20_000),
  socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT || 30_000),
});

export default transporter;

