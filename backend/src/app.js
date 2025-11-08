const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// TODO: các route khác sẽ add sau

// đặt cuối cùng
app.use(errorHandler);

module.exports = app;
