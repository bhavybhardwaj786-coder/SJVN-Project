-- 003_drop_documents.sql
-- documents.ts / documentsService confirmed unused anywhere in the app.
-- File uploads embed URLs directly in submissions.data JSONB instead.
DROP TABLE IF EXISTS public.documents;