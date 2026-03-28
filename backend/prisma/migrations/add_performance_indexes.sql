-- 添加性能优化索引
-- 为商品表添加价格和浏览量的复合索引，优化排序查询

-- 为按价格排序的查询添加索引
CREATE INDEX IF NOT EXISTS idx_product_status_price ON product(status, price);

-- 为按浏览量排序的查询添加索引
CREATE INDEX IF NOT EXISTS idx_product_status_view_count ON product(status, view_count DESC);

-- 为聊天消息的已读状态查询添加索引
CREATE INDEX IF NOT EXISTS idx_chat_message_session_read ON chat_message(session_id, is_read, sender_id);

-- 为订单的复合查询添加索引（如果不存在）
-- 这些索引已经在 schema 中定义，这里只是确保它们存在
