-- ============================================================================
-- Check current grants on tables for service_role
-- ============================================================================
-- This query checks what privileges the service_role has on our tables
-- Run this in Supabase SQL Editor to diagnose the "permission denied" error

-- Check grants on profiles table
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY table_name, privilege_type;

-- Check grants on conversations table
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name = 'conversations'
ORDER BY table_name, privilege_type;

-- Check grants on messages table
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name = 'messages'
ORDER BY table_name, privilege_type;

-- Check grants on ALL tables for service_role (comprehensive view)
SELECT 
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
GROUP BY table_schema, table_name
ORDER BY table_name;

-- ============================================================================
-- Expected output for each table should include:
-- SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- 
-- If any of these are missing, the service_role lacks necessary permissions
-- ============================================================================
