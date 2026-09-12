-- -----------------------------------------------------------------------------
-- GigCessHQ - Supabase initialization
-- Tables, enums, RLS helper functions, Row-Level Security policies.
-- Run via: supabase db push  (from app/)
-- -----------------------------------------------------------------------------

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. ENUM TYPES
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TYPE public.organization_type AS ENUM ('AGGREGATOR', 'ADVISORY_PARTNER');
CREATE TYPE public.aggregator_sector AS ENUM (
  'RIDE_HAILING',
  'FOOD_DELIVERY',
  'LOGISTICS_DELIVERY',
  'MARKETPLACE_FREELANCE',
  'HEALTHCARE_PERSONAL_SERVICES',
  'OTHER'
);
CREATE TYPE public.user_role AS ENUM ('ORG_ADMIN', 'OPS_MANAGER', 'FINANCE_LEAD', 'EXTERNAL_ADVISOR');
CREATE TYPE public.partner_access_level AS ENUM ('AUDITOR_READ_ONLY', 'COMPLIANCE_MANAGER', 'FULL_ADMIN');
CREATE TYPE public.registration_status AS ENUM ('REGISTERED_ON_ESHRAM', 'PENDING_SUBMISSION', 'GAP_FLAGGED');
CREATE TYPE public.eligibility_status AS ENUM ('ELIGIBLE', 'APPROACHING', 'INACTIVE', 'ELIGIBLE_MULTI_AGGREGATOR');
CREATE TYPE public.form_type AS ENUM ('FORM_XX_QUARTERLY', 'FORM_XXI_ANNUAL', 'FORM_XXII_REFUND');
CREATE TYPE public.filing_status AS ENUM ('DRAFT', 'SUBMITTED', 'PAID', 'OVERDUE');
CREATE TYPE public.notification_type AS ENUM (
  'STATUTORY_DEADLINE',
  'WORKER_THRESHOLD',
  'PAYMENT_CONFIRMATION',
  'REGULATORY_UPDATE'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. RLS HELPER FUNCTIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- Organization of the currently authenticated user.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Profile id (== auth.users.id) of the current user.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Role of the current user.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Whether the current user may access a given organization:
-- own organization, or an active partner grant for that organization.
CREATE OR REPLACE FUNCTION public.can_access_org(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.organization_id = target_org
        OR EXISTS (
          SELECT 1
          FROM public.partner_client_access pca
          WHERE pca.partner_organization_id = p.organization_id
            AND pca.client_organization_id = target_org
            AND pca.revoked_at IS NULL
        )
      )
  );
$$;

-- updated_at maintenance trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. TABLES
-- ═════════════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------------
-- Organizations & multi-tenancy
-- ----------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.organization_type NOT NULL DEFAULT 'AGGREGATOR',
  sector public.aggregator_sector,
  cin_or_registration text,
  gstin text,
  annual_turnover numeric(14, 2),
  annual_worker_payouts numeric(14, 2),
  is_trial_audit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_type ON public.organizations(type);
CREATE INDEX idx_organizations_sector ON public.organizations(sector);

-- Profiles mirror auth.users: id == auth.users.id.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'ORG_ADMIN',
  is_email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);

CREATE TABLE public.partner_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_level public.partner_access_level NOT NULL DEFAULT 'AUDITOR_READ_ONLY',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT uq_partner_client UNIQUE (partner_organization_id, client_organization_id)
);

CREATE INDEX idx_pca_client ON public.partner_client_access(client_organization_id);
CREATE INDEX idx_pca_partner ON public.partner_client_access(partner_organization_id);

-- ----------------------------------------------------------------------------
-- Workers & engagement ledger
-- ----------------------------------------------------------------------------

CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  worker_internal_code text NOT NULL,
  full_name text NOT NULL,
  uan text,
  masked_aadhaar text,
  phone_encrypted text,
  state text,
  registration_status public.registration_status NOT NULL DEFAULT 'PENDING_SUBMISSION',
  eligibility_status public.eligibility_status NOT NULL DEFAULT 'INACTIVE',
  onboarded_date date,
  exit_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_worker_code UNIQUE (organization_id, worker_internal_code)
);

CREATE INDEX idx_workers_org_uan ON public.workers(organization_id, uan);
CREATE INDEX idx_workers_org_eligibility ON public.workers(organization_id, eligibility_status);
CREATE INDEX idx_workers_org_registration ON public.workers(organization_id, registration_status);

