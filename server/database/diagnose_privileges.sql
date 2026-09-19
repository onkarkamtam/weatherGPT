-- Diagnostic SQL to check service_role privileges
-- Run this in Supabase SQL Editor to verify current privileges

-- Check table-level grants
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'conversations', 'messages')
  AND grantee IN ('service_role', 'authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;

-- Expected output for service_role:
-- service_role | public | conversations | SELECT
-- service_role | public | conversations | INSERT
-- service_role | public | conversations | UPDATE
-- service_role | public | conversations | DELETE
-- (and similar for messages and profiles)

-- If service_role is MISSING from the results, the grants need to be added.
