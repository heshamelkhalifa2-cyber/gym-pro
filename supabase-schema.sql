-- ============================================
-- GymPro - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('monthly', 'quarterly', 'yearly')),
  subscription_start DATE NOT NULL,
  subscription_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checkin_time TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_subscription_end ON members(subscription_end);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);

-- ============================================
-- AUTO-UPDATE status based on subscription_end
-- ============================================
CREATE OR REPLACE FUNCTION update_member_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_end < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSE
    NEW.status := 'active';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_status
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_member_status();

-- ============================================
-- AUTO-UPDATE expired members daily (via cron)
-- Run this manually or schedule it
-- ============================================
CREATE OR REPLACE FUNCTION refresh_member_statuses()
RETURNS void AS $$
BEGIN
  UPDATE members
  SET status = CASE
    WHEN subscription_end < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END,
  updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (gym admins) full access
CREATE POLICY "Allow authenticated full access to members"
  ON members FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access to payments"
  ON payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access to checkins"
  ON checkins FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- INSERT INTO members (name, phone, email, subscription_type, subscription_start, subscription_end) VALUES
-- ('Ahmed Al-Rashidi', '+966501234567', 'ahmed@example.com', 'monthly', CURRENT_DATE - 15, CURRENT_DATE + 15),
-- ('Mohammad Hassan', '+966507654321', 'mo@example.com', 'quarterly', CURRENT_DATE - 30, CURRENT_DATE + 60),
-- ('Sara Abdullah', '+966509876543', 'sara@example.com', 'yearly', CURRENT_DATE - 100, CURRENT_DATE + 265);
