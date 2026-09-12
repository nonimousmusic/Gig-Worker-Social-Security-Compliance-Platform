-- 0002: organizations.registered_address (surfaced in the audit-report dossier).
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS registered_address text;
