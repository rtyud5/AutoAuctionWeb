import jwt from "jsonwebtoken";

export const signToken = (payload, expiresIn = "1d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
