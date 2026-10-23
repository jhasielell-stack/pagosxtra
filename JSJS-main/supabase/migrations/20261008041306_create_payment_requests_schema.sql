/*
# Create Extraordinary Payment Requests Schema

## Overview
Creates the complete database schema for managing "Solicitudes de Pago Extraordinario" (SPE).

## Tables
1. profiles - extends auth.users with role, area, job_title
2. payment_requests - main table with all request fields
3. notifications - internal bell notifications

## Security (RLS)
- Admins see all; approvers see their area; solicitantes see only their own requests
- Separate CRUD policies per table (4 each)
- Storage bucket 'payment-files' for file uploads
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'solicitante' CHECK (role IN ('solicitante', 'aprobador', 'administrador')),
  area text,
  job_title text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'aprobador')
);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ============================================================
-- PAYMENT_REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE NOT NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  area text NOT NULL,
  job_title text,
  requirement_name text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Urgente', 'Alta', 'Media', 'Baja')),
  project text,
  payment_concept text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  reason_type text NOT NULL CHECK (reason_type IN ('Interna', 'Externa')),
  reason_text text,
  requires_invoice boolean NOT NULL DEFAULT false,
  file_path text,
  file_name text,
  file_type text,
  required_payment_date date NOT NULL,
  observations text,
  status text NOT NULL DEFAULT 'Borrador' CHECK (status IN ('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Pagada')),
  approver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approver_observations text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_scoped" ON payment_requests;
CREATE POLICY "requests_select_scoped"
ON payment_requests FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'aprobador'
      AND p.area = payment_requests.area
  )
);

DROP POLICY IF EXISTS "requests_insert_own" ON payment_requests;
CREATE POLICY "requests_insert_own"
ON payment_requests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
);

DROP POLICY IF EXISTS "requests_update_scoped" ON payment_requests;
CREATE POLICY "requests_update_scoped"
ON payment_requests FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'aprobador'
      AND p.area = payment_requests.area
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "requests_delete_scoped" ON payment_requests;
CREATE POLICY "requests_delete_scoped"
ON payment_requests FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_area ON payment_requests(area);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_folio ON payment_requests(folio);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES payment_requests(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'new_request',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================
-- FOLIO SEQUENCE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_folio()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
  current_year text;
  last_num integer;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;

  SELECT COALESCE(MAX(CAST(split_part(folio, '-', 3) AS integer)), 0)
  INTO last_num
  FROM payment_requests
  WHERE folio LIKE 'SPE-' || current_year || '-%';

  next_num := last_num + 1;
  RETURN 'SPE-' || current_year || '-' || lpad(next_num::text, 3, '0');
END;
$$;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-files', 'payment-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_files_upload" ON storage.objects;
CREATE POLICY "payment_files_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-files');

DROP POLICY IF EXISTS "payment_files_read" ON storage.objects;
CREATE POLICY "payment_files_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'payment-files');

DROP POLICY IF EXISTS "payment_files_update" ON storage.objects;
CREATE POLICY "payment_files_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-files');

DROP POLICY IF EXISTS "payment_files_delete" ON storage.objects;
CREATE POLICY "payment_files_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-files');
