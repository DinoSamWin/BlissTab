-- ============================================================
-- 修复 Storage RLS 策略（适用于自定义 OAuth + Public Bucket）
-- ============================================================
-- 如果你的 bucket 已经是 public，但上传仍然失败，运行这个脚本

-- 1. 删除所有可能存在的旧策略（使用 auth.uid() 的策略不适用于自定义 OAuth）
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to gateway-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from gateway-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to gateway-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from gateway-logos" ON storage.objects;

-- 2. 创建允许所有操作的策略（适用于 public bucket + 自定义 OAuth）
-- 注意：这些策略允许任何使用 Supabase client 的请求（包括使用 anon key）
CREATE POLICY "Allow all operations on gateway-logos"
ON storage.objects
FOR ALL
USING (bucket_id = 'gateway-logos')
WITH CHECK (bucket_id = 'gateway-logos');

-- 如果上面的策略不工作，可以尝试禁用 RLS（仅用于测试）：
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;


