-- -----------------------------------------------------------------------------
-- GigCessHQ - Seed data
-- Demo organization "QuickMove Technologies Private Limited" + business data.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING (ledger has a NOT EXISTS guard).
-- Run via: supabase db seed  (from app/)
-- -----------------------------------------------------------------------------

BEGIN;

-- Fixed demo org id so the demo user seed script can attach to it.
INSERT INTO public.organizations (
  id, name, type, sector, cin_or_registration, gstin, annual_turnover,
  annual_worker_payouts, is_trial_audit, registered_address
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'QuickMove Technologies Private Limited',
  'AGGREGATOR',
  'LOGISTICS_DELIVERY',
  'U72900DL2021PTC389102',
  '07AABCQ1234F1Z5',
  128000000,
  74500000,
  true,
  'Level 4, Cyber City, Tower B, Gurugram, Haryana - 122002'
)
ON CONFLICT (id) DO NOTHING;

-- Workers
INSERT INTO public.workers (
  id, organization_id, worker_internal_code, full_name, uan, masked_aadhaar,
  phone_encrypted, state, registration_status, eligibility_status,
  onboarded_date, is_active
) VALUES
  ('20000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8901', 'Rajesh Kumar',   '101239847102', 'XXXX-XXXX-4921', '+91 98234 11201', 'DELHI',          'REGISTERED_ON_ESHRAM', 'ELIGIBLE',    '2024-04-10', true),
  ('20000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8902', 'Amit Sharma',    '101994821034', 'XXXX-XXXX-8104', '+91 98765 22345', 'HARYANA',        'REGISTERED_ON_ESHRAM', 'ELIGIBLE',    '2024-05-15', true),
  ('20000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8903', 'Pooja Verma',    '101482019482', 'XXXX-XXXX-2389', '+91 97112 33456', 'UTTAR_PRADESH',  'PENDING_SUBMISSION',   'APPROACHING', '2024-06-01', true),
  ('20000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8904', 'Sunil Yadav',    '101389201948', 'XXXX-XXXX-9012', '+91 99201 44567', 'DELHI',          'PENDING_SUBMISSION',   'APPROACHING', '2024-06-20', true),
  ('20000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8905', 'Vikas Chauhan',  '101882019401', 'XXXX-XXXX-3341', '+91 98110 55678', 'KARNATAKA',      'REGISTERED_ON_ESHRAM', 'ELIGIBLE',    '2024-04-01', true),
  ('20000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8906', 'Deepak Mehra',   '101773920194', 'XXXX-XXXX-7720', '+91 98701 66789', 'DELHI',          'PENDING_SUBMISSION',   'INACTIVE',    '2024-08-01', false),
  ('20000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8907', 'Manish Tiwari',  '101662910482', 'XXXX-XXXX-6431', '+91 99102 77890', 'MAHARASHTRA',    'REGISTERED_ON_ESHRAM', 'ELIGIBLE',    '2024-05-10', true),
  ('20000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000001', 'QM-DEL-8908', 'Anita Devi',     '101552910391', 'XXXX-XXXX-1945', '+91 98114 88901', 'DELHI',          'PENDING_SUBMISSION',   'APPROACHING', '2024-05-25', true)
ON CONFLICT (id) DO NOTHING;

-- Annual aggregates (FY 2025-2026) — matches prior in-memory demo state
INSERT INTO public.worker_annual_aggregates (
  id, worker_id, financial_year, internal_days_worked, declared_external_days,
  total_cumulative_days, total_gross_earnings, is_eligible
) VALUES
  ('30000000-0000-0000-0000-000000001001', '20000000-0000-0000-0000-000000001001', '2025-2026', 145, 0,  145, 84500, true),
  ('30000000-0000-0000-0000-000000001002', '20000000-0000-0000-0000-000000001002', '2025-2026', 104, 20, 124, 72300, true),
  ('30000000-0000-0000-0000-000000001003', '20000000-0000-0000-0000-000000001003', '2025-2026', 108, 0,  108, 59000, false),
  ('30000000-0000-0000-0000-000000001004', '20000000-0000-0000-0000-000000001004', '2025-2026', 94,  0,  94,  51200, false),
  ('30000000-0000-0000-0000-000000001005', '20000000-0000-0000-0000-000000001005', '2025-2026', 160, 0,  160, 98000, true),
  ('30000000-0000-0000-0000-000000001006', '20000000-0000-0000-0000-000000001006', '2025-2026', 35,  0,  35,  18200, false),
  ('30000000-0000-0000-0000-000000001007', '20000000-0000-0000-0000-000000001007', '2025-2026', 123, 15, 138, 81400, true),
  ('30000000-0000-0000-0000-000000001008', '20000000-0000-0000-0000-000000001008', '2025-2026', 110, 0,  110, 63000, false)
ON CONFLICT (id) DO NOTHING;

-- Daily engagement ledger: each worker active on a consecutive run of days
-- ending today, so the 90-day rolling window produces demo eligibility counts.
INSERT INTO public.daily_engagement_ledger (
  worker_id, engagement_date, gross_earnings, trip_or_task_id
)
SELECT
  w.id,
  d::date,
  ROUND((500 + (rnum % 40) * 12.0)::numeric, 2),
  w.worker_internal_code || '-' || to_char(d, 'YYYYMMDD')
