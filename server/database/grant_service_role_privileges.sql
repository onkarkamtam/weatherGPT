-- ============================================================================
-- Grant necessary privileges to service_role
-- ============================================================================
-- 
-- WHY THIS IS NEEDED:
-- 
-- The sb_secret_ key authenticates as the service_role, which bypasses RLS.
-- However, PostgreSQL table-level permissions are separate from RLS.
-- 
-- Even though service_role bypasses RLS, it still needs explicit GRANT 
-- permissions to SELECT, INSERT, UPDATE, DELETE on tables.
-- 
-- ERROR WITHOUT THESE GRANTS:
-- "42501 permission denied for table conversations"
-- 
-- This is because tables are owned by postgres role, and service_role
-- doesn't inherit privileges automatically.
-- 
-- ============================================================================

-- Grant full privileges on profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- Grant full privileges on conversations table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO service_role;

-- Grant full privileges on messages table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO service_role;

-- Grant usage on sequences (needed for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure service_role can use uuid-ossp functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running these grants, verify with check_privileges.sql
-- Expected: service_role should have SELECT, INSERT, UPDATE, DELETE on all tables
-- ============================================================================

-- You can verify the grants were applied by running:
-- 
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'service_role'
--   AND table_schema = 'public'
-- ORDER BY table_name, privilege_type;
