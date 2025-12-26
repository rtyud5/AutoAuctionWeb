# Hướng dẫn Setup Cloudinary cho Online Auction System

## Tại sao chuyển sang Cloudinary?

Railway (và nhiều platform-as-a-service khác) không lưu trữ file upload lâu dài. Mỗi khi deploy lại, các file sẽ bị mất. Cloudinary là giải pháp cloud storage miễn phí và mạnh mẽ cho hình ảnh.

## Bước 1: Đăng ký tài khoản Cloudinary (MIỄN PHÍ)

1. Truy cập: https://cloudinary.com/users/register_free
2. Đăng ký tài khoản (có thể dùng Google/GitHub)
3. Gói miễn phí cung cấp:
   - 25 GB storage
   - 25 GB bandwidth/tháng
   - Tối ưu hóa và chuyển đổi ảnh tự động

## Bước 2: Lấy thông tin API

1. Sau khi đăng nhập, vào Dashboard: https://cloudinary.com/console
2. Tìm phần **Account Details**:
   - Cloud Name
   - API Key
   - API Secret
3. Copy 3 thông tin này

## Bước 3: Cấu hình Backend

### 3.1. Cập nhật file `.env`

Mở file `backend/.env` và thêm 3 dòng sau (thay bằng thông tin của bạn):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Lưu ý:** Trên Railway, bạn cần thêm các biến môi trường này vào Settings → Variables

### 3.2. Chạy migration database

Chạy file SQL để thêm cột `images` vào bảng `products`:

```bash
cd backend
# Kết nối MySQL và chạy:
mysql -u root -p your_database < src/migrations/add_images_column.sql
```

Hoặc chạy trực tiếp câu SQL:

```sql
ALTER TABLE products
ADD COLUMN images TEXT COMMENT 'JSON array of image URLs from Cloudinary'
AFTER thumbnail;
```

## Bước 4: Test chức năng

1. Khởi động lại server:

```bash
cd backend
npm start
```

2. Đăng nhập với tài khoản Seller
3. Thử tạo sản phẩm mới với 4 ảnh
4. Kiểm tra trên Cloudinary Dashboard → Media Library để xem ảnh đã upload

## Cách hoạt động

### Upload ảnh:

- Khi seller upload 4 ảnh, chúng sẽ được gửi lên Cloudinary
- Cloudinary trả về URL của từng ảnh
- Backend lưu array 4 URLs vào cột `images` (dạng JSON)
- Ảnh đầu tiên làm `thumbnail`

### Hiển thị ảnh:

- Frontend chỉ cần dùng URL trực tiếp từ Cloudinary
- Không cần serve static files từ backend
- Ảnh được CDN optimize tự động

## Ví dụ dữ liệu

Sau khi upload, cột `images` trong database sẽ có dạng:

```json
[
  "https://res.cloudinary.com/your-cloud/image/upload/v1234/auction-products/abc123.jpg",
  "https://res.cloudinary.com/your-cloud/image/upload/v1234/auction-products/def456.jpg",
  "https://res.cloudinary.com/your-cloud/image/upload/v1234/auction-products/ghi789.jpg",
  "https://res.cloudinary.com/your-cloud/image/upload/v1234/auction-products/jkl012.jpg"
]
```

## Xóa ảnh cũ

Khi seller cập nhật sản phẩm với ảnh mới, code tự động:

1. Xóa 4 ảnh cũ trên Cloudinary
2. Upload 4 ảnh mới
3. Cập nhật URLs trong database

## Troubleshooting

### Lỗi "Missing credentials"

→ Kiểm tra lại 3 biến môi trường CLOUDINARY\_\* trong file `.env`

### Ảnh không hiển thị

→ Kiểm tra console browser, xem có lỗi CORS không
→ Cloudinary mặc định cho phép CORS, nên không nên có vấn đề

### Ảnh upload chậm

→ Cloudinary có giới hạn 10 concurrent uploads ở gói free
→ Nếu cần, có thể nâng cấp gói hoặc giảm kích thước ảnh trước khi upload

## Chuyển đổi ảnh cũ (Migration)

Nếu đã có dữ liệu với ảnh local, bạn cần script để:

1. Đọc từng product có ảnh local
2. Upload lên Cloudinary
3. Cập nhật cột `images` và `thumbnail`

Script mẫu sẽ được cung cấp riêng nếu cần.

## Lợi ích

✅ Ảnh không bị mất khi deploy
✅ CDN toàn cầu - load nhanh
✅ Tự động optimize (WebP, responsive)
✅ Miễn phí cho dự án nhỏ/vừa
✅ Dễ scale khi cần
