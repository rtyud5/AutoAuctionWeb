-- =====================================================
-- SEED TEST DATA CHO CHỨC NĂNG SEARCH
-- Chạy script này để tạo dữ liệu test
-- =====================================================

-- 1. Tạo user test (seller) nếu chưa có
INSERT IGNORE INTO users (id, name, email, password, role, created_at, updated_at)
VALUES 
(999, 'Test Seller', 'testseller@test.com', '$2b$10$abcdefghijklmnopqrstuv', 'SELLER', NOW(), NOW());

-- 2. Tạo category test nếu chưa có
INSERT IGNORE INTO categories (id, name, slug, parent_id, created_at, updated_at)
VALUES 
(999, 'Test Category', 'test-category', NULL, NOW(), NOW());

-- 3. Xóa dữ liệu test cũ (nếu có)
DELETE FROM products WHERE id >= 9000 AND id < 10000;

-- 4. Tạo các sản phẩm test với từ khóa khác nhau

-- Test 1: Từ khóa "iPhone12" trong TITLE (exact match)
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9001,
  999,
  999,
  'iPhone12 Pro Max 256GB Chính Hãng',
  'Điện thoại cao cấp từ Apple',
  'iPhone 12 Pro Max là flagship của Apple năm 2020 với chip A14 Bionic mạnh mẽ',
  '/uploads/products/9001/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 2: Từ khóa "iPhone 12" trong TITLE (có space)
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9002,
  999,
  999,
  'Bán iPhone 12 Mini 128GB Xanh Dương',
  'Máy mới 99%, fullbox, bảo hành 11 tháng',
  'Điện thoại thông minh cao cấp với màn hình OLED',
  '/uploads/products/9002/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 3: Từ khóa "iPhone12" trong SHORT_DESCRIPTION
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9003,
  999,
  999,
  'Điện Thoại Apple Cao Cấp',
  'iPhone12 64GB màu đỏ, giá tốt nhất thị trường',
  'Sản phẩm chính hãng VN/A, nguyên seal, chưa active',
  '/uploads/products/9003/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 4: Từ khóa "iPhone12" trong FULL_DESCRIPTION
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9004,
  999,
  999,
  'Smartphone Premium 2020',
  'Điện thoại thông minh cao cấp',
  'Chúng tôi chuyên cung cấp iPhone12 chính hãng với giá cạnh tranh nhất. Máy đẹp 99% như mới.',
  '/uploads/products/9004/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 5: Không chứa "iPhone12" - để test negative case
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9005,
  999,
  999,
  'Samsung Galaxy S21 Ultra',
  'Điện thoại Samsung cao cấp',
  'Flagship Android với camera 108MP và bút S-Pen',
  '/uploads/products/9005/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 6: Chứa "iPhone" nhưng KHÔNG có "12" - test partial match
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9006,
  999,
  999,
  'iPhone 13 Pro 512GB',
  'Mẫu iPhone mới nhất năm 2021',
  'Chip A15 Bionic với ProMotion 120Hz',
  '/uploads/products/9006/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 7: Chứa "Laptop" - từ khóa khác để test
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9007,
  999,
  999,
  'MacBook Pro M1 2020',
  'Laptop cao cấp từ Apple',
  'Laptop MacBook Pro với chip M1 mạnh mẽ, RAM 16GB, SSD 512GB',
  '/uploads/products/9007/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 8: Chứa "laptop" (lowercase) - test case sensitivity
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9008,
  999,
  999,
  'Dell XPS 15 Gaming',
  'laptop gaming cao cấp cho đồ họa',
  'Máy tính xách tay mạnh mẽ với RTX 3060',
  '/uploads/products/9008/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 9: Nhiều từ khóa "Tai nghe bluetooth"
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9009,
  999,
  999,
  'Tai Nghe Bluetooth Sony WH-1000XM4',
  'Tai nghe chống ồn cao cấp',
  'Tai nghe bluetooth không dây với công nghệ chống ồn chủ động',
  '/uploads/products/9009/0.jpg',
  'APPROVED',
  NOW(),
  NOW()
);

