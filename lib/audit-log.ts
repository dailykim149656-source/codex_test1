import { promises as fs } from "fs";
import path from "path";

type AuditLogEntry = {
  timestamp: string;
  requestId: string;
  user: string;
  tenant: string;
  path: string;
  action: string;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
};

const AUDIT_DIR = path.join(process.cwd(), ".data");
const AUDIT_FILE = path.join(AUDIT_DIR, "audit-log.jsonl");

export async function writeAuditLog(entry: AuditLogEntry) {
  try {
    await fs.mkdir(AUDIT_DIR, { recursive: true });
    await fs.appendFile(AUDIT_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.error("Failed to write audit log.", error);
  }
}
