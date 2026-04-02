-- Add propagation_advice JSONB column to inventory and wishlist tables
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS propagation_advice jsonb DEFAULT NULL;
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS propagation_advice jsonb DEFAULT NULL;
