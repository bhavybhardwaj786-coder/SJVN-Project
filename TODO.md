# TODO

- [ ] Create a new Supabase migration SQL that:
  - [ ] Drops unique constraint `uq_submissions_form_site_month`
  - [ ] Adds unique constraint on `(reporting_month, site_id, form_id, user_id)`
- [ ] Update `src/services/submissions.ts` so `upsert(..., { onConflict })` matches the new unique constraint keys.
- [ ] (After migrations) smoke test:
  - [ ] Submit as site user for a given site+form+month
  - [ ] Submit as contractor for the same site+form+month
  - [ ] Submit again as a different contractor for the same site+form+month
  - [ ] Verify records do not overwrite and no submission errors occur

