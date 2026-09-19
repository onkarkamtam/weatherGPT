-- Service Role Grants for WeatherGPT
-- 
-- Run this ONLY if you get "permission denied" errors with service_role
-- 
-- These grants allow the service_role to bypass RLS and perform admin operations
-- The service_role key should already have these privileges by default in Supabase,
-- but this script can restore them if needed.

-- Grant all privileges on tables to service_role
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.conversations TO service_role;
GRANT ALL ON TABLE public.messages TO service_role;

-- Grant usage on sequences (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.update_conversation_timestamp() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Verify grants (run these to check)
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_schema='public' 
-- AND table_name IN ('profiles', 'conversations', 'messages')
-- AND grantee = 'service_role';
