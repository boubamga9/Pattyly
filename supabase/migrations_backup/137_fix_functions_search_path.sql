-- Fix search_path for all functions in public schema
-- This handles overloaded functions (same name, different parameters) correctly
-- by using the function OID which uniquely identifies each function
-- 
-- Security: Uses minimal search_path (pg_catalog, public) by default
-- Special cases: Functions that need auth schema get (pg_catalog, public, auth)

DO $$
DECLARE
  r RECORD;
  func_signature TEXT;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
  v_search_path TEXT;
BEGIN
  FOR r IN
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      p.oid AS function_oid,
      pg_get_function_identity_arguments(p.oid) AS function_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f' -- Only regular functions (not aggregates, procedures, window functions, etc.)
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  LOOP
    BEGIN
      -- Build readable signature for logs
      IF r.function_args IS NULL OR r.function_args = '' THEN
        func_signature := format('%I.%I()', r.schema_name, r.function_name);
      ELSE
        func_signature := format('%I.%I(%s)', r.schema_name, r.function_name, r.function_args);
      END IF;

      -- ✅ Dynamic search_path policy
      -- Functions that access auth.users table need auth schema
      IF r.function_name = 'user_password_set' THEN
        v_search_path := 'pg_catalog, public, auth'; -- needs auth
      ELSE
        v_search_path := 'pg_catalog, public';       -- strict & secure
      END IF;

      -- ✅ Use OID to alter function safely (supports overloads)
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = %s',
        r.function_oid::regprocedure,
        v_search_path
      );

      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated search_path for function: % → %', func_signature, v_search_path;

    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Failed to update function % (OID: %): %', func_signature, r.function_oid, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Finished: % functions updated, % errors', updated_count, error_count;
END $$;

