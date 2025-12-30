# API Specification

Tài liệu API (phiên bản cơ bản) cho "Online Auction" — mô tả endpoints chính, định dạng request/response, authentication, lỗi và paging.

Base URL (ví dụ):

- https://api.example.com/ (production)
- http://localhost:3000/ (development)

API root: /api/v1

## Authentication

- Hệ thống sử dụng JWT (Bearer token) cho hầu hết các endpoint bảo mật.
- Đăng nhập trả về access token và (optionally) refresh token.
- Header mẫu:

	Authorization: Bearer <jwt-token>

## Common response envelope

Thực hành: trả về JSON với cấu trúc thống nhất.

```json
{
	"success": true,
	"message": "OK",
	"data": { ... }
}
```

Lỗi:

```json
{
	"success": false,
	"message": "Validation error",
	"errors": { "field": "reason" }
}
```

## Pagination

- Query params: `page` (1-based), `limit` (per-page). Response should include meta (total, page, limit).

Example: GET /api/v1/products?page=1&limit=20

## Endpoints chính

Note: đường dẫn dưới `/api/v1`.

### Auth

- POST /auth/register
	- Body: { email, password, full_name, phone, role? }
	- Response: { user, message }

- POST /auth/login
	- Body: { email, password }
	- Response: { token, user }

- POST /auth/logout
	- Header Authorization
	- Response: { message }

- POST /auth/otp/request
	- Body: { email, purpose }
	- Response: { message }

- POST /auth/otp/verify
	- Body: { email, token }
	- Response: { verified: true }

### Users

- GET /users/me
	- Auth
	- Response: { user }

- PUT /users/me
	- Auth
	- Body: { full_name, phone, ... }
	- Response: { user }

### Products

- GET /products
	- Query: q, category, seller_id, sort (ending_soon, newest), page, limit
	- Response: { data: [product], meta }

- GET /products/:id
	- Response: { product (with images, category) }

- POST /products
	- Auth (seller)
	- Body (multipart/form-data): title, description, category_id, starting_price, images[]
	- Response: { product }

- PUT /products/:id
	- Auth (seller owns resource)

- DELETE /products/:id
	- Auth (seller or admin)

### Auctions

- POST /auctions
	- Auth (seller)
	- Body: { product_id, start_time, end_time, start_price, buy_now_price? }

- GET /auctions
	- Query: status, ending_soon, featured, page, limit

- GET /auctions/:id
	- Response includes top bids, current_price, time remaining

- GET /auctions/:id/bids
	- Response: paged bids

- PUT /auctions/:id/cancel
	- Auth (seller/admin) - cancel auction

### Bids

- POST /auctions/:id/bids
	- Auth (bidder)
	- Body: { amount }
	- Response: { bid, new_current_price }

- GET /auctions/:id/bids
	- Query: page, limit

Business rules (server-side): amount must be > current_price + min_increment. If two bids same time, server ensures atomic update.

### Auto-bid rules

- POST /auctions/:id/auto-bid (or /auto-bids)
	- Auth
	- Body: { max_amount, increment }

- GET /auto-bids (list for user)

### Watchlist

- POST /watchlist
	- Body: { product_id }

- DELETE /watchlist/:product_id

- GET /watchlist

### Orders

- GET /orders (auth)
- GET /orders/:id
- POST /orders/:auction_id/pay (trigger payment flow / create payment intent)

### Admin endpoints

- GET /admin/users
- PUT /admin/users/:id/block
- GET /admin/auctions
- PUT /admin/auctions/:id/feature
- CRUD /categories

## Websockets / Real-time

- Recommendation: dùng socket.io hoặc WS để push events:
	- auction:bidPlaced (auctionId, bid)
	- auction:endingSoon (auctionId)
	- auction:settled (auctionId, winnerId)

## Error codes & handling

- 200 OK
- 201 Created
- 400 Bad Request (validation)
- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (role/access)
- 404 Not Found
- 409 Conflict (concurrency/duplicate)
- 500 Internal Server Error

Ví dụ lỗi:

```json
{
	"success": false,
	"message": "Validation error",
	"errors": { "amount": "must be greater than current price" }
}
```

## Request/Response examples

- POST /auth/login

Request:

```json
{
	"email": "alice@example.com",
	"password": "secret"
}
```

Response:

```json
{
	"success": true,
	"message": "Login successful",
	"data": {
		"token": "<jwt>",
		"user": { "id": 1, "full_name": "Alice" }
	}
}
```

- POST /auctions/:id/bids

Request (Auth):

```json
{
	"amount": 1500000
}
```

Response (successful bid):

```json
{
	"success": true,
	"message": "Bid placed",
	"data": {
		"bid": { "id": 123, "amount": 1500000, "bidder_id": 5 },
		"new_current_price": 1500000
	}
}
```

## Rate limiting & security notes

- Thực hiện rate limiting cho các endpoint quan trọng (login, bidding) để giảm abuse.
- Validate mọi input server-side, sanitize text (description, comments).

## Versioning & backward compatibility

- Dùng prefix `/api/v1` — khi thay đổi breaking API tạo `v2`.

---
