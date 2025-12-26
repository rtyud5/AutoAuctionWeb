-- Add images column to products table
-- This column stores an array of Cloudinary image URLs as JSON

ALTER TABLE products 
ADD COLUMN images TEXT COMMENT 'JSON array of image URLs from Cloudinary' 
AFTER thumbnail;
