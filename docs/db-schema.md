# Database Schema

Tài liệu này mô tả cấu trúc dữ liệu (bảng, cột, khóa, chỉ mục) cho hệ thống "Online Auction".

Mục tiêu: cung cấp cái nhìn rõ ràng về các bảng chính, quan hệ giữa chúng, chỉ mục quan trọng và vài truy vấn mẫu để phát triển và bảo trì.

## Tổng quan thực thể chính

- users: thông tin người dùng (seller, bidder, admin)
- categories: danh mục sản phẩm
- products: sản phẩm do seller tạo
- auctions: phiên đấu giá cho một product
- bids: các lần đặt giá của bidder trên auction
- auto_bid_rules: quy tắc đặt giá tự động cho bidder
- orders: đơn hàng / giao dịch sau khi auction kết thúc
- order_messages: trao đổi liên quan đến đơn hàng
- watchlists: danh sách theo dõi sản phẩm/auction của bidder
- ratings: đánh giá người dùng hoặc sản phẩm
- questions / answers: hệ thống Q&A cho sản phẩm/auction
- images: bảng lưu thông tin ảnh (Cloudinary public_id, url)
- otp_tokens: lưu token OTP tạm thời
- blocked_bidders: danh sách bidder bị cấm
- upgrade_requests: yêu cầu nâng cấp tài khoản

---

## Chi tiết bảng

Ghi chú kiểu dữ liệu: ghi theo khái quát (INT, BIGINT, VARCHAR, TEXT, DATETIME, BOOLEAN, JSON). Điều chỉnh cụ thể theo DBMS (MySQL/MariaDB) trong mã nguồn.

### users

- id (BIGINT) PK, auto increment
- email (VARCHAR) UNIQUE, not null
- password_hash (VARCHAR) not null
- full_name (VARCHAR)
- phone (VARCHAR)
- role (ENUM: 'admin','seller','bidder') default 'bidder'
- reputation (INT) default 0
- is_verified (BOOLEAN) default false
- created_at, updated_at (DATETIME)

Indexes: email (unique), role

Notes: mật khẩu được lưu dưới dạng hash, token xác thực trong `otp_tokens` hoặc hệ thống JWT.

### categories

- id (INT) PK
- name (VARCHAR) unique
- parent_id (INT) nullable (FK -> categories.id)
- created_at, updated_at

Indexes: name

### products

- id (BIGINT) PK
- seller_id (BIGINT) FK -> users.id
- category_id (INT) FK -> categories.id
- title (VARCHAR)
- description (TEXT)
- starting_price (DECIMAL)
- buy_now_price (DECIMAL) nullable
- condition (ENUM: 'new','used')
- status (ENUM: 'draft','published','closed','deleted')
- images (JSON) OR separate images table referencing product_id
- created_at, updated_at

Indexes: seller_id, category_id, FULLTEXT(title, description) if supported

Note: repo có thêm scripts để seed và migration (xem migrations/add_fulltext_index.sql).

### images

- id (BIGINT) PK
- owner_type (ENUM: 'product','user','auction',...) optional
- owner_id (BIGINT)
- public_id (VARCHAR) - Cloudinary id
- url (VARCHAR)
- meta (JSON)
- created_at

Indexes: owner_type+owner_id

### auctions

- id (BIGINT) PK
- product_id (BIGINT) FK -> products.id
- seller_id (BIGINT) FK -> users.id
- start_price (DECIMAL)
- current_price (DECIMAL)
- start_time (DATETIME)
- end_time (DATETIME)
- status (ENUM: 'scheduled','running','settled','cancelled')
- winner_id (BIGINT) nullable -> users.id
- settled_at (DATETIME) nullable
- featured (BOOLEAN) default false
- settings (JSON) optional (e.g., bid_increment rules)
- created_at, updated_at

Indexes: product_id, seller_id, status, end_time (for scheduled job lookups)

Notes: auctionSettlement.service.js chịu trách nhiệm quyết toán và cập nhật trạng thái.

### bids

- id (BIGINT) PK
- auction_id (BIGINT) FK -> auctions.id
- bidder_id (BIGINT) FK -> users.id
- amount (DECIMAL)
- is_auto (BOOLEAN) default false
- created_at (DATETIME)

Indexes: auction_id, bidder_id, (auction_id, created_at)

Constraints: đảm bảo amount > current_price (kiểm tra business logic tại service), optional unique constraint nếu cần để tránh duplicate tx.

### auto_bid_rules (autoBidRule.model.js)