CREATE TABLE public.daily_engagement_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  engagement_date date NOT NULL,
  gross_earnings numeric(10, 2) NOT NULL DEFAULT 0,
  trip_or_task_id text,
  source_batch_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_worker_engagement UNIQUE (worker_id, engagement_date, trip_or_task_id)
);

CREATE INDEX idx_ledger_worker_date ON public.daily_engagement_ledger(worker_id, engagement_date);

CREATE TABLE public.worker_annual_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  internal_days_worked int NOT NULL DEFAULT 0,
  declared_external_days int NOT NULL DEFAULT 0,
  total_cumulative_days int NOT NULL DEFAULT 0,
  total_gross_earnings numeric(12, 2) NOT NULL DEFAULT 0,
  is_eligible boolean NOT NULL DEFAULT false,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_worker_fy UNIQUE (worker_id, financial_year)
);

CREATE INDEX idx_aggregates_worker_fy ON public.worker_annual_aggregates(worker_id, financial_year);

CREATE TABLE public.worker_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  external_aggregator text,
  declared_days_count int NOT NULL DEFAULT 0,
  declaration_doc_url text,
  declared_date timestamptz NOT NULL DEFAULT now(),
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_declarations_worker_fy ON public.worker_declarations(worker_id, financial_year);

-- ----------------------------------------------------------------------------
-- Filings, challans & notifications
-- ----------------------------------------------------------------------------

CREATE TABLE public.filing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  quarter text,
  form_type public.form_type NOT NULL,
  due_date date NOT NULL,
  status public.filing_status NOT NULL DEFAULT 'DRAFT',
  reported_turnover numeric(14, 2) NOT NULL DEFAULT 0,
  reported_worker_payouts numeric(14, 2) NOT NULL DEFAULT 0,
  applied_rate_pct numeric(5, 2) NOT NULL DEFAULT 1.50,
  assessed_contribution numeric(14, 2) NOT NULL DEFAULT 0,
  statutory_ceiling_amount numeric(14, 2) NOT NULL DEFAULT 0,
  final_liability_amount numeric(14, 2) NOT NULL DEFAULT 0,
  provisional_adjusted numeric(14, 2) NOT NULL DEFAULT 0,
  balance_payable numeric(14, 2) NOT NULL DEFAULT 0,
  accrued_interest_penalty numeric(14, 2) NOT NULL DEFAULT 0,
  eligible_worker_count int NOT NULL DEFAULT 0,
  total_worker_count int NOT NULL DEFAULT 0,
  generated_form_pdf_url text,
  locked_hash_sha256 text,
  filed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_filings_org_fy ON public.filing_records(organization_id, financial_year);
CREATE INDEX idx_filings_status_due ON public.filing_records(status, due_date);

-- One filing per org / financial year / form / quarter (NULL quarter = annual return).
CREATE UNIQUE INDEX uq_filing_org_fy_form_quarter
  ON public.filing_records (organization_id, financial_year, form_type, COALESCE(quarter, ''));

CREATE TABLE public.filing_challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_record_id uuid NOT NULL REFERENCES public.filing_records(id) ON DELETE CASCADE,
  challan_number text NOT NULL,
  bank_name text,
  utr_number text NOT NULL,
  amount_deposited numeric(14, 2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL,
  verified boolean NOT NULL DEFAULT true,
  locked_at timestamptz NOT NULL DEFAULT now(),
  sha256_hash text,
  document_url text,
  verified_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challans_filing ON public.filing_challans(filing_record_id);
CREATE INDEX idx_challans_number ON public.filing_challans(challan_number);

-- ----------------------------------------------------------------------------
-- Alerts & system logs
-- ----------------------------------------------------------------------------

CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  type public.notification_type NOT NULL,
  subject text NOT NULL,
  content_summary text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT 'SENT',
  read boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_notifications_org_sent ON public.notification_logs(organization_id, sent_at);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org_created ON public.audit_logs(organization_id, created_at);
CREATE INDEX idx_audit_action ON public.audit_logs(action);

-- updated_at triggers
CREATE TRIGGER touch_organizations_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_workers_updated BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_filing_records_updated BEFORE UPDATE ON public.filing_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_engagement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_annual_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────── organizations ───────────────
CREATE POLICY "orgs_select_own_or_partner" ON public.organizations
  FOR SELECT TO authenticated USING (public.can_access_org(id));

-- Registration creates the org before the profile exists, always via the
-- service role (which bypasses RLS). Authenticated clients get no INSERT:
-- minting organizations client-side would let any user spawn tenants.
CREATE POLICY "orgs_update_own" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id())
  WITH CHECK (id = public.current_org_id());

