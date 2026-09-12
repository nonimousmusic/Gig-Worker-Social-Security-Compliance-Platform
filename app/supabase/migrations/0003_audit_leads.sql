-- 0003: public marketing funnel leads (free-audit tool).
-- Write-only for the app: anon/authenticated may INSERT; only the service
-- role (Supabase dashboard / exports) may read.
CREATE TABLE public.audit_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  contact_email text,
  contact_phone text,
  sector text,
  worker_count int,
  annual_turnover numeric(14, 2),
  annual_payout numeric(14, 2),
  filing_practices text,
  compliance_score int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_insert_public" ON public.audit_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);
