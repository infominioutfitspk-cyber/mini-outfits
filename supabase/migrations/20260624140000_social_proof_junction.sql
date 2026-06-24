-- Junction table for many-to-many: social_proof <-> products
CREATE TABLE IF NOT EXISTS social_proof_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_proof_id UUID NOT NULL REFERENCES social_proof(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(social_proof_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_spp_social_proof ON social_proof_products (social_proof_id);
CREATE INDEX IF NOT EXISTS idx_spp_product ON social_proof_products (product_id);

ALTER TABLE social_proof_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read social_proof_products" ON social_proof_products FOR SELECT USING (true);
CREATE POLICY "Admin all social_proof_products" ON social_proof_products FOR ALL USING (auth.role() = 'authenticated');

-- Remove customer_name from social_proof for privacy enforcement
ALTER TABLE social_proof DROP COLUMN IF EXISTS customer_name;
