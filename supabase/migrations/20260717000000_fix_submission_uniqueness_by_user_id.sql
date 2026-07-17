-- Fix submission overwrite/conflicts between site users and multiple contractors
-- by updating the uniqueness constraint used by upsert.

-- Drop the old constraint that enforced only (form_id, site_id, reporting_month)
-- This caused site-user and contractor submissions (and multiple contractors)
-- to collide/overwrite.
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS uq_submissions_form_site_month;

-- Add a new uniqueness constraint that includes the submitting user.
-- This allows:
--  - one submission per (reporting_month, site_id, form_id, user_id)
--  - multiple contractors for the same form/site/month (different user_id)
ALTER TABLE public.submissions
  ADD CONSTRAINT uq_submissions_form_site_month_user UNIQUE (reporting_month, site_id, form_id, user_id);

