import express from 'express';
const router = express.Router();
import auth from '../middlewares/auth.middleware.js';

// import controller
import bidderController from '../controllers/bidder.controller.js';

// ...existing code...

// thay thế handler inline bằng controller
router.get('/me', auth, bidderController.getProfile);
router.get('/me/watchlist', auth, bidderController.getWatchlist);
router.post('/watchlist/:auctionId', auth, bidderController.addToWatchlist);
router.post('/watchlist/:auctionId/delete', auth, bidderController.removeFromWatchlist);

router.post('/auctions/:id/bid', auth, bidderController.placeBid);
router.post('/auctions/:id/auto-bid', auth, bidderController.setAutoBid);
router.post('/auctions/:id/buy', auth, bidderController.buyNow);

router.get('/me/bids', auth, bidderController.listBids);
router.get('/me/won', auth, bidderController.listWon);
router.get('/me/upgrade-request', auth, bidderController.showUpgradeRequestForm);
router.post('/me/upgrade-request', auth, bidderController.createUpgradeRequest);

// ...existing code...
export default router;