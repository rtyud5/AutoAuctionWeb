import express from "express";
import expressLayouts from "express-ejs-layouts";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pageRoutes from "./routes/page.route.js";
import apiRoutes from "./routes/api.route.js";
import authRoutes from "./routes/auth.route.js";
import bidderRoutes from "./routes/bidder.route.js";
import sellerRoutes from "./routes/seller.route.js";
import adminRoutes from "./routes/admin.route.js";
import orderRoutes from "./routes/order.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { attachUser } from "./middlewares/auth.middleware.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View engine
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");

// To support layout("...") in EJS
import ejs from "ejs";
app.engine("ejs", (pathFile, data, cb) => {
  if (!data.layout) {
    data.layout = function(layoutPath) {
      this._layoutFile = layoutPath;
    };
  }
  ejs.renderFile(pathFile, data, {}, cb);
});

// Static
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(attachUser);

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use("/", pageRoutes);
app.use("/api", apiRoutes);

// auth routes (login/register/logout API)
app.use("/auth", authRoutes);

// bidder/user routes (contains /me, watchlist, bids, bid endpoints)
// mount on root so routes like /me and /auctions/:id/bid work as expected
app.use("/", bidderRoutes);

// seller routes (mounted under /seller)
app.use("/seller", sellerRoutes);

// admin routes (mounted under /admin)
app.use("/admin", adminRoutes);

// orders & chat (mounted under /orders)
app.use("/orders", orderRoutes);

// 404
app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ success: false, message: "Not found" });
  res.status(404).render("error/404", { title: "Không tìm thấy" });
});

// Error handler
app.use(errorHandler);

export default app;
