import db from "../config/db.js";
import Category from "../models/category.model.js";
import { QueryTypes } from "sequelize";

const listAuctions = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort || "ending_soon";

    const sortMap = {
      price_asc: "a.current_price ASC",
      price_desc: "a.current_price DESC",
      ending_soon: "a.end_time ASC",
      bids_desc: "COALESCE(a.bids_count, b.cnt) DESC",
    };
    const orderBy = sortMap[sort] || sortMap.ending_soon;

    let where = ["1=1"];
    const params = [];

    if (q) {
      where.push("(a.title LIKE ? OR a.description LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    if (req.query.category) {
      const [catRows] = await db.query(
        "SELECT id FROM categories WHERE slug = ? LIMIT 1",
        { replacements: [req.query.category], type: QueryTypes.SELECT }
      );
      const cat = catRows?.[0];
      if (cat) {
        const [childCats] = await db.query(
          "SELECT id FROM categories WHERE parent_id = ?",
          { replacements: [cat.id], type: QueryTypes.SELECT }
        );
        const catIds = [cat.id, ...childCats.map((c) => c.id)];
        where.push(`a.category_id IN (${catIds.map(() => "?").join(",")})`);
        params.push(...catIds);
      } else {
        return res.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0 },
        });
      }
    }

    const whereSQL = "WHERE " + where.join(" AND ");

    const countRows = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM auctions a
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       ${whereSQL}`,
      { replacements: params, type: QueryTypes.SELECT }
    );
    const total = countRows?.[0]?.cnt || 0;

    const rows = await db.query(
      `SELECT a.id, a.title, a.current_price, a.start_price, a.end_time, COALESCE(b.cnt, 0) AS bids_count
       FROM auctions a
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      { replacements: [...params, limit, offset], type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total },
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getAuction = async (req, res) => {
  try {
    const id = req.params.id;
    const auctionRows = await db.query(
      "SELECT a.*, u.id AS seller_id, u.username AS seller_name FROM auctions a LEFT JOIN users u ON u.id = a.seller_id WHERE a.id = ? LIMIT 1",
      { replacements: [id], type: QueryTypes.SELECT }
    );
    const auction = auctionRows?.[0];
    if (!auction)
      return res.status(404).json({ success: false, message: "Not found" });

    const bids = await db.query(
      "SELECT b.id, b.user_id, b.amount, b.created_at, u.username FROM bids b LEFT JOIN users u ON u.id = b.user_id WHERE b.auction_id = ? ORDER BY b.created_at DESC LIMIT 50",
      { replacements: [id], type: QueryTypes.SELECT }
    );

    const qas = await db.query(
      "SELECT q.id, q.user_id, q.question, q.answer, q.created_at, u.username FROM qna q LEFT JOIN users u ON u.id = q.user_id WHERE q.auction_id = ? ORDER BY q.created_at DESC LIMIT 50",
      { replacements: [id], type: QueryTypes.SELECT }
    );

    const ratingRows = await db.query(
      "SELECT AVG(r.rating) AS avg_rating, COUNT(*) AS total_ratings FROM ratings r WHERE r.seller_id = ?",
      { replacements: [auction.seller_id], type: QueryTypes.SELECT }
    );
    const ratingRow = ratingRows?.[0];

    return res.json({
      success: true,
      data: {
        auction,
        bids,
        qas,
        sellerRating: {
          avg: Number(ratingRow?.avg_rating || 0).toFixed(2),
          count: ratingRow?.total_ratings || 0,
        },
      },
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export async function listCategories(req, res) {
  try {
    // ưu tiên Sequelize
    const rows = await Category.findAll({
      raw: true,
      order: [
        ["parent_id", "ASC"],
        ["name", "ASC"],
      ],
    });
    const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
    const roots = [];
    rows.forEach((r) => {
      const node = byId.get(r.id);
      if (r.parent_id == null) roots.push(node);
      else (byId.get(r.parent_id)?.children || roots).push(node);
    });
    return res.json({ categories: roots });
  } catch (err) {
    console.error(
      "api.listCategories (sequelize) failed, fallback to raw:",
      err
    );
    try {
      const [rows] = await db.query(
        "SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id ASC, name ASC"
      );
      const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
      const roots = [];
      rows.forEach((r) => {
        const node = byId.get(r.id);
        if (r.parent_id == null) roots.push(node);
        else (byId.get(r.parent_id)?.children || roots).push(node);
      });
      return res.json({ categories: roots });
    } catch (e) {
      console.error("api.listCategories (raw) failed:", e);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

const listAuctionsByCategory = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort || "ending_soon";

    const sortMap = {
      price_asc: "a.current_price ASC",
      price_desc: "a.current_price DESC",
      ending_soon: "a.end_time ASC",
      bids_desc: "COALESCE(b.cnt, 0) DESC",
    };
    const orderBy = sortMap[sort] || sortMap.ending_soon;

    const catRows = await db.query(
      "SELECT id FROM categories WHERE slug = ? LIMIT 1",
      { replacements: [slug], type: QueryTypes.SELECT }
    );
    const category = catRows?.[0];
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const childRows = await db.query(
      "SELECT id FROM categories WHERE parent_id = ?",
      { replacements: [category.id], type: QueryTypes.SELECT }
    );
    const catIds = [category.id, ...childRows.map((c) => c.id)];
    const placeholders = catIds.map(() => "?").join(",");

    const countRows = await db.query(
      `SELECT COUNT(*) AS cnt FROM products p 
       JOIN auctions a ON a.product_id = p.id 
       WHERE p.category_id IN (${placeholders})`,
      { replacements: catIds, type: QueryTypes.SELECT }
    );
    const total = countRows?.[0]?.cnt || 0;

    if (total === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total },
      });
    }

    const rows = await db.query(
      `SELECT 
          a.id,
          p.id AS product_id,
          p.title,
          a.current_price,
          a.start_price,
          a.end_time,
          COALESCE(b.cnt, 0) AS bids_count
       FROM products p
       JOIN auctions a ON a.product_id = p.id
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       WHERE p.category_id IN (${placeholders})
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      { replacements: [...catIds, limit, offset], type: QueryTypes.SELECT }
    );

    // Gán images array rỗng, view sẽ fallback về /uploads/products/{product_id}/0.jpg
    const data = rows.map((r) => ({
      ...r,
      images: [], // Để view fallback tự động
    }));

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total },
    });
  } catch (e) {
    console.error("listAuctionsByCategory error:", e.message);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Server error" });
  }
};

const askQuestion = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { question } = req.body;
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!question || !question.trim())
      return res
        .status(400)
        .json({ success: false, message: "Question cannot be empty" });

    // tìm auction_id theo product_id
    const [auctionRows] = await db.query(
      "SELECT id FROM auctions WHERE product_id = ? LIMIT 1",
      { replacements: [productId], raw: true }
    );
    const auctionId = auctionRows?.[0]?.id;
    if (!auctionId)
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });

    await db.query(
      "INSERT INTO questions (auction_id, asker_id, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      { replacements: [auctionId, userId, question.trim()] }
    );

    return res.json({
      success: true,
      message: "Question submitted successfully",
    });
  } catch (e) {
    console.error("askQuestion error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const answerQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    const { answer } = req.body;
    const sellerId = req.user?.id;
    if (!sellerId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!answer || !answer.trim())
      return res
        .status(400)
        .json({ success: false, message: "Answer cannot be empty" });

    // xác minh câu hỏi thuộc auction của seller
    const [rows] = await db.query(
      `SELECT q.id
       FROM questions q
       JOIN auctions a ON a.id = q.auction_id
       WHERE q.id = ? AND a.seller_id = ?
       LIMIT 1`,
      { replacements: [questionId, sellerId], raw: true }
    );
    if (!rows?.length)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    // nếu đã có answer thì cập nhật, chưa có thì tạo mới
    const [hasAnswer] = await db.query(
      `SELECT id FROM answers WHERE question_id = ? LIMIT 1`,
      { replacements: [questionId], raw: true }
    );

    if (hasAnswer?.length) {
      await db.query(
        `UPDATE answers SET content = ?, seller_id = ?, updated_at = NOW() WHERE question_id = ?`,
        { replacements: [answer.trim(), sellerId, questionId] }
      );
    } else {
      await db.query(
        `INSERT INTO answers (question_id, seller_id, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        { replacements: [questionId, sellerId, answer.trim()] }
      );
    }

    return res.json({
      success: true,
      message: "Answer submitted successfully",
    });
  } catch (e) {
    console.error("answerQuestion error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const search = async (req, res) => {
  // reuse listAuctions logic
  return listAuctions(req, res);
};

/**
 * GET /api/search/suggestions
 * Autocomplete suggestions dựa trên input của user
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    const limit = Math.min(10, parseInt(req.query.limit) || 8);

    // Nếu query quá ngắn, không trả suggestions
    if (query.length < 1) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchPattern = `%${query}%`;

    // Lấy suggestions từ products (APPROVED only)
    // Ưu tiên: title match trước, sau đó là short_description
    const [rows] = await db.query(
      `SELECT 
        p.title,
        p.id AS product_id,
        c.name AS category_name,
        CASE 
          WHEN p.title LIKE ? THEN 1
          WHEN p.short_description LIKE ? THEN 2
          ELSE 3
        END AS relevance
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'APPROVED'
         AND (p.title LIKE ? OR p.short_description LIKE ?)
       GROUP BY p.id, p.title, c.name
       ORDER BY relevance ASC, p.id DESC
       LIMIT ?`,
      {
        replacements: [
          searchPattern, // CASE WHEN 1
          searchPattern, // CASE WHEN 2
          searchPattern, // WHERE LIKE 1
          searchPattern, // WHERE LIKE 2
          limit,
        ],
        raw: true,
      }
    );

    const suggestions = (rows || []).map((row) => ({
      title: row.title,
      product_id: row.product_id,
      category: row.category_name,
      url: `/product/${row.product_id}`,
    }));

    return res.json({ success: true, suggestions });
  } catch (error) {
    console.error("getSearchSuggestions error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get suggestions",
    });
  }
};

export default {
  listAuctions,
  getAuction,
  listCategories,
  listAuctionsByCategory,
  search,
  askQuestion,
  answerQuestion,
  getSearchSuggestions,
};