-- ─────────────── profiles ───────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = public.current_org_id()
  );

-- Profiles are created server-side during registration (service role).
-- Authenticated clients get no INSERT: the CHECK could not bind
-- organization_id, so any user could attach themselves to another tenant.
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (organization_id = public.current_org_id() AND public.current_user_role() = 'ORG_ADMIN')
  )
  WITH CHECK (id = auth.uid());

-- ─────────────── partner_client_access ───────────────
CREATE POLICY "pca_select_related" ON public.partner_client_access
  FOR SELECT TO authenticated
  USING (
    partner_organization_id = public.current_org_id()
    OR client_organization_id = public.current_org_id()
  );

CREATE POLICY "pca_insert_own" ON public.partner_client_access
  FOR INSERT TO authenticated
  WITH CHECK (partner_organization_id = public.current_org_id() AND public.current_user_role() = 'ORG_ADMIN');

CREATE POLICY "pca_update_own" ON public.partner_client_access
  FOR UPDATE TO authenticated
  USING (partner_organization_id = public.current_org_id() AND public.current_user_role() = 'ORG_ADMIN')
  WITH CHECK (partner_organization_id = public.current_org_id());

-- ─────────────── workers ───────────────
CREATE POLICY "workers_select_tenant" ON public.workers
  FOR SELECT TO authenticated USING (public.can_access_org(organization_id));

CREATE POLICY "workers_insert_own" ON public.workers
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "workers_update_own" ON public.workers
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- ─────────────── daily_engagement_ledger ───────────────
CREATE POLICY "ledger_select_tenant" ON public.daily_engagement_ledger
  FOR SELECT TO authenticated
  USING (
    public.can_access_org((SELECT organization_id FROM public.workers WHERE id = worker_id))
  );

CREATE POLICY "ledger_insert_own" ON public.daily_engagement_ledger
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.workers WHERE id = worker_id) = public.current_org_id()
  );

-- ─────────────── worker_annual_aggregates ───────────────
CREATE POLICY "aggregates_select_tenant" ON public.worker_annual_aggregates
  FOR SELECT TO authenticated
  USING (
    public.can_access_org((SELECT organization_id FROM public.workers WHERE id = worker_id))
  );

CREATE POLICY "aggregates_insert_own" ON public.worker_annual_aggregates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.workers WHERE id = worker_id) = public.current_org_id()
  );

CREATE POLICY "aggregates_update_own" ON public.worker_annual_aggregates
  FOR UPDATE TO authenticated
  USING (
    (SELECT organization_id FROM public.workers WHERE id = worker_id) = public.current_org_id()
  )
  WITH CHECK (
    (SELECT organization_id FROM public.workers WHERE id = worker_id) = public.current_org_id()
  );

-- ─────────────── worker_declarations ───────────────
CREATE POLICY "declarations_select_tenant" ON public.worker_declarations
  FOR SELECT TO authenticated
  USING (
    public.can_access_org((SELECT organization_id FROM public.workers WHERE id = worker_id))
  );

CREATE POLICY "declarations_insert_own" ON public.worker_declarations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.workers WHERE id = worker_id) = public.current_org_id()
  );

-- ─────────────── filing_records ───────────────
CREATE POLICY "filings_select_tenant" ON public.filing_records
  FOR SELECT TO authenticated USING (public.can_access_org(organization_id));

CREATE POLICY "filings_insert_own" ON public.filing_records
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "filings_update_own" ON public.filing_records
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- ─────────────── filing_challans ───────────────
CREATE POLICY "challans_select_tenant" ON public.filing_challans
  FOR SELECT TO authenticated
  USING (
    public.can_access_org((SELECT organization_id FROM public.filing_records WHERE id = filing_record_id))
  );

CREATE POLICY "challans_insert_own" ON public.filing_challans
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.filing_records WHERE id = filing_record_id) = public.current_org_id()
  );

-- ─────────────── notification_logs ───────────────
CREATE POLICY "notifications_select_tenant" ON public.notification_logs
  FOR SELECT TO authenticated USING (public.can_access_org(organization_id));

CREATE POLICY "notifications_insert_own" ON public.notification_logs
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "notifications_update_own" ON public.notification_logs
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- ─────────────── audit_logs ───────────────
CREATE POLICY "audit_select_tenant" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.can_access_org(organization_id));

-- Audit trail is append-only: app users log their own org's actions; the
-- service role bypasses RLS entirely. UPDATE/DELETE have no policies (denied).
CREATE POLICY "audit_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "audit_insert_service" ON public.audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

COMMIT;