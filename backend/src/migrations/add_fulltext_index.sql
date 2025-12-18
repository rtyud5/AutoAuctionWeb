-- Migration: Thêm FULLTEXT index cho chức năng tìm kiếm sản phẩm
-- Chạy file này trong MySQL để tạo FULLTEXT index

-- Kiểm tra và xóa index cũ nếu tồn tại
ALTER TABLE products DROP INDEX IF EXISTS idx_fulltext_search;

-- Tạo FULLTEXT index trên các cột title, short_description, full_description
ALTER TABLE products 
ADD FULLTEXT INDEX idx_fulltext_search (title, short_description, full_description);

-- Kiểm tra index đã tạo thành công
SHOW INDEX FROM products WHERE Key_name = 'idx_fulltext_search';
