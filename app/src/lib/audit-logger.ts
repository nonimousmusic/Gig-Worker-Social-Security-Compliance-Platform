export interface AuditLogEntry {
  id?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

const memoryLogs: AuditLogEntry[] = [
  {
    id: "log-1",
    actorId: "usr-admin-1",
    actorEmail: "compliance@quickmove.in",
    actorRole: "ADMIN",
    action: "CHALLAN_UPLOADED",
    entity: "FilingRecord",
    entityId: "filing-q1-2025",
    ipAddress: "49.36.128.45",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    metadata: { challanNumber: "CHL-2025-Q1-09823", amount: 485000 },
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: "log-2",
    actorId: "usr-admin-1",
    actorEmail: "compliance@quickmove.in",
    actorRole: "ADMIN",
    action: "CSV_INGESTION_COMPLETED",
    entity: "EngagementLedger",
    entityId: "batch-2025-09",
    ipAddress: "49.36.128.45",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    metadata: { totalRows: 1420, validRows: 1418, errors: 2 },
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
  {
    id: "log-3",
    actorId: "usr-system",
    actorEmail: "system@gigcesshq.internal",
    actorRole: "SYSTEM",
    action: "ELIGIBILITY_EVALUATION_RUN",
    entity: "Worker",
    entityId: "all-active",
    ipAddress: "127.0.0.1",
    userAgent: "GigCess-Cron/1.0",
    metadata: { evaluatedWorkers: 1250, newlyEligible: 34 },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export async function logAuditEvent(entry: AuditLogEntry): Promise<AuditLogEntry> {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  memoryLogs.unshift(newEntry);
  if (memoryLogs.length > 500) {
    memoryLogs.pop();
  }
  return newEntry;
}

export function getAuditLogs(limit: number = 50): AuditLogEntry[] {
  return memoryLogs.slice(0, limit);
}
