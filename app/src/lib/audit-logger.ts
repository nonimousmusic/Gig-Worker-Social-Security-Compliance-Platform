/**
 * Audit logging backed by the Supabase `audit_logs` table.
 * Rows are scoped to the current user's organization via RLS.
 */
import { getSessionData } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export interface AuditLogEntryInput {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export async function logAuditEvent(entry: AuditLogEntryInput): Promise<AuditLogEntry | null> {
  const session = await getSessionData();
  if (!session) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      organization_id: session.organization.id,
      profile_id: session.profile.id,
      actor_email: entry.actorEmail ?? session.email,
      action: entry.action,
      entity_type: entry.entity,
      entity_id: entry.entityId ?? null,
      details_json: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    // Audit trail must be append-only AND reliable: log loudly so holes get noticed.
    console.error("audit-log insert failed:", error?.message || "no row returned", { action: entry.action });
    return null;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    actorEmail: data.actor_email,
    action: data.action,
    entityType: data.entity_type,
    entityId: data.entity_id,
    metadata: data.details_json,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
  };
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.details_json,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}