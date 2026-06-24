-- Add isManual flag for admin-created reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Add screenshot URL for admin-created reviews with social proof images
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Make product_id nullable so reviews survive product deletion
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE reviews ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE reviews ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Create social_proof table for the right-column social proof wall
CREATE TABLE IF NOT EXISTS social_proof (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  source_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source_type IN ('whatsapp', 'instagram', 'facebook', 'manual')),
  customer_name TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_proof_active ON social_proof (active);
CREATE INDEX IF NOT EXISTS idx_social_proof_sort ON social_proof (sort_order);

ALTER TABLE social_proof ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active social proof" ON social_proof FOR SELECT USING (active = true AND deleted_at IS NULL);
CREATE POLICY "Admin all social proof" ON social_proof FOR ALL USING (auth.role() = 'authenticated');
