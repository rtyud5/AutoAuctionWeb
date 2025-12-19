// Basic Nodemailer transporter config placeholder
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  // Gmail SMTP notes:
  // - Port 465: secure = true (implicit TLS)
  // - Port 587: secure = false (STARTTLS)
  secure:
    String(process.env.MAIL_SECURE || "").toLowerCase() === "true" ||
    Number(process.env.MAIL_PORT || 587) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
