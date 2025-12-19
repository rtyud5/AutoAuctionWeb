import db from '../config/db.js';

/*
  Order controller — 1:1 map to routes/order.route.js
  Implement real business logic later. Current functions are safe stubs
  with basic DB interactions where straightforward.
*/

const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { items, shippingAddress, paymentMethod } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Items required' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [orderResult] = await conn.query(
        'INSERT INTO orders (user_id, shipping_address, payment_method, status, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, JSON.stringify(shippingAddress || {}), paymentMethod || null, 'pending']
      );
      const orderId = orderResult.insertId;

      for (const it of items) {
        await conn.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, it.productId, it.quantity, it.price || 0]
        );
      }

      await conn.commit();
      return res.status(201).json({ success: true, data: { orderId } });
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('order.createOrder', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Lấy tất cả đơn hàng của user
    const [rows] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('order.listMyOrders', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [[order]] = await db.query(
      'SELECT * FROM orders WHERE id = ? LIMIT 1',
      { replacements: [id], raw: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // allow owner or admin (assume admin middleware already enforces for admin endpoints)
    if (order.user_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [items] = await db.query('SELECT product_id, quantity, price FROM order_items WHERE order_id = ?', [id]);
    return res.json({ success: true, data: { order, items } });
  } catch (err) {
    console.error('order.getOrderById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const buyerSubmit = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const { paymentInfo, shippingAddress } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // basic ownership check
    const [[order]] = await db.query('SELECT user_id FROM orders WHERE id = ? LIMIT 1', [id]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    await db.query(
      'UPDATE orders SET payment_info = ?, shipping_address = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(paymentInfo || {}), JSON.stringify(shippingAddress || {}), 'paid', id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('order.buyerSubmit', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const sellerConfirm = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const id = req.params.id;
    // isSeller middleware should ensure seller privileges
    const { trackingNumber, notes } = req.body;

    await db.query('UPDATE orders SET status = ?, tracking_number = ?, seller_notes = ?, updated_at = NOW() WHERE id = ?', [
      'processing',
      trackingNumber || null,
      notes || null,
      id
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.sellerConfirm', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const buyerConfirm = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;

    const [[order]] = await db.query('SELECT user_id FROM orders WHERE id = ? LIMIT 1', [id]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    await db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', ['completed', id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.buyerConfirm', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const rateOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const { rating, comment, targetUserId } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Invalid rating' });

    await db.query('INSERT INTO ratings (order_id, from_user_id, to_user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, NOW())', [
      id,
      userId,
      targetUserId || null,
      rating,
      comment || null
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.rateOrder', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrderChat = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;

    // basic access check omitted for brevity
    const [rows] = await db.query('SELECT id, sender_id, message, created_at FROM order_chats WHERE order_id = ? ORDER BY created_at ASC', [id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('order.getOrderChat', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const postOrderChat = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = req.params.id;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });

    await db.query('INSERT INTO order_chats (order_id, sender_id, message, created_at) VALUES (?, ?, ?, NOW())', [id, userId, message]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.postOrderChat', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listAllOrders = async (req, res) => {
  try {
    // admin only (middleware should enforce)
    const [rows] = await db.query('SELECT id, user_id, status, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 1000');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('order.listAllOrders', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    await db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.updateOrderStatus', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('order.deleteOrder', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const paymentWebhook = async (req, res) => {
  try {
    // webhook body is raw JSON (route expects express.raw)
    const payload = req.body;
    // TODO: verify signature / process payment notification
    console.log('payment webhook received', payload);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('order.paymentWebhook', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  createOrder,
  listMyOrders,
  getOrderById,
  buyerSubmit,
  sellerConfirm,
  buyerConfirm,
  rateOrder,
  getOrderChat,
  postOrderChat,
  listAllOrders,
  updateOrderStatus,
  deleteOrder,
  paymentWebhook
};