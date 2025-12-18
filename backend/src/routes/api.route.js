import { Router } from "express";
import apiController from "../controllers/api.controller.js";

const { askQuestion, answerQuestion } = apiController;
const router = Router();

/**
 * GET /auctions
 * Query: q, category (slug), page, limit, sort = price_asc|price_desc|ending_soon|bids_desc
 */
router.get("/auctions", apiController.listAuctions);

/**
 * GET /auctions/:id
 * Auction detail (JSON) with recent bids, qna, seller rating
 */
router.get("/auctions/:id", apiController.getAuction);

/**
 * GET /categories/:slug
 * List auctions in category (JSON) with pagination + sort
 */
router.get("/categories/:slug", apiController.listAuctionsByCategory);

/**
 * GET /categories
 * Returns category tree
 */
router.get("/categories", apiController.listCategories);

router.post("/products/:productId/questions", askQuestion);
router.post("/questions/:id/answer", answerQuestion);

/**
 * GET /search
 * Same as /auctions but kept for clarity
 */
router.get("/search", apiController.search);

/**
 * GET /search/suggestions
 * Autocomplete suggestions for search
 */
router.get("/search/suggestions", apiController.getSearchSuggestions);

export default router;
