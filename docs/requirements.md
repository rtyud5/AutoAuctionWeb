# Requirements

Tài liệu này nêu rõ các yêu cầu chức năng và phi chức năng cho hệ thống "Online Auction". Mục tiêu: làm rõ phạm vi, các actor chính, user stories, tiêu chí chấp nhận và ràng buộc phi chức năng.

## Actors (Vai trò)

- Anonymous visitor: xem danh sách sản phẩm/auction, tìm kiếm
- Bidder (registered): tham gia đấu giá, đặt giá, dùng auto-bid, theo dõi sản phẩm
- Seller (registered): tạo sản phẩm, khởi tạo auction, quản lý đơn hàng
- Admin: quản trị hệ thống (users, categories, featured products, xử lý khiếu nại)
- Payment gateway (external)
- Notification service (email/SMS / push)

## Functional requirements (Yêu cầu chức năng)

1. Authentication & Authorization
	- Đăng ký, đăng nhập (email + password), xác minh email, reset password (OTP)
	- Role-based access: admin / seller / bidder

2. Product management (Seller)
	- Seller có thể tạo, chỉnh sửa, xoá (draft) sản phẩm
	- Upload nhiều ảnh (Cloudinary), gắn category

3. Auction management
	- Seller tạo auction cho product: start_time, end_time, start_price, optional buy_now
	- Auctions có trạng thái (scheduled, running, settled, cancelled)
	- Scheduler tự động bắt đầu và kết thúc auctions theo thời gian

4. Bidding
	- Hệ thống kiểm tra hợp lệ (amount phải lớn hơn current_price + increment)
	- Auto-bid: bidder có thể đặt một rule (max_amount, increment)
	- Lưu lịch sử bids cho mỗi auction

5. Auction settlement
	- Khi auction kết thúc, xác định highest bid, tạo order, cập nhật trạng thái auction và thông báo buyer/seller
	- Nếu không có bid thì auction chuyển trạng thái closed/no winner

6. Orders & post-auction flow
	- Khi cài đặt AutoBid phải tiến hành thanh toán
	- Nếu win, hệ thống sẽ gửi mail thông báo và tiến hành giao hàng.
	- Nếu thua, hệ thống sẽ hoàn tiền.

7. Search & Browse
	- Tìm kiếm sản phẩm (keyword, category, price range)
	- Lọc và sắp xếp (newest, ending soon, price)

8. Watchlist & Notifications
	- Người dùng có thể thêm sản phẩm vào watchlist
	- Thông báo (email/websocket/push) khi bị overbid, auction will end soon, auction result

9. Admin features
	- Quản lý users, products, auctions, categories
	- Xem báo cáo, xử lý khiếu nại, khóa tài khoản (blocked_bidder)

10. Misc
	- Ratings & reviews
	- Q&A cho sản phẩm
	- Upgrade request flow cho seller

## Non-functional requirements (Phi chức năng)

- Security
  - Password hashing (bcrypt), rate-limiting, input validation, XSS/SQL injection prevention
  - JWT token cho API, HTTPS enforced

- Performance & Scalability
  - Hệ thống cần xử lý spikes khi nhiều người đặt giá cùng lúc (concurrency và transaction handling)
  - Sử dụng caching cho trang danh sách/chi tiết phổ biến, CDN cho ảnh

- Availability
  - Scheduler và settlement job phải tin cậy — retry/compensation khi thất bại

- Consistency
  - Strong consistency cho bidding & settlement (không được cho phép race condition dẫn tới winner sai)

- Maintainability
  - Codebase có testing (unit/integration), logging, và clear migrations

## Acceptance Criteria (Tiêu chí chấp nhận)

- Người dùng đăng ký và đăng nhập thành công, nhận OTP để xác minh email.
- Seller có thể tạo product + upload ảnh và tạo auction với thời gian bắt đầu/kết thúc.
- Bidder có thể đặt giá hợp lệ và lịch sử bids được lưu.
- Khi auction kết thúc, hệ thống xác định chính xác winner và tạo order.
- Admin có thể quản lý categories, users và tắt/mở auctions.

## User stories chính (mẫu)

1. As a Seller, I want to create a product and schedule an auction so that I can sell my item to highest bidder.
2. As a Bidder, I want to place bids and receive notifications if I'm outbid.
3. As an Admin, I want to mark a bidder as blocked if they breach rules.
4. As a Buyer, I want to view order details and message the seller.

## Constraints & Assumptions

- Payment gateway sẽ tích hợp external API (không triển khai gateway đầy đủ trong scope ban đầu).
- Hệ thống dùng Cloudinary cho lưu ảnh (config có sẵn trong `backend/src/config/cloudinary.js`).
- Email service có sẵn (xem `mailer.js`) để gửi OTP/notifications.

## Metrics & Monitoring

- Theo dõi: số auctions running, số bids/phút, thời gian trung bình để settlement, success rate của jobs
- Logging: audit trail cho hành động đặt giá, settlement, thay đổi trạng thái users

---