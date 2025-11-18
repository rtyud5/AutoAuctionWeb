import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pageRoutes from "./routes/page.route.js";
import apiRoutes from "./routes/api.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/", pageRoutes);
app.use("/api", apiRoutes);

// 404
app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ success: false, message: "Not found" });
  res.status(404).render("error/404", { title: "Không tìm thấy" });
});

// Error handler
app.use(errorHandler);

export default app;
