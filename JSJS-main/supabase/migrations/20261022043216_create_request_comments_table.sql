/*
# Create request_comments table for chat and comments on payment requests

1. New Tables
- `request_comments`: stores chat messages and comments associated with a specific payment request.
  - `id` (uuid, primary key)
  - `request_id` (uuid, references payment_requests.id, NOT NULL)
  - `user_id` (text, NOT NULL) — the profile ID of the sender (from local auth)
  - `user_name` (text, NOT NULL) — display name of sender
  - `user_role` (text, NOT NULL) — role of sender (solicitante, aprobador, administrador)
  - `message` (text, nullable) — text message, nullable when only a file is attached
  - `file_path` (text, nullable) — storage path for attached file
  - `file_name` (text, nullable) — original file name
  - `created_at` (timestamptz, default now())

2. Security
- RLS is disabled on this table (consistent with the project's existing approach
  where payment_requests and notifications also have RLS disabled, since the app
  uses a local/custom auth model rather than Supabase auth).
- The anon key client can read and write freely.

3. Notes
- This table supports the chat/conversation feature between administrators and
  requesters within each payment request's detail view.
- File attachments are uploaded to the existing `payment-files` storage bucket.
*/

CREATE TABLE IF NOT EXISTS request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  message text,
  file_path text,
  file_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE request_comments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_comments_created_at ON request_comments(created_at);
