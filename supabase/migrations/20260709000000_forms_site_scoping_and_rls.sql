-- ========================================
-- Add site scoping + metadata to forms
-- ========================================
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS site_ids UUID[];
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one_time'));

-- Unique constraint needed for upsert later
ALTER TABLE public.submissions
  ADD CONSTRAINT uq_submissions_form_site_month UNIQUE (form_id, site_id, reporting_month);

-- ========================================
-- Enable RLS on tables missing it
-- ========================================
ALTER TABLE public.site_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locked_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- site_users policies
-- (site_users.id IS the auth user id — no separate user_id column)
-- ========================================
CREATE POLICY "Site users view own record" ON public.site_users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins manage site users" ON public.site_users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

-- ========================================
-- forms policies
-- ========================================
CREATE POLICY "Site users view assigned active forms" ON public.forms
    FOR SELECT USING (
        is_active = true
        AND (
            site_ids IS NULL
            OR EXISTS (
                SELECT 1 FROM public.site_users su
                WHERE su.id = auth.uid() AND su.site_id = ANY(forms.site_ids)
            )
        )
    );

CREATE POLICY "Admins manage forms" ON public.forms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

-- ========================================
-- submissions policies
-- (submissions.user_id DOES exist — confirmed from schema)
-- ========================================
CREATE POLICY "Site users select own submissions" ON public.submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.site_users su WHERE su.id = auth.uid() AND su.site_id = submissions.site_id)
    );

CREATE POLICY "Site users insert own submissions" ON public.submissions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.site_users su WHERE su.id = auth.uid() AND su.site_id = submissions.site_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.locked_months lm
            WHERE lm.site_id = submissions.site_id AND lm.reporting_month = submissions.reporting_month
        )
    );

CREATE POLICY "Site users update own draft or rejected submissions" ON public.submissions
    FOR UPDATE USING (
        user_id = auth.uid() AND status IN ('draft', 'rejected')
    )
    WITH CHECK (
        user_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM public.locked_months lm
            WHERE lm.site_id = submissions.site_id AND lm.reporting_month = submissions.reporting_month
        )
    );

CREATE POLICY "Admins view all submissions" ON public.submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

CREATE POLICY "Admins approve or reject submissions" ON public.submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

-- ========================================
-- documents policies
-- (documents itself has no user_id — go through submissions.user_id)
-- ========================================
CREATE POLICY "Users manage documents on own submissions" ON public.documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = documents.submission_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = documents.submission_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins view all documents" ON public.documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

-- ========================================
-- locked_months policies
-- ========================================
CREATE POLICY "Admins manage locked months" ON public.locked_months
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );

CREATE POLICY "Everyone can read locked months" ON public.locked_months
    FOR SELECT USING (true);

-- ========================================
-- audit_logs policies (read-only; writes come from triggers/service role)
-- ========================================
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid())
    );