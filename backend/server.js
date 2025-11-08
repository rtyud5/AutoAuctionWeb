const app = require("./src/app");
const sequelize = require("./src/config/db");

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("? Connected to MySQL");
    // Dev only: tu dong sync model khi co thay doi
    await sequelize.sync();
    console.log("? Models synced");
    app.listen(PORT, () => {
      console.log(`?? Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("? Failed to start server:", err.message);
    process.exit(1);
  }
})();