FROM (
  VALUES
    ('20000000-0000-0000-0000-000000001001', 92),
    ('20000000-0000-0000-0000-000000001002', 75),
    ('20000000-0000-0000-0000-000000001003', 84),
    ('20000000-0000-0000-0000-000000001004', 81),
    ('20000000-0000-0000-0000-000000001005', 95),
    ('20000000-0000-0000-0000-000000001006', 22),
    ('20000000-0000-0000-0000-000000001007', 91),
    ('20000000-0000-0000-0000-000000001008', 86)
) AS wrk(id, active_days)
JOIN LATERAL generate_series(
  CURRENT_DATE - (wrk.active_days - 1)::int,
  CURRENT_DATE,
  '1 day'::interval
) AS d ON true
JOIN public.workers w ON w.id = wrk.id::uuid
CROSS JOIN LATERAL (
  SELECT row_number() OVER () AS rnum
) AS rn
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_engagement_ledger l
  WHERE l.worker_id = w.id
);

-- Filings
INSERT INTO public.filing_records (
  id, organization_id, financial_year, quarter, form_type, due_date, status,
  reported_turnover, reported_worker_payouts, applied_rate_pct,
  assessed_contribution, statutory_ceiling_amount, final_liability_amount,
  eligible_worker_count, total_worker_count, filed_at
) VALUES
  ('10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '2025-2026', 'Q1', 'FORM_XX_QUARTERLY', '2025-07-31', 'PAID',
   32400000, 18200000, 1.50, 486000, 910000, 486000, 1240, 1680, '2025-07-28T14:30:00Z'),
  ('10000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '2025-2026', 'Q2', 'FORM_XX_QUARTERLY', '2025-10-31', 'DRAFT',
   38500000, 21400000, 1.50, 577500, 1070000, 577500, 1410, 1850, NULL),
  ('10000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '2024-2025', NULL, 'FORM_XXI_ANNUAL', '2025-06-30', 'PAID',
   128000000, 74500000, 1.50, 1920000, 3725000, 1920000, 1550, 2100, '2025-06-25T11:15:00Z')
ON CONFLICT (id) DO NOTHING;

-- Challans
INSERT INTO public.filing_challans (
  id, filing_record_id, challan_number, bank_name, utr_number, amount_deposited,
  payment_date, verified, locked_at, sha256_hash, document_url
) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101',
   'CHL-2025-Q1-09823', 'State Bank of India — Treasury Branch', 'SBIN00293819283',
   486000, '2025-07-28', true, '2025-07-28T16:00:00Z',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
   '/sample-challan-q1.pdf')
ON CONFLICT (id) DO NOTHING;

-- Notifications
INSERT INTO public.notification_logs (
  id, organization_id, recipient_email, type, subject, content_summary, sent_at, read
) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'compliance@quickmove.in', 'STATUTORY_DEADLINE',
   'Form-XX Q2 Filing Due in 49 Days',
   'Statutory filing Form-XX for Q2 (July–Sept 2025) must be submitted along with challan payment before October 31, 2025.',
   now() - interval '1 day', false),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'compliance@quickmove.in', 'WORKER_THRESHOLD',
   '28 Workers Approaching 90-Day Threshold',
   '28 gig workers have logged between 80 and 89 days in the current rolling window. Verify their registration and UAN linkage.',
   now() - interval '2 days', false),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'compliance@quickmove.in', 'PAYMENT_CONFIRMATION',
   'Challan Q1 Locked & Audit-Proofed',
   'Challan CHL-2025-Q1-09823 (INR 4,86,000) was successfully verified and locked with immutable SHA-256 ledger record.',
   now() - interval '45 days', true),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'compliance@quickmove.in', 'REGULATORY_UPDATE',
   'MoLE Advisory on Cross-Platform Aggregation',
   'Ministry of Labour & Employment published clarifications regarding self-declarations under Rule 28 for multi-apping gig partners.',
   now() - interval '28 days', true)
ON CONFLICT (id) DO NOTHING;

-- Audit trail
INSERT INTO public.audit_logs (
  id, organization_id, profile_id, actor_email, action, entity_type, entity_id,
  details_json, ip_address, user_agent, created_at
) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL,
   'compliance@quickmove.in', 'CHALLAN_UPLOADED', 'FilingRecord', '10000000-0000-0000-0000-000000000101',
   '{"challanNumber":"CHL-2025-Q1-09823","amount":485000}', '49.36.128.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
   now() - interval '45 days'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL,
   'compliance@quickmove.in', 'CSV_INGESTION_COMPLETED', 'EngagementLedger', 'batch-2025-09',
   '{"totalRows":1420,"validRows":1418,"errors":2}', '49.36.128.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
   now() - interval '7 days'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL,
   'system@gigcesshq.internal', 'ELIGIBILITY_EVALUATION_RUN', 'Worker', 'all-active',
   '{"evaluatedWorkers":1250,"newlyEligible":34}', '127.0.0.1', 'GigCess-Cron/1.0',
   now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;

COMMIT;