- id (BIGINT) PK
- bidder_id (BIGINT) FK -> users.id
- auction_id (BIGINT) FK -> auctions.id (nullable, nếu global rule áp dụng cho product/category)
- max_amount (DECIMAL)
- increment (DECIMAL) optional
- active (BOOLEAN)
- created_at, updated_at

Indexes: bidder_id, auction_id

### watchlists (watchList.model.js)

- id (BIGINT) PK
- user_id (BIGINT) FK -> users.id
- product_id (BIGINT) FK -> products.id
- created_at

Indexes: user_id, product_id

### orders

- id (BIGINT) PK
- auction_id (BIGINT) FK -> auctions.id
- buyer_id (BIGINT) FK -> users.id
- seller_id (BIGINT) FK -> users.id
- amount (DECIMAL)
- status (ENUM: 'pending','paid','shipped','completed','cancelled')
- payment_meta (JSON)
- created_at, updated_at

Indexes: buyer_id, seller_id, status

### order_messages

- id (BIGINT) PK
- order_id (BIGINT) FK -> orders.id
- sender_id (BIGINT) FK -> users.id
- message (TEXT)
- attachments (JSON)
- created_at

Indexes: order_id

### ratings

- id (BIGINT) PK
- author_id (BIGINT) FK -> users.id
- target_user_id (BIGINT) FK -> users.id
- auction_id (BIGINT) FK -> auctions.id nullable
- score (INT)
- comment (TEXT)
- created_at

Indexes: target_user_id

### questions / answers

- questions
	- id PK
	- product_id FK
	- author_id FK
	- body TEXT
	- created_at

- answers
	- id PK
	- question_id FK
	- author_id FK
	- body TEXT
	- created_at

Indexes: product_id, question_id

### otp_tokens

- id PK
- user_id FK
- token VARCHAR
- purpose ENUM('login','reset_password','verify_email')
- expires_at DATETIME
- created_at

Indexes: token, user_id

### blocked_bidder, upgrade_requests

- blocked_bidder: lưu bidder bị chặn (user_id, reason, expires_at)
- upgrade_requests: (id, user_id, requested_role, status, admin_note, created_at)

---

## Quan hệ chính (ER)

- `users (1) — (M) products`
- `users (1) — (M) auctions` (seller)
- `products (1) — (1) auctions` (một sản phẩm có thể có nhiều auction theo lịch, nhưng mỗi auction liên quan tới 1 product)
- `auctions (1) — (M) bids`
- `users (1) — (M) bids` (bidder)
- `auctions (1) — (1) orders` (sau khi kết thúc và thanh toán)

## Chỉ mục & tối ưu hoá

- Fulltext index: `products(title, description)` để hỗ trợ tìm kiếm (nếu MySQL/MariaDB sử dụng fulltext)
- Index trên `auctions.end_time` để job scheduler tìm auctions sắp kết thúc/đã kết thúc nhanh
- Index composite `bids(auction_id, created_at)` để lấy lịch sử bidding nhanh (latest first)

## Transaction & consistency

- Các thao tác liên quan đến đặt giá và cập nhật `auctions.current_price` cần được thực hiện trong transaction hoặc sử dụng optimistic locking (version column) để tránh race condition.
- Quy trình settlement: kiểm tra highest bid, tạo `order`, cập nhật `auctions.status`, thông báo cho seller/buyer — tất cả bước này nên nằm trong transaction hoặc workflow có retry/compensation.

## Truy vấn mẫu

- Lấy chi tiết auction kèm sản phẩm, seller và top 5 bids:

```sql
SELECT a.*, p.title, u.full_name AS seller
FROM auctions a
JOIN products p ON p.id = a.product_id
JOIN users u ON u.id = a.seller_id
WHERE a.id = :auctionId;

SELECT b.* FROM bids b WHERE b.auction_id = :auctionId ORDER BY b.created_at DESC LIMIT 5;
```

- Lấy auctions sắp kết thúc trong 10 phút (dùng bởi scheduler):

```sql
SELECT id FROM auctions WHERE status = 'running' AND end_time <= DATE_ADD(NOW(), INTERVAL 10 MINUTE);
```

---

## Ghi chú triển khai

- Thực tế cột kiểu và giới hạn (VARCHAR length, DECIMAL precision) nên được điều chỉnh theo policy của dự án.
- Các trường JSON dùng cho dữ liệu linh hoạt (images, settings) nhưng đừng lạm dụng — dữ liệu quan trọng cần chuẩn hoá thành cột để index.
- Xem các model trong `backend/src/models/` để đối chiếu tên trường và quan hệ.

---
