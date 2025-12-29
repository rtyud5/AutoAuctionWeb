import db from "../src/config/db.js";

(async () => {
  try {
    console.log('Testing featured/suggested queries...');

    const [endingSoon] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN auctions a ON a.product_id = p.id AND a.status = 'RUNNING'
       WHERE p.status = 'APPROVED'
       ORDER BY p.created_at DESC 
       LIMIT 5`,
      { raw: true }
    );

    const [highestPrice] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       INNER JOIN auctions a ON a.product_id = p.id AND a.status = 'RUNNING'
       WHERE p.status = 'APPROVED'
       ORDER BY a.current_price DESC 
       LIMIT 5`,
      { raw: true }
    );

    const [mostBids] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       INNER JOIN auctions a ON a.product_id = p.id AND a.status = 'RUNNING'
       WHERE p.status = 'APPROVED'
       GROUP BY p.id, p.title, p.thumbnail, p.short_description, c.name, u.name,
                a.start_price, a.current_price, a.end_time, a.id
       ORDER BY bid_count DESC
       LIMIT 5`,
      { raw: true }
    );

    console.log('endingSoon rows:', endingSoon.length);
    console.log('highestPrice rows:', highestPrice.length);
    console.log('mostBids rows:', mostBids.length);

    if (endingSoon.length) console.log('endingSoon sample:', endingSoon[0]);
    if (highestPrice.length) console.log('highestPrice sample:', highestPrice[0]);
    if (mostBids.length) console.log('mostBids sample:', mostBids[0]);

    process.exit(0);
  } catch (err) {
    console.error('Error running queries:', err);
    process.exit(1);
  }
})();
