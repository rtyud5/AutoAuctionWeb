// backend/src/models/otpToken.model.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/*
  OTP token storage (for registration & password reset)

  Security notes:
  - Store OTP as a bcrypt hash so the raw OTP is never persisted.
  - Tokens are single-use (consumed_at) and time-limited (expires_at).
  - attempts can be used to rate-limit brute-force (basic).
*/

const OtpToken = sequelize.define(
  "OtpToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { isEmail: true },
    },

    purpose: {
      type: DataTypes.ENUM("REGISTER", "RESET_PASSWORD"),
      allowNull: false,
    },

    otp_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "bcrypt hash of OTP",
    },

    payload: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Optional payload used after OTP verification",
    },

    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "otp_tokens",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["email", "purpose"] },
      { fields: ["expires_at"] },
    ],
  }
);

export default OtpToken;
