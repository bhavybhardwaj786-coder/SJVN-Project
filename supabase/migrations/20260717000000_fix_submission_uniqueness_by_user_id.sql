-- Fix submission overwrite/conflicts between site users and multiple contractors
-- by updating the uniqueness constraint used by upsert.

-- Defensive cleanup: the repo/app historically created different unique constraints.
-- We remove any unique constraint that covers (form_id, site_id, reporting_month)
-- or (reporting_month, site_id, form_id, user_id) to ensure ON CONFLICT works.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'submissions'
      AND tc.constraint_type = 'UNIQUE'
      AND tc.constraint_name IN (
        'uq_submissions_form_site_month',
        'submissions_form_site_month_role_unique',
        'uq_submissions_form_site_month_user'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

-- Add the uniqueness constraint used by Supabase upsert:
-- onConflict: 'form_id,site_id,reporting_month,user_id'
ALTER TABLE public.submissions
  ADD CONSTRAINT uq_submissions_form_site_month_user
  UNIQUE (form_id, site_id, reporting_month, user_id);


