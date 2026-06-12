
-- 1. Restrict profiles SELECT to owner only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Restrict credit_transactions INSERT/SELECT to authenticated role
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert own transactions"
ON public.credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Remove broad public listing on storage bucket
DROP POLICY IF EXISTS "Kreator uploads are publicly readable" ON storage.objects;

-- 4. Realtime: restrict channel subscriptions to topics containing user's uid
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read own-scoped realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users can read own-scoped realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || (auth.uid())::text || '%'
);