-- Test 10: Status PENDING - không nên xuất hiện trong search
INSERT INTO products (id, seller_id, category_id, title, short_description, full_description, thumbnail, status, created_at, updated_at)
VALUES (
  9010,
  999,
  999,
  'iPhone12 Pro PENDING TEST',
  'Sản phẩm này có status PENDING',
  'Không nên hiển thị trong kết quả search',
  '/uploads/products/9010/0.jpg',
  'PENDING',
  NOW(),
  NOW()
);

-- 5. Tạo auctions cho các products (giá để test sort)
INSERT INTO auctions (product_id, start_price, step_price, current_price, end_time, status, created_at, updated_at)
VALUES 
(9001, 20000000, 500000, 25000000, DATE_ADD(NOW(), INTERVAL 7 DAY), 'ACTIVE', NOW(), NOW()),  -- 25tr
(9002, 15000000, 300000, 18000000, DATE_ADD(NOW(), INTERVAL 5 DAY), 'ACTIVE', NOW(), NOW()),  -- 18tr
(9003, 12000000, 200000, 13000000, DATE_ADD(NOW(), INTERVAL 3 DAY), 'ACTIVE', NOW(), NOW()),  -- 13tr
(9004, 10000000, 200000, 11000000, DATE_ADD(NOW(), INTERVAL 2 DAY), 'ACTIVE', NOW(), NOW()),  -- 11tr
(9005, 22000000, 500000, 24000000, DATE_ADD(NOW(), INTERVAL 6 DAY), 'ACTIVE', NOW(), NOW()),  -- 24tr
(9006, 28000000, 500000, 30000000, DATE_ADD(NOW(), INTERVAL 8 DAY), 'ACTIVE', NOW(), NOW()),  -- 30tr
(9007, 35000000, 1000000, 38000000, DATE_ADD(NOW(), INTERVAL 10 DAY), 'ACTIVE', NOW(), NOW()), -- 38tr
(9008, 25000000, 500000, 27000000, DATE_ADD(NOW(), INTERVAL 4 DAY), 'ACTIVE', NOW(), NOW()),   -- 27tr
(9009, 5000000, 100000, 5500000, DATE_ADD(NOW(), INTERVAL 3 DAY), 'ACTIVE', NOW(), NOW()),     -- 5.5tr
(9010, 20000000, 500000, 20000000, DATE_ADD(NOW(), INTERVAL 7 DAY), 'PENDING', NOW(), NOW());  -- PENDING

-- =====================================================
-- HƯỚNG DẪN TEST
-- =====================================================
-- Sau khi chạy script này, test các trường hợp:
--
-- 1. Search "iPhone12" hoặc "iPhone 12":
--    Kỳ vọng: Tìm thấy 4 sản phẩm (9001, 9002, 9003, 9004)
--    Không có 9010 vì status PENDING
--
-- 2. Search "laptop":
--    Kỳ vọng: Tìm thấy 2 sản phẩm (9007, 9008)
--    Test case-insensitive
--
-- 3. Search "tai nghe bluetooth":
--    Kỳ vọng: Tìm thấy 9009
--    Test multiple words
--
-- 4. Sort by price_asc với "iPhone12":
--    Thứ tự: 9004 (11tr) > 9003 (13tr) > 9002 (18tr) > 9001 (25tr)
--
-- 5. Sort by price_desc với "iPhone12":
--    Thứ tự: 9001 (25tr) > 9002 (18tr) > 9003 (13tr) > 9004 (11tr)
--
-- 6. Sort by relevance với "iPhone12":
--    Thứ tự ưu tiên: title match > short_description > full_description
--    9001, 9002 (title) > 9003 (short) > 9004 (full)
-- =====================================================

SELECT '✅ Đã tạo 10 sản phẩm test (ID: 9001-9010)' AS status;
SELECT 'Run: SELECT * FROM products WHERE id >= 9001 AND id <= 9010' AS next_step;
