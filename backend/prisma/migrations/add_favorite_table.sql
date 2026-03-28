-- 创建收藏表
CREATE TABLE IF NOT EXISTS favorite (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorite_user_product_unique UNIQUE (user_id, product_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_favorite_user_id ON favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_product_id ON favorite(product_id);

-- 添加注释
COMMENT ON TABLE favorite IS '用户收藏表';
COMMENT ON COLUMN favorite.id IS '收藏ID';
COMMENT ON COLUMN favorite.user_id IS '用户ID';
COMMENT ON COLUMN favorite.product_id IS '商品ID';
COMMENT ON COLUMN favorite.created_at IS '创建时间';
